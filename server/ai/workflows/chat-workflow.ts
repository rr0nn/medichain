import type { ChatRequest } from "@/server/ai/core/types";
import { runChatAgent } from "@/server/ai/agents/chat-agent";

export async function runChatWorkflow(input: ChatRequest) {
  return runChatAgent(input);
}
