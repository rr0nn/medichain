import { describe,  expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockCreateUIMessageStream: vi.fn(),
  mockCreateUIMessageStreamResponse: vi.fn(),
  mockRunInterviewAgent: vi.fn(),
}));

vi.mock("ai", () => ({
  createUIMessageStream: mocks.mockCreateUIMessageStream,
  createUIMessageStreamResponse: mocks.mockCreateUIMessageStreamResponse,
}));

// Keep the route and workflow real; only replace the external agent boundary.
vi.mock("@/server/ai/agents/interview-agent/agent", () => ({
  runInterviewAgent: mocks.mockRunInterviewAgent,
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat integration", () => {
  it("parses the request body, runs the workflow, and returns the UI stream response", async () => {
    const writer = { write: vi.fn() };
    const stream = { kind: "ui-message-stream" };
    const response = new Response(null, { status: 200 });
    const body = {
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
    
    mocks.mockCreateUIMessageStream.mockImplementation(
      ({
        execute,
      }: {
        execute: (args: { writer: unknown }) => Promise<void>;
      }) => {
        // Run the stream callback immediately so the test can observe the
        // route-to-workflow handoff without needing a real streaming transport.
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
  });

  it("passes modelProvider from the request body to the interview agent", async () => {
    const writer = { write: vi.fn() };
    const stream = { kind: "ui-message-stream" };
    const response = new Response(null, { status: 200 });
    const body = {
      messages: [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "I have a headache." }],
        },
      ],
      modelProvider: "claude",
    };

    let executePromise: Promise<void> | undefined;

    mocks.mockCreateUIMessageStream.mockImplementation(
      ({
        execute,
      }: {
        execute: (args: { writer: unknown }) => Promise<void>;
      }) => {
        executePromise = execute({ writer });
        return stream;
      },
    );

    mocks.mockCreateUIMessageStreamResponse.mockReturnValue(response);
    mocks.mockRunInterviewAgent.mockResolvedValue(undefined);

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    expect(executePromise).toBeDefined();
    await executePromise;

    expect(mocks.mockRunInterviewAgent).toHaveBeenCalledWith(
      expect.objectContaining({ modelProvider: "claude" }),
      writer,
    );
  });
})