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
import { runDifferentialDiagnosisWorkflow } from "@/server/ai/workflows/ddx-workflow/workflow";

const SYSTEM_PROMPT = `You are MediChain, a clinical decision support assistant.

When the user describes a patient presentation or clinical scenario, call the runDifferentialDiagnosis tool to retrieve ranked differential diagnoses from the medical knowledge graph.

After the tool returns results, explain the top differentials clearly and concisely — what they are, why they fit the presentation, and what key investigations to consider next.

If the knowledge graph returns no results, let the user know the presentation may not be covered yet and suggest rephrasing around abdominal symptoms.

For general questions not related to a clinical presentation, respond conversationally without calling the tool.

Be concise and clinically precise.`;

export async function runChatAgent(
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
          "Retrieve ranked differential diagnoses for a patient presentation from the medical knowledge graph.",
        inputSchema: z.object({
          patientDescription: z
            .string()
            .describe("Free-text summary of the patient presentation"),
        }),
        execute: async ({ patientDescription }) => {
          return runDifferentialDiagnosisWorkflow(
            patientDescription,
            (event) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              writer.write({ type: "data-step", data: event } as any)
          );
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  writer.merge(result.toUIMessageStream());
}
