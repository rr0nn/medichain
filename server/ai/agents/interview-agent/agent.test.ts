// This matches the file exactly: runInterviewAgent just converts incoming messages,
// gets the default chat model, and passes both into streamText.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    mockConvertToModelMessages: vi.fn(),
    mockStreamText: vi.fn(),
    mockGetDefaultChatModel: vi.fn(),
    mockRunSafetyWorkflow: vi.fn(),
    mockComposePatientResponse: vi.fn(),
}));

vi.mock("ai", () => ({
    convertToModelMessages: mocks.mockConvertToModelMessages,
    streamText: mocks.mockStreamText,
    tool: (config: unknown) => config,
    stepCountIs: vi.fn(),
}));

vi.mock("@/server/ai/core/models", () => ({
    getDefaultChatModel: mocks.mockGetDefaultChatModel,
}));

vi.mock("@/server/ai/workflows/safety-workflow/workflow", () => ({
    runSafetyWorkflow: mocks.mockRunSafetyWorkflow,
}));

vi.mock("./patient-response", () => ({
    composePatientResponse: mocks.mockComposePatientResponse,
}));

import { runInterviewAgent } from "./agent";

describe("runInterviewAgent", () => {
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
        const fakeStreamResult = { toUIMessageStream: vi.fn() };

        const writer = {
            write: vi.fn(),
            merge: vi.fn(),
        };

        mocks.mockConvertToModelMessages.mockResolvedValue(convertedMessages);
        mocks.mockGetDefaultChatModel.mockReturnValue(fakeModel);
        mocks.mockStreamText.mockReturnValue(fakeStreamResult);

        await runInterviewAgent(input as never, writer as never);

        expect(mocks.mockConvertToModelMessages).toHaveBeenCalledWith(input.messages);
        expect(mocks.mockGetDefaultChatModel).toHaveBeenCalledTimes(1);
        expect(mocks.mockStreamText).toHaveBeenCalledWith(
            expect.objectContaining({
                model: fakeModel,
                messages: convertedMessages,
                system: expect.stringContaining(
                    'status = "needs_more_information" and matchedClinicalPresentations.length === 0'
                ),
            })
        );
        expect(mocks.mockStreamText).toHaveBeenCalledWith(
            expect.objectContaining({
                system: expect.stringContaining(
                    "Do not imply that an evidence support score is a probability."
                ),
            })
        );
        expect(writer.merge).toHaveBeenCalledWith(fakeStreamResult.toUIMessageStream());
    });

    it("formats consultation context into the workflow input", async () => {
        const convertedMessages = [
            { role: "user", content: [{ type: "text", text: "Pain started yesterday" }] },
        ];
        const fakeModel = { id: "fake-chat-model" };
        const fakeStreamResult = { toUIMessageStream: vi.fn() };
        const writer = {
            write: vi.fn(),
            merge: vi.fn(),
        };

        mocks.mockConvertToModelMessages.mockResolvedValue(convertedMessages);
        mocks.mockGetDefaultChatModel.mockReturnValue(fakeModel);
        mocks.mockStreamText.mockReturnValue(fakeStreamResult);
        mocks.mockRunSafetyWorkflow.mockResolvedValue({ status: "needs_more_information" });

        await runInterviewAgent(
            {
                messages: [{ id: "1", role: "user", content: "Pain started yesterday" }],
            } as never,
            writer as never
        );

        const streamConfig = mocks.mockStreamText.mock.calls[0][0];
        const toolConfig = streamConfig.tools.runDifferentialDiagnosis;

        await toolConfig.execute({
            patientDescription: "Lower abdominal pain with nausea",
            consultationStage: "follow_up_clarification",
            newInformationFocus: "onset",
        });

        expect(mocks.mockRunSafetyWorkflow).toHaveBeenCalledWith(
            [
                "Consultation stage: follow_up_clarification.",
                "New information focus: onset.",
                "Patient summary: Lower abdominal pain with nausea",
            ].join("\n"),
            expect.any(Function)
        );
    });

    it("composes a patient-facing response when the safety workflow is ready for review", async () => {
        const convertedMessages = [
            { role: "user", content: [{ type: "text", text: "Abdominal pain" }] },
        ];
        const fakeModel = { id: "fake-chat-model" };
        const fakeStreamResult = { toUIMessageStream: vi.fn() };
        const writer = {
            write: vi.fn(),
            merge: vi.fn(),
        };

        mocks.mockConvertToModelMessages.mockResolvedValue(convertedMessages);
        mocks.mockGetDefaultChatModel.mockReturnValue(fakeModel);
        mocks.mockStreamText.mockReturnValue(fakeStreamResult);
        mocks.mockRunSafetyWorkflow.mockResolvedValue({
            status: "ready_for_review",
            matchedClinicalPresentations: [],
            matchedCategories: [],
            matchedFeatures: [],
            differentials: [],
            criticAssessment: {
                isConfident: true,
                shouldReturnToInterview: false,
                confidenceLabel: "high",
                reasons: [],
                topDifferentialScore: 0.9,
                topDifferentialEvidenceCount: 1,
                scoreGapToSecond: null,
            },
            groundingAssessment: {
                isGrounded: true,
                reasons: [],
                groundedDifferentialCount: 1,
                ungroundedDifferentialCount: 0,
                topDiagnosisHasGroundedEvidence: true,
                topDiagnosisHasFeatureEvidence: true,
            },
            candidateFeatures: [],
        });
        mocks.mockComposePatientResponse.mockResolvedValue("Patient-facing response");

        await runInterviewAgent(
            {
                messages: [{ id: "1", role: "user", content: "Abdominal pain" }],
            } as never,
            writer as never
        );

        const streamConfig = mocks.mockStreamText.mock.calls[0][0];
        const toolConfig = streamConfig.tools.runDifferentialDiagnosis;

        const result = await toolConfig.execute({
            patientDescription: "Lower abdominal pain",
            consultationStage: "initial_assessment",
        });

        expect(mocks.mockComposePatientResponse).toHaveBeenCalledWith(
            "Lower abdominal pain",
            expect.objectContaining({ status: "ready_for_review" }),
        );
        expect(result).toEqual(
            expect.objectContaining({
                status: "ready_for_review",
                composedResponse: "Patient-facing response",
            }),
        );
    });
});
