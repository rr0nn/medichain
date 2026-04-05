// This ensures the interview workflow stays a thin wrapper around the
// interview agent, even if the implementation changes later.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    mockRunInterviewAgent: vi.fn(),
}));

vi.mock("@/server/ai/agents/interview-agent/agent", () => ({
    runInterviewAgent: mocks.mockRunInterviewAgent,
}));

import { runInterviewerWorkflow } from "./workflow";

describe("runInterviewerWorkflow", () => {
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

        const result = await runInterviewerWorkflow(input as never, writer);

        expect(mocks.mockRunInterviewAgent).toHaveBeenCalledWith(input, writer, undefined);
        expect(result).toBe(fakeResult);
    });
});
