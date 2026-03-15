// This matches the file exactly: runChatAgent just converts incoming messages,
// gets the default chat model, and passes both into streamText.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    mockConvertToModelMessages: vi.fn(),
    mockStreamText: vi.fn(),
    mockGetDefaultChatModel: vi.fn(),
}));

vi.mock("ai", () => ({
    convertToModelMessages: mocks.mockConvertToModelMessages,
    streamText: mocks.mockStreamText,
}));

vi.mock("@/server/ai/core/models", () => ({
    getDefaultChatModel: mocks.mockGetDefaultChatModel,
}));

import { runChatAgent } from "./agent";

describe("runChatAgent", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("converts messages and streams text with the default chat model", async () => {
        const input = {
            messages: [
                { id: "1", role: "user", content: "Hello" },
                { id: "2", role: "assistant", content: "Hi" },
            ],
        };

        const convertedMessages = [
            { role: "user", content: [{ type: "text", text: "Hello" }] },
            { role: "assistant", content: [{ type: "text", text: "Hi" }] },
        ];

        const fakeModel = { id: "fake-chat-model" };
        const fakeStreamResult = { toUIMessageStreamResponse: vi.fn() };

        mocks.mockConvertToModelMessages.mockResolvedValue(convertedMessages);
        mocks.mockGetDefaultChatModel.mockReturnValue(fakeModel);
        mocks.mockStreamText.mockReturnValue(fakeStreamResult);

        const result = await runChatAgent(input as never);

        expect(mocks.mockConvertToModelMessages).toHaveBeenCalledWith(input.messages);
        expect(mocks.mockGetDefaultChatModel).toHaveBeenCalledTimes(1);
        expect(mocks.mockStreamText).toHaveBeenCalledWith({
            model: fakeModel,
            messages: convertedMessages,
        });
        expect(result).toBe(fakeStreamResult);
    });
});