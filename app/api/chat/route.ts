import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

import type { ChatRequest } from "@/server/ai/core/types";
import { runChatWorkflow } from "@/server/ai/workflows/chat-workflow/workflow";
import {
  saveMessage,
  updateConversationTitle,
  getMessages,
} from "@/server/db/conversations";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const conversationId = body.id;

  // Persist the new user message immediately (before streaming starts)
  if (conversationId) {
    await persistUserMessage(conversationId, body);
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const onAssistantFinish = conversationId
        ? async (text: string) => {
            await saveMessage(conversationId, "assistant", [
              { type: "text", text },
            ]);
          }
        : undefined;

      await runChatWorkflow(body, writer, onAssistantFinish);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

async function persistUserMessage(conversationId: string, body: ChatRequest) {
  try {
    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") return;

    const existingMessages = await getMessages(conversationId);
    const alreadySaved = existingMessages.some((m) => {
      const lastPart = lastMessage.parts[0];
      const existingPart = m.parts[0];
      return (
        m.role === "user" &&
        lastPart?.type === "text" &&
        existingPart?.type === "text" &&
        "text" in lastPart &&
        "text" in existingPart &&
        (lastPart as { type: string; text: string }).text ===
          (existingPart as { type: string; text: string }).text
      );
    });

    if (alreadySaved) return;

    await saveMessage(conversationId, "user", lastMessage.parts);

    // Auto-title the conversation from first user message
    if (existingMessages.length === 0) {
      const textPart = lastMessage.parts.find((p) => p.type === "text");
      if (textPart && "text" in textPart) {
        const title = (textPart.text as string).slice(0, 60).trim();
        if (title) await updateConversationTitle(conversationId, title);
      }
    }
  } catch (err) {
    console.error("[chat] Failed to persist user message:", err);
  }
}
