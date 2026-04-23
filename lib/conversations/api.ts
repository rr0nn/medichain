/**
 * @fileoverview Provides client-side helpers for conversation list, creation, deletion, and message fetch operations.
 * @contributors Johnson Zhang
 */

import type { UIMessage } from "ai";

import { ConversationNotFoundError } from "@/lib/conversations/errors";
import type { ConversationSummary } from "@/lib/conversations/types";

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

  if (response.status === 404) {
    throw new ConversationNotFoundError();
  }

  return readJson<UIMessage[]>(response, "Failed to load conversation history");
}
