import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { ChatRequest } from "@/server/ai/core/types";
import { runDifferentialDiagnosisWorkflow } from "@/server/ai/workflows/ddx-workflow/workflow";
// import { runChatWorkflow } from "@/server/ai/workflows/chat-workflow/workflow";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;

  // const result = await runChatWorkflow(body);

  // return result.toUIMessageStreamResponse();

  // Extract the patient description by concatenating all text parts from the messages.
  const patientDescription = body.messages
    .flatMap((message) => message.parts ?? [])
    .filter(
      (
        part
      ): part is Extract<(typeof body.messages)[number]["parts"][number], { type: "text"; text: string }> =>
        part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("\n")
    .trim();

  // Run the differential diagnosis workflow with the extracted patient description.
  const result = await runDifferentialDiagnosisWorkflow(patientDescription);


  // Stream the result back to the client as a UI message stream.
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: "ddx-demo-result" });
      writer.write({
        type: "text-delta",
        id: "ddx-demo-result",
        delta: JSON.stringify(result, null, 2),
      });
      writer.write({ type: "text-end", id: "ddx-demo-result" });
      writer.write({ type: "finish-step" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
