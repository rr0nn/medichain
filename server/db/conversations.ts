/**
 * @fileoverview Stores and retrieves conversations and messages through Prisma.
 * @contributors Aryan Wadhawan
 */

import type { UIMessage } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

/**
 * Lists saved conversations in reverse chronological update order.
 */
export async function listConversations() {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

/**
 * Creates a new conversation record with an optional title override.
 */
export async function createConversation(title?: string) {
  return prisma.conversation.create({
    data: { title: title ?? "New Consultation" },
    include: { _count: { select: { messages: true } } },
  });
}

/**
 * Returns a single conversation by id when it exists.
 */
export async function getConversation(id: string) {
  return prisma.conversation.findUnique({ where: { id } });
}

/**
 * Updates the stored title for an existing conversation.
 */
export async function updateConversationTitle(id: string, title: string) {
  return prisma.conversation.update({ where: { id }, data: { title } });
}

/**
 * Deletes a conversation and its dependent records through Prisma relations.
 */
export async function deleteConversation(id: string) {
  return prisma.conversation.delete({ where: { id } });
}

/**
 * Loads persisted messages for a conversation in ascending creation order.
 *
 * Returns messages in the `UIMessage` shape expected by the chat layer.
 */
export async function getMessages(conversationId: string): Promise<UIMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: m.parts as UIMessage["parts"],
    content: "",
  }));
}

/**
 * Persists a single message for a conversation.
 */
export async function saveMessage(
  conversationId: string,
  role: string,
  parts: unknown
) {
  return prisma.message.create({
    data: { conversationId, role, parts: parts as Prisma.InputJsonValue },
  });
}

/**
 * Persists multiple messages for a conversation in one batch operation.
 */
export async function saveMessages(
  conversationId: string,
  messages: { role: string; parts: unknown }[]
) {
  return prisma.message.createMany({
    data: messages.map((m) => ({
      conversationId,
      role: m.role,
      parts: m.parts as Prisma.InputJsonValue,
    })),
  });
}
