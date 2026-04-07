import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockRunDifferentialDiagnosisWorkflow: vi.fn(),
  mockGetFeaturesForClinicalPresentations: vi.fn(),
  mockVerifyDiagnosisEvidencePaths: vi.fn(),
}));

vi.mock("@/server/ai/workflows/ddx-workflow/workflow", () => ({
  runDifferentialDiagnosisWorkflow: mocks.mockRunDifferentialDiagnosisWorkflow,
}));

vi.mock("@/server/ai/tools/knowledge-graph/knowledge-graph", () => ({
  getFeaturesForClinicalPresentations:
    mocks.mockGetFeaturesForClinicalPresentations,
  verifyDiagnosisEvidencePaths: mocks.mockVerifyDiagnosisEvidencePaths,
}));

import { runSafetyWorkflow } from "./workflow";

describe("runSafetyWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockVerifyDiagnosisEvidencePaths.mockImplementation(
      async (paths) => paths,
    );
  });

  it("returns ready_for_review when the differential is confident", async () => {
    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [
        {
          key: "cp-fever",
          name: "Fever",
          score: 0.9,
          matchedText: ["fever"],
          sources: [],
        },
      ],
      matchedCategories: [
        {
          clinicalPresentationKey: "cp-fever",
          categoryKey: "cat-infectious",
          categoryName: "Infectious",
          score: 0.78,
          matchedText: ["infectious symptoms"],
        },
        {
          clinicalPresentationKey: "cp-fever",
          categoryKey: "cat-viral",
          categoryName: "Viral",
          score: 0.7,
          matchedText: ["viral illness"],
        },
      ],
      matchedFeatures: [
        {
          clinicalPresentationKey: "cp-fever",
          featureKey: "feature-rigors",
          featureName: "Rigors",
          featureType: "associated_symptom",
          score: 0.85,
          matchedText: ["rigors"],
        },
      ],
      differentials: [
        {
          diagnosisKey: "dx-flu",
          diagnosisName: "Influenza",
          score: 0.9,
          evidence: [
            {
              evidenceType: "feature",
              clinicalPresentationKey: "cp-fever",
              featureKey: "feature-rigors",
            },
            {
              evidenceType: "category",
              clinicalPresentationKey: "cp-fever",
              categoryKey: "cat-infectious",
            },
          ],
        },
        {
          diagnosisKey: "dx-cold",
          diagnosisName: "Common cold",
          score: 0.75,
          evidence: [
            {
              evidenceType: "category",
              clinicalPresentationKey: "cp-fever",
              categoryKey: "cat-viral",
            },
          ],
        },
      ],
    });

    const result = await runSafetyWorkflow("fever and rigors");

    expect(result.status).toBe("ready_for_review");
    expect(result.criticAssessment.isConfident).toBe(true);
    expect(result.groundingAssessment.isGrounded).toBe(true);
    expect(result.candidateFeatures).toEqual([]);
    expect(
      mocks.mockGetFeaturesForClinicalPresentations,
    ).not.toHaveBeenCalled();
  });

  it("routes to needs_more_information when the top differential score is too low", async () => {
    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [
        {
          key: "cp-fever",
          name: "Fever",
          score: 0.9,
          matchedText: ["fever"],
          sources: [],
        },
      ],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [
        {
          diagnosisKey: "dx-flu",
          diagnosisName: "Influenza",
          score: 0.55,
          evidence: [
            {
              evidenceType: "feature",
              clinicalPresentationKey: "cp-fever",
              featureKey: "feature-rigors",
            },
          ],
        },
        {
          diagnosisKey: "dx-cold",
          diagnosisName: "Common cold",
          score: 0.52,
          evidence: [
            {
              evidenceType: "category",
              clinicalPresentationKey: "cp-fever",
              categoryKey: "cat-viral",
            },
          ],
        },
      ],
    });

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        featureName: "Rigors",
        featureNormalizedName: "rigors",
        featureType: "associated_symptom",
      },
    ]);

    const result = await runSafetyWorkflow("fever and rigors");

    expect(result.status).toBe("needs_more_information");
    expect(result.criticAssessment.isConfident).toBe(false);
    expect(result.groundingAssessment.isGrounded).toBe(true);
    expect(result.candidateFeatures).toEqual([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        featureName: "Rigors",
        featureNormalizedName: "rigors",
        featureType: "associated_symptom",
      },
    ]);
    expect(mocks.mockGetFeaturesForClinicalPresentations).toHaveBeenCalledWith([
      "cp-fever",
    ]);
  });

  it("filters out ungrounded diagnoses before returning ready_for_review", async () => {
    mocks.mockVerifyDiagnosisEvidencePaths.mockResolvedValue([
      {
        evidenceType: "feature",
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        diagnosisKey: "dx-flu",
      },
    ]);

    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [
        {
          key: "cp-fever",
          name: "Fever",
          score: 0.9,
          matchedText: ["fever"],
          sources: [],
        },
      ],
      matchedCategories: [
        {
          clinicalPresentationKey: "cp-fever",
          categoryKey: "cat-infectious",
          categoryName: "Infectious",
          score: 0.8,
          matchedText: ["fever"],
        },
      ],
      matchedFeatures: [
        {
          clinicalPresentationKey: "cp-fever",
          featureKey: "feature-rigors",
          featureName: "Rigors",
          featureType: "associated_symptom",
          score: 0.9,
          matchedText: ["rigors"],
        },
      ],
      differentials: [
        {
          diagnosisKey: "dx-flu",
          diagnosisName: "Influenza",
          score: 0.9,
          evidence: [
            {
              evidenceType: "feature",
              clinicalPresentationKey: "cp-fever",
              featureKey: "feature-rigors",
            },
          ],
        },
        {
          diagnosisKey: "dx-ungrounded",
          diagnosisName: "Ungrounded diagnosis",
          score: 0.89,
          evidence: [
            {
              evidenceType: "category",
              clinicalPresentationKey: "cp-fever",
              categoryKey: "cat-missing",
            },
          ],
        },
      ],
    });

    const result = await runSafetyWorkflow("fever and rigors");

    expect(result.status).toBe("ready_for_review");
    expect(result.differentials).toEqual([
      {
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        score: 0.9,
        evidence: [
          {
            evidenceType: "feature",
            clinicalPresentationKey: "cp-fever",
            featureKey: "feature-rigors",
          },
        ],
      },
    ]);
    expect(result.groundingAssessment).toMatchObject({
      isGrounded: true,
      groundedDifferentialCount: 1,
      ungroundedDifferentialCount: 1,
      topDiagnosisHasGroundedEvidence: true,
      topDiagnosisHasFeatureEvidence: true,
    });
  });

  it("forwards modelProvider to the differential diagnosis workflow", async () => {
    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
    });

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([]);

    await runSafetyWorkflow("fever", undefined, "claude");

    expect(mocks.mockRunDifferentialDiagnosisWorkflow).toHaveBeenCalledWith(
      "fever",
      undefined,
      "claude",
    );
  });

  it("emits critic and follow-up step events", async () => {
    const onStep = vi.fn();

    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
    });

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([]);

    await runSafetyWorkflow("unknown presentation", onStep);

    expect(onStep.mock.calls.map(([event]) => event)).toEqual([
      { type: "step", step: "safety_review", status: "running" },
      { type: "step", step: "safety_review", status: "complete" },
    ]);
  });
});
