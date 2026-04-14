/**
 * @fileoverview Tests composition of patient-facing responses from grounded differential results.
 * @contributors Johnson Zhang
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockGetDefaultChatModel: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.mockGenerateText,
}));

vi.mock("@/server/ai/core/models", () => ({
  getDefaultChatModel: mocks.mockGetDefaultChatModel,
}));

import { composePatientResponse } from "./patient-response";

describe("composePatientResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a patient-facing prompt from the grounded safety result", async () => {
    mocks.mockGetDefaultChatModel.mockReturnValue({ id: "fake-chat-model" });
    mocks.mockGenerateText.mockResolvedValue({
      text: "This pattern may fit a few possibilities, including appendicitis.",
    });

    const text = await composePatientResponse("abdominal pain", {
      status: "ready_for_review",
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [
        {
          diagnosisKey: "dx-appendicitis",
          diagnosisName: "Appendicitis",
          score: 0.92,
          evidence: [],
        },
      ],
      criticAssessment: {
        isConfident: true,
        shouldReturnToInterview: false,
        confidenceLabel: "high",
        reasons: [],
        topDifferentialScore: 0.92,
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

    expect(text).toBe(
      "This pattern may fit a few possibilities, including appendicitis.",
    );
    expect(mocks.mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { id: "fake-chat-model" },
        prompt: expect.stringContaining("Write a short, calm, empathetic explanation"),
      }),
    );
  });
});
