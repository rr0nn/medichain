/**
 * @fileoverview Centralizes the server-side AI model helpers used by agents and workflows.
 * @contributors Johnson Zhang, Aryan Wadhawan
 */

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export type ModelProvider = "gemini" | "claude" | "openai";

export const DEFAULT_PROVIDER: ModelProvider = "gemini";

export function resolveProvider(requested?: ModelProvider): ModelProvider {
  if (requested === "claude" && !process.env.ANTHROPIC_API_KEY) {
    return DEFAULT_PROVIDER;
  }

  if (requested === "openai" && !process.env.OPENAI_API_KEY) {
    return DEFAULT_PROVIDER;
  }

  return requested ?? DEFAULT_PROVIDER;
}

export function getChatModel(provider: ModelProvider = DEFAULT_PROVIDER) {
  if (provider === "claude") return anthropic("claude-sonnet-4-5");
  if (provider === "openai") return openai("gpt-5-mini");
  return google("gemini-2.5-flash");
}

export function getDiagnosisModel() {
  return google("gemini-2.5-flash");
}

export function getDefaultChatModel() {
  return getChatModel(DEFAULT_PROVIDER);
}

export function getDefaultDiagnosisModel() {
  return getDiagnosisModel();
}
