/**
 * @fileoverview Runs the interview agent that decides when to call tools and how to reply to the user.
 * @contributors Johnson Zhang, John Kollannur
 */

import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

import type { ChatRequest } from "@/server/ai/core/types";
import { serializeChatStreamError } from "@/server/ai/core/chat-error-classification";
import { resolveModelSelection } from "@/server/ai/core/models";
import { runSafetyWorkflow } from "@/server/ai/workflows/safety-workflow/workflow";
import { composePatientResponse } from "./patient-response";

function buildWorkflowPatientDescription(input: {
  patientDescription: string;
  consultationStage: "initial_assessment" | "follow_up_clarification";
  newInformationFocus?: string;
}) {
  const contextLines = [
    `Consultation stage: ${input.consultationStage}.`,
  ];

  if (input.newInformationFocus?.trim()) {
    contextLines.push(
      `New information focus: ${input.newInformationFocus.trim()}.`,
    );
  }

  contextLines.push(`Patient summary: ${input.patientDescription.trim()}`);

  return contextLines.join("\n");
}

const SYSTEM_PROMPT = `You are MediChain, a clinical differential diagnosis support assistant.

Use the runDifferentialDiagnosis tool when the user:
- describes a patient presentation
- adds new symptom or history detail
- answers earlier follow-up questions

Use the full conversation context when deciding what patient summary to send to the tool.
If the user is clarifying a prior answer, include that new information in the summary you send.
When calling the tool, always set:
- consultationStage = "initial_assessment" for the first full presentation
- consultationStage = "follow_up_clarification" when the user is answering or refining earlier questions
- newInformationFocus to a short phrase describing the newly clarified detail when relevant

The tool returns structured graph-grounded differential output. Your reply must follow one of these modes:

1. status = "needs_more_information" and matchedClinicalPresentations.length === 0
- Explicitly say the current knowledge graph does not contain a relevant presentation, or does not contain enough matching information for what was described.
- Say that the user should see a doctor or other qualified clinician for proper assessment, especially if symptoms are significant or worsening.
- Invite the user to describe other presentations that may map better to the graph, such as onset, site, character, associated symptoms, precipitating factors, relieving factors, past history, trauma, or age context.
- You may ask 1 or 2 broad clarification questions, but do not pretend the graph supports any differential.
- Do not present any diagnosis as supported by the knowledge graph in this case.

2. status = "needs_more_information" and matchedClinicalPresentations.length > 0
- Briefly explain that more information is needed to narrow the differential.
- Ask 1 to 3 focused follow-up questions in bullet points.
- Base those questions on the full conversation context, critic assessment, current differentials, matched features, and candidate graph features.
- Prefer targeted history or symptom clarification questions over generic questioning.
- Do not repeat details the user already provided.
- Do not ask for investigations, imaging, treatment, or examination findings.
- Do not present the result as a confident final diagnosis.

3. status = "ready_for_review"
- If the tool returns composedResponse, use that patient-facing response as the main answer.
- Do not ask follow-up questions in this mode.
- Keep the explanation aligned with the grounded differential result.

General rules:
- For general non-clinical conversation, respond normally without calling the tool.
- Be concise and clinically precise.
- Do not fabricate investigations, examination findings, diagnoses, or graph evidence beyond the tool output.
- Do not imply that an evidence support score is a probability.
- If the tool output is weak or sparse, say so plainly instead of overstating confidence.`;

export async function runInterviewAgent(
  { messages, chatModelId, diagnosisModelId }: ChatRequest,
  writer: UIMessageStreamWriter
) {
  const modelMessages = await convertToModelMessages(messages, {
    // If a stream was manually stopped, the last assistant message can contain
    // an incomplete tool call. Ignore those transient parts so the next user
    // message can continue the consultation cleanly.
    ignoreIncompleteToolCalls: true,
  });
  const chatSelection = resolveModelSelection("chat", chatModelId);
  const diagnosisSelection = resolveModelSelection(
    "diagnosis",
    diagnosisModelId,
  );

  const result = streamText({
    model: chatSelection.model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      runDifferentialDiagnosis: tool({
        description:
          "Run the safety-reviewed differential diagnosis workflow for a patient presentation, including confidence review when the differential remains weak.",
        inputSchema: z.object({
          patientDescription: z
            .string()
            .describe(
              "A concise but complete summary of the patient's presentation using all relevant conversation context so far",
            ),
          consultationStage: z
            .enum(["initial_assessment", "follow_up_clarification"])
            .describe(
              "Whether this tool call is the first full assessment or a follow-up clarification of earlier history",
            ),
          newInformationFocus: z
            .string()
            .optional()
            .describe(
              "A short phrase describing the newly clarified detail, such as onset, site, associated symptoms, or past history",
            ),
        }),
        execute: async ({
          patientDescription,
          consultationStage,
          newInformationFocus,
        }) => {
          const workflowPatientDescription = buildWorkflowPatientDescription({
            patientDescription,
            consultationStage,
            newInformationFocus,
          });

          const safetyResult = await runSafetyWorkflow(
            workflowPatientDescription,
            (event) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              writer.write({ type: "data-step", data: event } as any),
            diagnosisSelection.modelId,
          );

          if (safetyResult.status === "ready_for_review") {
            const composedResponse = await composePatientResponse(
              patientDescription,
              safetyResult,
              chatSelection.modelId,
            );

            return {
              ...safetyResult,
              composedResponse,
            };
          }

          return safetyResult;
        },
      }),
    },
    stopWhen: stepCountIs(4),
  });

  writer.merge(
    result.toUIMessageStream<UIMessage>({
      onError: serializeChatStreamError,
    }),
  );
}
