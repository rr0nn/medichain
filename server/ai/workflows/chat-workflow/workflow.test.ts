// This ensures this workflow acts as a thin wrapper, and allows the
// behaviour to be locked in if the implementation changes later.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    mockRunChatAgent: vi.fn(),
}));

vi.mock("@/server/ai/agents/chat-agent/agent", () => ({
    runChatAgent: mocks.mockRunChatAgent,
}));

import { runChatWorkflow } from "./workflow";

describe("runChatWorkflow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("delegates directly to runChatAgent", async () => {
        const input = {
            messages: [{ id: "1", role: "user", content: "hello" }],
        };

        const fakeResult = { stream: true };
        mocks.mockRunChatAgent.mockResolvedValue(fakeResult);

        const writer = {
            write: vi.fn(),
            merge: vi.fn(),
        } as never;

        const result = await runChatWorkflow(input as never, writer);

        expect(mocks.mockRunChatAgent).toHaveBeenCalledWith(input, writer, undefined);
        expect(result).toBe(fakeResult);
    });
});