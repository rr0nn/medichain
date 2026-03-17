import type { UIMessageStreamWriter } from "ai";
import type { ChatRequest } from "@/server/ai/core/types";
import { runChatAgent } from "@/server/ai/agents/chat-agent/agent";

export async function runChatWorkflow(
  input: ChatRequest,
  writer: UIMessageStreamWriter
) {
  return runChatAgent(input, writer);
}
