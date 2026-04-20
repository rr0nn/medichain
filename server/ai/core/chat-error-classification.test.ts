import { APICallError } from "ai";
import { describe, expect, it } from "vitest";

import { parseChatErrorMessage } from "@/lib/chat/error-payload";

import { serializeChatStreamError } from "./chat-error-classification";

describe("serializeChatStreamError", () => {
  it("classifies AI quota and rate limit failures into a stable payload", () => {
    const serialized = serializeChatStreamError(
      new APICallError({
        message: "Rate limit exceeded",
        url: "https://example.com",
        requestBodyValues: {},
        statusCode: 429,
      }),
    );

    expect(parseChatErrorMessage(serialized)).toEqual({
      code: "LLM_RATE_LIMITED",
      message: "AI usage limit reached. Please try again later",
    });
  });

  it("classifies AI provider availability failures into a stable payload", () => {
    const serialized = serializeChatStreamError(
      new APICallError({
        message: "Provider unavailable",
        url: "https://example.com",
        requestBodyValues: {},
        statusCode: 503,
      }),
    );

    expect(parseChatErrorMessage(serialized)).toEqual({
      code: "LLM_UNAVAILABLE",
      message: "The AI service is currently unavailable",
    });
  });

  it("falls back to a generic chat payload for unknown failures", () => {
    const serialized = serializeChatStreamError(new Error("Unexpected failure"));

    expect(parseChatErrorMessage(serialized)).toEqual({
      code: "CHAT_UNAVAILABLE",
      message: "The diagnostic service is currently unavailable",
    });
  });
});
