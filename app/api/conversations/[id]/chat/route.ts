/**
 * @fileoverview Handles chat requests for an existing conversation and streams interview-agent responses.
 * @contributors Johnson Zhang, Jason Yang, Aryan Wadhawan
 */

import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";

import type { ChatRequest } from "@/server/ai/core/types";
import {
  saveMessage,
  updateConversationTitle,
  getMessages,
} from "@/server/db/conversations";
import { runInterviewerWorkflow } from "@/server/ai/workflows/interview-workflow/workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = (await req.json()) as ChatRequest;
  const { id: conversationId } = await params;

  await persistUserMessage(conversationId, body);

  const stream = createUIMessageStream({
    originalMessages: body.messages,
    execute: async ({ writer }) => {
      await runInterviewerWorkflow(body, writer);
    },
    onFinish: async ({ responseMessage }) => {
      if (responseMessage.role !== "assistant") {
        return;
      }

      try {
        await persistAssistantMessage(conversationId, responseMessage);
      } catch (err) {
        console.error("[conversation-chat] Failed to persist assistant message:", err);
      }
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

    if (existingMessages.length === 0) {
      const textPart = lastMessage.parts.find((p) => p.type === "text");
      if (textPart && "text" in textPart) {
        const title = (textPart.text as string).slice(0, 60).trim();
        if (title) await updateConversationTitle(conversationId, title);
      }
    }
  } catch (err) {
    console.error("[conversation-chat] Failed to persist user message:", err);
  }
}

async function persistAssistantMessage(
  conversationId: string,
  responseMessage: UIMessage,
) {
  await saveMessage(conversationId, "assistant", responseMessage.parts);
}
