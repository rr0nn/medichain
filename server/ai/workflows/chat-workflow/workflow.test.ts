// This ensures this workflow acts as a thin wrapper, and allows the
// behaviour to be locked in if the implementation changes later.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    mockRunInterviewAgent: vi.fn(),
}));

vi.mock("@/server/ai/agents/interview-agent/agent", () => ({
    runInterviewAgent: mocks.mockRunInterviewAgent,
}));

import { runChatWorkflow } from "./workflow";

describe("runChatWorkflow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("delegates directly to runInterviewAgent", async () => {
        const input = {
            messages: [{ id: "1", role: "user", content: "hello" }],
        };

        const fakeResult = { stream: true };
        mocks.mockRunInterviewAgent.mockResolvedValue(fakeResult);

        const writer = {
            write: vi.fn(),
            merge: vi.fn(),
        } as never;

        const result = await runChatWorkflow(input as never, writer);

        expect(mocks.mockRunInterviewAgent).toHaveBeenCalledWith(input, writer);
        expect(result).toBe(fakeResult);
    });
});
