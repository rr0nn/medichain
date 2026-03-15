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

        const result = await runChatWorkflow(input as never);

        expect(mocks.mockRunChatAgent).toHaveBeenCalledWith(input);
        expect(result).toBe(fakeResult);
    });
});