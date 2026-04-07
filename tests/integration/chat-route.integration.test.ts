import { describe,  expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockCreateUIMessageStream: vi.fn(),
  mockCreateUIMessageStreamResponse: vi.fn(),
  mockRunInterviewAgent: vi.fn(),
  mockGetMessages: vi.fn(),
  mockSaveMessage: vi.fn(),
  mockUpdateConversationTitle: vi.fn(),
}));

vi.mock("ai", () => ({
  createUIMessageStream: mocks.mockCreateUIMessageStream,
  createUIMessageStreamResponse: mocks.mockCreateUIMessageStreamResponse,
}));

// Keep the route and workflow real; only replace the external agent boundary.
vi.mock("@/server/ai/agents/interview-agent/agent", () => ({
  runInterviewAgent: mocks.mockRunInterviewAgent,
}));

vi.mock("@/server/db/conversations", () => ({
  getMessages: mocks.mockGetMessages,
  saveMessage: mocks.mockSaveMessage,
  updateConversationTitle: mocks.mockUpdateConversationTitle,
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat integration", () => {
  it("parses the request body, runs the workflow, and returns the UI stream response", async () => {
    const writer = { write: vi.fn() };
    const stream = { kind: "ui-message-stream" };
    const response = new Response(null, { status: 200 });
    const body = {
      id: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          parts: [
            {
              type: "text",
              text: "I have severe right lower quadrant abdominal pain.",
            },
          ],
        },
      ],
    };

    let executePromise: Promise<void> | undefined;
    let onFinish:
      | ((args: {
          responseMessage: {
            role: string;
            parts: unknown[];
          };
        }) => Promise<void>)
      | undefined;

    mocks.mockGetMessages.mockResolvedValue([]);
    mocks.mockSaveMessage.mockResolvedValue(undefined);
    mocks.mockUpdateConversationTitle.mockResolvedValue(undefined);
    mocks.mockCreateUIMessageStream.mockImplementation(
      ({
        execute,
        onFinish: finish,
      }: {
        execute: (args: { writer: unknown }) => Promise<void>;
        onFinish?: (args: {
          responseMessage: {
            role: string;
            parts: unknown[];
          };
        }) => Promise<void>;
      }) => {
        // Run the stream callback immediately so the test can observe the
        // route-to-workflow handoff without needing a real streaming transport.
        onFinish = finish;
        executePromise = execute({ writer });
        return stream;
      },
    );

    mocks.mockCreateUIMessageStreamResponse.mockReturnValue(response);
    mocks.mockRunInterviewAgent.mockResolvedValue(undefined);

    const result = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    expect(executePromise).toBeDefined();
    await executePromise;

    expect(mocks.mockCreateUIMessageStream).toHaveBeenCalledTimes(1);
    expect(mocks.mockRunInterviewAgent).toHaveBeenCalledWith(body, writer);
    expect(mocks.mockCreateUIMessageStreamResponse).toHaveBeenCalledWith({
      stream,
    });
    expect(result).toBe(response);

    expect(onFinish).toBeDefined();
    await onFinish?.({
      responseMessage: {
        role: "assistant",
        parts: [
          { type: "data-step", data: { step: "safety_review", status: "completed" } },
          {
            type: "tool-runDifferentialDiagnosis",
            state: "output-available",
            input: { patientDescription: "RLQ pain" },
            output: { differentials: [{ diagnosisName: "Appendicitis" }] },
          },
        ],
      },
    });

    expect(mocks.mockSaveMessage).toHaveBeenCalledTimes(2);
    expect(mocks.mockSaveMessage).toHaveBeenNthCalledWith(
      1,
      "conv-1",
      "user",
      body.messages[0].parts,
    );
    expect(mocks.mockSaveMessage).toHaveBeenNthCalledWith(
      2,
      "conv-1",
      "assistant",
      [
        { type: "data-step", data: { step: "safety_review", status: "completed" } },
        {
          type: "tool-runDifferentialDiagnosis",
          state: "output-available",
          input: { patientDescription: "RLQ pain" },
          output: { differentials: [{ diagnosisName: "Appendicitis" }] },
        },
      ],
    );
  });
})
