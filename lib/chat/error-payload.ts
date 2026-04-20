/**
 * @fileoverview Shared payload helpers for classified chat-stream errors.
 * @contributors Johnson Zhang
 */

export const CHAT_ERROR_PREFIX = "MEDICHAIN_CHAT_ERROR:";

export type ChatErrorCode =
  | "CHAT_UNAVAILABLE"
  | "LLM_RATE_LIMITED"
  | "LLM_UNAVAILABLE";

export type ChatErrorPayload = {
  code: ChatErrorCode;
  message: string;
};

const CHAT_ERROR_MESSAGES: Record<ChatErrorCode, string> = {
  CHAT_UNAVAILABLE: "The diagnostic service is currently unavailable",
  LLM_RATE_LIMITED: "AI usage limit reached. Please try again later",
  LLM_UNAVAILABLE: "The AI service is currently unavailable",
};

export function createChatErrorPayload(
  code: ChatErrorCode,
): ChatErrorPayload {
  return {
    code,
    message: CHAT_ERROR_MESSAGES[code],
  };
}

export function serializeChatErrorPayload(payload: ChatErrorPayload): string {
  return `${CHAT_ERROR_PREFIX}${JSON.stringify(payload)}`;
}

export function parseChatErrorMessage(
  message: string,
): ChatErrorPayload | null {
  if (!message.startsWith(CHAT_ERROR_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      message.slice(CHAT_ERROR_PREFIX.length),
    ) as Partial<ChatErrorPayload>;

    if (
      typeof parsed.code !== "string" ||
      !(parsed.code in CHAT_ERROR_MESSAGES)
    ) {
      return null;
    }

    return createChatErrorPayload(parsed.code as ChatErrorCode);
  } catch {
    return null;
  }
}

export function getChatErrorToastMessage(
  error: Error | string | ChatErrorPayload,
): string {
  if (typeof error === "string") {
    return (
      parseChatErrorMessage(error)?.message ??
      CHAT_ERROR_MESSAGES.CHAT_UNAVAILABLE
    );
  }

  if ("code" in error && typeof error.code === "string") {
    return createChatErrorPayload(error.code as ChatErrorCode).message;
  }

  return (
    parseChatErrorMessage(error.message)?.message ??
    CHAT_ERROR_MESSAGES.CHAT_UNAVAILABLE
  );
}
