/**
 * @fileoverview Tests interview-agent tool use and response orchestration.
 * @contributors Johnson Zhang, John Kollannur, Aryan Wadhawan
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockComposePatientResponse: vi.fn(),
  mockConvertToModelMessages: vi.fn(),
  mockResolveModelSelection: vi.fn(),
  mockRunSafetyWorkflow: vi.fn(),
  mockStreamText: vi.fn(),
}));

vi.mock("ai", () => ({
  convertToModelMessages: mocks.mockConvertToModelMessages,
  stepCountIs: vi.fn(),
  streamText: mocks.mockStreamText,
  tool: (config: unknown) => config,
}));

vi.mock("@/server/ai/core/models", () => ({
  resolveModelSelection: mocks.mockResolveModelSelection,
}));

vi.mock("@/server/ai/workflows/safety-workflow/workflow", () => ({
  runSafetyWorkflow: mocks.mockRunSafetyWorkflow,
}));

vi.mock("@/server/ai/agents/response-composer-agent/agent", () => ({
  composePatientResponse: mocks.mockComposePatientResponse,
}));

import { runInterviewAgent } from "./agent";

function createResolvedSelection(input: {
  model?: unknown;
  modelId?: string;
  modelLabel?: string;
}) {
  return {
    model: input.model ?? { id: input.modelId ?? "gemini-2.5-flash" },
    modelId: input.modelId ?? "gemini-2.5-flash",
    modelLabel: input.modelLabel ?? "Gemini 2.5 Flash",
  };
}

describe("runInterviewAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockResolveModelSelection.mockImplementation(
      (selectorKey: "chat" | "diagnosis", requestedModelId?: string) =>
        createResolvedSelection({
          model: { id: `${selectorKey}-model` },
          modelId: requestedModelId ?? "gemini-2.5-flash",
        }),
    );
  });

  it("converts messages and streams text with the resolved chat model", async () => {
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

    const fakeChatModel = { id: "fake-chat-model" };
    const fakeStreamResult = { toUIMessageStream: vi.fn() };
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    mocks.mockConvertToModelMessages.mockResolvedValue(convertedMessages);
    mocks.mockResolveModelSelection
      .mockReturnValueOnce(
        createResolvedSelection({
          model: fakeChatModel,
        }),
      )
      .mockReturnValueOnce(
        createResolvedSelection({
          model: { id: "fake-diagnosis-model" },
        }),
      );
    mocks.mockStreamText.mockReturnValue(fakeStreamResult);

    await runInterviewAgent(input as never, writer as never);

    expect(mocks.mockConvertToModelMessages).toHaveBeenCalledWith(
      input.messages,
      { ignoreIncompleteToolCalls: true },
    );
    expect(mocks.mockResolveModelSelection).toHaveBeenNthCalledWith(
      1,
      "chat",
      undefined,
    );
    expect(mocks.mockResolveModelSelection).toHaveBeenNthCalledWith(
      2,
      "diagnosis",
      undefined,
    );
    expect(mocks.mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: convertedMessages,
        model: fakeChatModel,
        system: expect.stringContaining(
          'status = "needs_more_information" and matchedClinicalPresentations.length === 0',
        ),
      }),
    );
    expect(mocks.mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          "Do not imply that an evidence support score is a probability.",
        ),
      }),
    );
    expect(fakeStreamResult.toUIMessageStream).toHaveBeenCalledWith(
      expect.objectContaining({
        onError: expect.any(Function),
      }),
    );
    expect(writer.merge).toHaveBeenCalledWith(fakeStreamResult.toUIMessageStream());
  });

  it("formats consultation context into the workflow input", async () => {
    const convertedMessages = [
      { role: "user", content: [{ type: "text", text: "Pain started yesterday" }] },
    ];
    const fakeStreamResult = { toUIMessageStream: vi.fn() };
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    mocks.mockConvertToModelMessages.mockResolvedValue(convertedMessages);
    mocks.mockStreamText.mockReturnValue(fakeStreamResult);
    mocks.mockRunSafetyWorkflow.mockResolvedValue({
      status: "needs_more_information",
    });

    await runInterviewAgent(
      {
        messages: [
          { id: "1", role: "user", content: "Pain started yesterday" },
        ],
      } as never,
      writer as never,
    );

    const streamConfig = mocks.mockStreamText.mock.calls[0][0];
    const toolConfig = streamConfig.tools.runDifferentialDiagnosis;

    await toolConfig.execute({
      consultationStage: "follow_up_clarification",
      newInformationFocus: "onset",
      patientDescription: "Lower abdominal pain with nausea",
    });

    expect(mocks.mockRunSafetyWorkflow).toHaveBeenCalledWith(
      [
        "Consultation stage: follow_up_clarification.",
        "New information focus: onset.",
        "Patient summary: Lower abdominal pain with nausea",
      ].join("\n"),
      expect.any(Function),
      "gemini-2.5-flash",
    );
  });

  it("ignores incomplete tool calls when rebuilding model messages", async () => {
    const fakeStreamResult = { toUIMessageStream: vi.fn() };

    mocks.mockConvertToModelMessages.mockResolvedValue([]);
    mocks.mockStreamText.mockReturnValue(fakeStreamResult);

    await runInterviewAgent(
      {
        messages: [
          {
            id: "1",
            role: "assistant",
            parts: [
              {
                type: "tool-runDifferentialDiagnosis",
                state: "input-available",
                input: { patientDescription: "abdominal pain" },
                toolCallId: "tool-1",
              },
            ],
          },
        ],
      } as never,
      { merge: vi.fn(), write: vi.fn() } as never,
    );

    expect(mocks.mockConvertToModelMessages).toHaveBeenCalledWith(
      expect.any(Array),
      { ignoreIncompleteToolCalls: true },
    );
  });

  it("passes the selected diagnosis model id through to the safety workflow", async () => {
    const fakeStreamResult = { toUIMessageStream: vi.fn() };
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    mocks.mockConvertToModelMessages.mockResolvedValue([
      { role: "user", content: [{ type: "text", text: "Abdominal pain" }] },
    ]);
    mocks.mockResolveModelSelection
      .mockReturnValueOnce(
        createResolvedSelection({
          model: { id: "fake-chat-model" },
        }),
      )
      .mockReturnValueOnce(
        createResolvedSelection({
          model: { id: "fake-diagnosis-model" },
          modelId: "gpt-5-mini",
          modelLabel: "GPT-5 mini",
        }),
      );
    mocks.mockStreamText.mockReturnValue(fakeStreamResult);
    mocks.mockRunSafetyWorkflow.mockResolvedValue({
      status: "needs_more_information",
    });

    await runInterviewAgent(
      {
        diagnosisModelId: "gpt-5-mini",
        messages: [{ id: "1", role: "user", content: "Abdominal pain" }],
      } as never,
      writer as never,
    );

    const streamConfig = mocks.mockStreamText.mock.calls[0][0];
    const toolConfig = streamConfig.tools.runDifferentialDiagnosis;

    await toolConfig.execute({
      consultationStage: "initial_assessment",
      patientDescription: "Lower abdominal pain",
    });

    expect(mocks.mockRunSafetyWorkflow).toHaveBeenCalledWith(
      [
        "Consultation stage: initial_assessment.",
        "Patient summary: Lower abdominal pain",
      ].join("\n"),
      expect.any(Function),
      "gpt-5-mini",
    );
  });

  it("composes a patient-facing response when the safety workflow is ready for review", async () => {
    const fakeStreamResult = { toUIMessageStream: vi.fn() };
    const writer = {
      merge: vi.fn(),
      write: vi.fn(),
    };

    mocks.mockConvertToModelMessages.mockResolvedValue([
      { role: "user", content: [{ type: "text", text: "Abdominal pain" }] },
    ]);
    mocks.mockResolveModelSelection
      .mockReturnValueOnce(
        createResolvedSelection({
          model: { id: "fake-chat-model" },
        }),
      )
      .mockReturnValueOnce(
        createResolvedSelection({
          model: { id: "fake-diagnosis-model" },
        }),
      );
    mocks.mockStreamText.mockReturnValue(fakeStreamResult);
    mocks.mockRunSafetyWorkflow.mockResolvedValue({
      candidateFeatures: [],
      criticAssessment: {
        confidenceLabel: "high",
        isConfident: true,
        reasons: [],
        scoreGapToSecond: null,
        shouldReturnToInterview: false,
        topDifferentialEvidenceCount: 1,
        topDifferentialScore: 0.9,
      },
      differentials: [],
      groundingAssessment: {
        groundedDifferentialCount: 1,
        isGrounded: true,
        reasons: [],
        topDiagnosisHasFeatureEvidence: true,
        topDiagnosisHasGroundedEvidence: true,
        ungroundedDifferentialCount: 0,
      },
      matchedCategories: [],
      matchedClinicalPresentations: [],
      matchedFeatures: [],
      status: "ready_for_review",
    });
    mocks.mockComposePatientResponse.mockResolvedValue("Patient-facing response");

    await runInterviewAgent(
      {
        messages: [{ id: "1", role: "user", content: "Abdominal pain" }],
      } as never,
      writer as never,
    );

    const streamConfig = mocks.mockStreamText.mock.calls[0][0];
    const toolConfig = streamConfig.tools.runDifferentialDiagnosis;

    const result = await toolConfig.execute({
      consultationStage: "initial_assessment",
      patientDescription: "Lower abdominal pain",
    });

    expect(mocks.mockComposePatientResponse).toHaveBeenCalledWith(
      "Lower abdominal pain",
      expect.objectContaining({ status: "ready_for_review" }),
      "gemini-2.5-flash",
    );
    expect(result).toEqual(
      expect.objectContaining({
        composedResponse: "Patient-facing response",
        status: "ready_for_review",
      }),
    );
  });
});
