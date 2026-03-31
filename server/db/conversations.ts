import type { UIMessage } from "ai";
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

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

export async function createConversation(title?: string) {
  return prisma.conversation.create({
    data: { title: title ?? "New Consultation" },
    include: { _count: { select: { messages: true } } },
  });
}

export async function getConversation(id: string) {
  return prisma.conversation.findUnique({ where: { id } });
}

export async function updateConversationTitle(id: string, title: string) {
  return prisma.conversation.update({ where: { id }, data: { title } });
}

export async function deleteConversation(id: string) {
  return prisma.conversation.delete({ where: { id } });
}

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

export async function saveMessage(
  conversationId: string,
  role: string,
  parts: unknown
) {
  return prisma.message.create({
    data: { conversationId, role, parts: parts as Prisma.InputJsonValue },
  });
}

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
