import { convertToModelMessages, streamText } from "ai";

import type { ChatRequest } from "@/server/ai/core/types";
import { getDefaultChatModel } from "@/server/ai/core/models";

// Default chat agent: streams responses directly from the underlying model.
// This implementation is a placeholder to maintain frontend functionality.
// In the future, this agent will be replaced by a consultation workflow with custom behavior and specialized agents.
export async function runChatAgent({ messages }: ChatRequest) {
  return streamText({
    model: getDefaultChatModel(),
    messages: await convertToModelMessages(messages),
  });
}
