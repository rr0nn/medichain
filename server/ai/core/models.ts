import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export type ModelProvider = "gemini" | "claude";

const MODELS = {
  gemini: {
    chat: () => google("gemini-2.5-flash"),
    diagnosis: () => google("gemini-2.5-flash"),
  },
  claude: {
    chat: () => anthropic("claude-sonnet-4-20250514"),
    diagnosis: () => anthropic("claude-sonnet-4-20250514"),
  },
} as const;

export function getChatModel(provider: ModelProvider = "gemini") {
  return MODELS[provider].chat();
}

export function getDiagnosisModel(provider: ModelProvider = "gemini") {
  return MODELS[provider].diagnosis();
}

/** @deprecated Use getChatModel() instead */
export function getDefaultChatModel() {
  return getChatModel("gemini");
}

/** @deprecated Use getDiagnosisModel() instead */
export function getDefaultDiagnosisModel() {
  return getDiagnosisModel("gemini");
}
