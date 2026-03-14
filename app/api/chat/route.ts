import type { ChatRequest } from "@/server/ai/core/types";
import { runChatWorkflow } from "@/server/ai/workflows/chat-workflow";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const result = await runChatWorkflow(body);

  return result.toUIMessageStreamResponse();
}
