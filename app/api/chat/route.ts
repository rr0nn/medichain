import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

import type { ChatRequest } from "@/server/ai/core/types";
import { runInterviewerWorkflow } from "@/server/ai/workflows/interview-workflow/workflow";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      await runInterviewerWorkflow(body, writer);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
