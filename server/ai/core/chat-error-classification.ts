/**
 * @fileoverview Classifies chat-stream failures into stable client-facing error payloads.
 * @contributors Johnson Zhang
 */

import { APICallError } from "ai";

import {
  createChatErrorPayload,
  serializeChatErrorPayload,
  type ChatErrorCode,
} from "@/lib/chat/error-payload";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

function isLlmRateLimitedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return true;
  }

  return (
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("resource exhausted") ||
    message.includes("too many requests")
  );
}

function isLlmUnavailableError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();

  return (
    getErrorCode(error)?.startsWith("AI_") === true ||
    message.includes("anthropic") ||
    message.includes("claude") ||
    message.includes("gemini") ||
    message.includes("openai") ||
    message.includes("gpt-5") ||
    message.includes("google generative ai") ||
    message.includes("google ai") ||
    message.includes("api key")
  );
}

function classifyChatError(error: unknown): ChatErrorCode {
  const modelSelectionErrorCode = getErrorCode(error);

  if (
    modelSelectionErrorCode === "CHAT_MODEL_UNAVAILABLE" ||
    modelSelectionErrorCode === "DIAGNOSIS_MODEL_UNAVAILABLE"
  ) {
    return modelSelectionErrorCode;
  }

  if (isLlmRateLimitedError(error)) {
    return "LLM_RATE_LIMITED";
  }

  if (isLlmUnavailableError(error)) {
    return "LLM_UNAVAILABLE";
  }

  return "CHAT_UNAVAILABLE";
}

export function serializeChatStreamError(error: unknown): string {
  return serializeChatErrorPayload(
    createChatErrorPayload(classifyChatError(error)),
  );
}
