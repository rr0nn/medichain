/**
 * @fileoverview Client-side helpers for conversation list and message fetch operations.
 * @contributors Johnson Zhang
 */

import type { UIMessage } from "ai";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

type CreateConversationInput = {
  title?: string;
};

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const response = await fetch("/api/conversations");
  return readJson<ConversationSummary[]>(
    response,
    "Failed to load conversations",
  );
}

export async function createConversation(
  input?: CreateConversationInput,
): Promise<{ id: string }> {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input?.title ? { title: input.title } : {}),
  });

  return readJson<{ id: string }>(response, "Failed to create conversation");
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete conversation");
  }
}

export async function getConversationMessages(id: string): Promise<UIMessage[]> {
  const response = await fetch(`/api/conversations/${id}/messages`);

  if (!response.ok) {
    return [];
  }

  return response.json() as Promise<UIMessage[]>;
}
