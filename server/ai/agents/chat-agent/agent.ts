import { convertToModelMessages, streamText } from "ai";

import type { ChatRequest } from "@/server/ai/core/types";
import { getDefaultChatModel } from "@/server/ai/core/models";

export async function runChatAgent({ messages }: ChatRequest) {
  return streamText({
    model: getDefaultChatModel(),
    messages: await convertToModelMessages(messages),
  });
}
