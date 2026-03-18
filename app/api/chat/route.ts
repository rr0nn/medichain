import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

import type { ChatRequest } from "@/server/ai/core/types";
import { runChatWorkflow } from "@/server/ai/workflows/chat-workflow/workflow";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      await runChatWorkflow(body, writer);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
