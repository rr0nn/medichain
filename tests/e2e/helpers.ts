/**
 * @fileoverview Provides shared Playwright helpers and mock payload builders for E2E tests.
 * @contributors John Kollannur
 */

import type { Page } from "@playwright/test";

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<
    | { type: "text"; text: string }
    | { type: string; [key: string]: unknown }
  >;
};

export function buildModelCatalog() {
  return {
    selectors: [
      {
        key: "chat",
        label: "Chat Model",
        title: "Select chat model",
        defaultModelId: "gemini-2.5-flash",
        models: [
          {
            id: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash",
            provider: "google",
            group: "Google",
            available: true,
          },
          {
            id: "claude-sonnet-4-5",
            label: "Claude Sonnet 4.5",
            provider: "anthropic",
            group: "Anthropic",
            available: false,
          },
          {
            id: "gpt-5-mini",
            label: "GPT-5 mini",
            provider: "openai",
            group: "OpenAI",
            available: true,
          },
        ],
      },
      {
        key: "diagnosis",
        label: "Diagnosis Model",
        title: "Select diagnosis model",
        defaultModelId: "gemini-2.5-flash",
        models: [
          {
            id: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash",
            provider: "google",
            group: "Google",
            available: true,
          },
          {
            id: "claude-sonnet-4-5",
            label: "Claude Sonnet 4.5",
            provider: "anthropic",
            group: "Anthropic",
            available: false,
          },
          {
            id: "gpt-5-mini",
            label: "GPT-5 mini",
            provider: "openai",
            group: "OpenAI",
            available: true,
          },
        ],
      },
    ],
  };
}

export async function mockModels(page: Page) {
  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildModelCatalog()),
    });
  });
}

export async function mockConversationList(
  page: Page,
  conversations: ConversationSummary[],
) {
  await page.route("**/api/conversations", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(conversations),
    });
  });
}

export async function mockConversationMessages(
  page: Page,
  conversationId: string,
  messages: UiMessage[],
) {
  await page.route(`**/api/conversations/${conversationId}/messages`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(messages),
    });
  });
}

export function conversation(
  id: string,
  title: string,
  messageCount = 0,
): ConversationSummary {
  const now = new Date().toISOString();

  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    _count: { messages: messageCount },
  };
}

export function textMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
): UiMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}
