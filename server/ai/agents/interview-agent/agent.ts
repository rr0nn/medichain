import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

import type { ChatRequest } from "@/server/ai/core/types";
import { getDefaultChatModel } from "@/server/ai/core/models";
import { runSafetyWorkflow } from "@/server/ai/workflows/safety-workflow/workflow";

const SYSTEM_PROMPT = `You are MediChain, a clinical differential diagnosis support assistant.

When the user describes a patient presentation, or answers earlier follow-up questions, call the runDifferentialDiagnosis tool.

The tool can return one of two outcomes:

1. status = "needs_more_information"
- Briefly explain that more information is needed to narrow the differential.
- Ask 1 to 3 focused follow-up questions in bullet points yourself.
- Use the full conversation context, critic assessment, current differentials, matched features, and candidate graph features from the tool result.
- Prefer targeted history or symptom clarification questions over generic questioning.
- Do not repeat details the user already provided.
- Do not present the result as a confident final diagnosis.

2. status = "ready_for_review"
- Explain the top differentials clearly and concisely.
- Briefly state why they fit.
- Mention key distinguishing considerations.
- Mention that the result is grounded in the medical knowledge graph.

Rules:
- Use the full conversation context when deciding what patient summary to send to the tool.
- If the user is answering prior follow-up questions, include that new information in the summary you send.
- For general non-clinical conversation, respond normally without calling the tool.
- Be concise and clinically precise.
- Do not fabricate investigations, examination findings, or diagnoses beyond the tool output.`;

export async function runInterviewAgent(
  { messages }: ChatRequest,
  writer: UIMessageStreamWriter
) {
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getDefaultChatModel(),
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
              "A concise but complete summary of the patient's presentation using all relevant conversation context so far"
            ),
        }),
        execute: async ({ patientDescription }) => {
          return runSafetyWorkflow(
            patientDescription,
            (event) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              writer.write({ type: "data-step", data: event } as any)
          );
        },
      }),
    },
    stopWhen: stepCountIs(4),
  });

  writer.merge(result.toUIMessageStream());
}
