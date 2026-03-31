import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockMatchClinicalPresentations: vi.fn(),
  mockMatchCategories: vi.fn(),
  mockMatchFeatures: vi.fn(),
  mockReviewDifferentialConfidence: vi.fn(),
  mockRunInterviewerAgent: vi.fn(),
  mockGetClinicalPresentations: vi.fn(),
  mockGetCategoriesForClinicalPresentations: vi.fn(),
  mockGetFeaturesForClinicalPresentations: vi.fn(),
  mockGetDiagnosesForPairs: vi.fn(),
  mockGetDiagnosesForFeaturePairs: vi.fn(),
}));

vi.mock("@/server/ai/agents/clinical-presentation-matcher-agent/agent", () => ({
  matchClinicalPresentations: mocks.mockMatchClinicalPresentations,
}));

vi.mock("@/server/ai/agents/category-matcher-agent/agent", () => ({
  matchCategories: mocks.mockMatchCategories,
}));

vi.mock("@/server/ai/agents/feature-matcher-agent/agent", () => ({
  matchFeatures: mocks.mockMatchFeatures,
}));

vi.mock("@/server/ai/agents/critic-agent/agent", () => ({
  reviewDifferentialConfidence: mocks.mockReviewDifferentialConfidence,
}));

vi.mock("@/server/ai/agents/interviewer-agent/agent", () => ({
  runInterviewerAgent: mocks.mockRunInterviewerAgent,
}))

vi.mock("@/server/ai/tools/knowledge-graph/knowledge-graph", () => ({
  getClinicalPresentations: mocks.mockGetClinicalPresentations,
  getCategoriesForClinicalPresentations:
    mocks.mockGetCategoriesForClinicalPresentations,
  getFeaturesForClinicalPresentations:
    mocks.mockGetFeaturesForClinicalPresentations,
  getDiagnosesForPairs: mocks.mockGetDiagnosesForPairs,
  getDiagnosesForFeaturePairs: mocks.mockGetDiagnosesForFeaturePairs,
}));

import { runDifferentialDiagnosisWorkflow } from "./workflow";

function clamp01(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function featurePathScore(cpScore: number, featureScore: number) {
  return clamp01(featureScore * 0.8 + cpScore * 0.2);
}

function categoryPathScore(cpScore: number, categoryScore: number) {
  return clamp01(categoryScore * 0.65 + cpScore * 0.35);
}

function diagnosisSupportScore({
  featurePathScores = [],
  categoryPathScores = [],
  crossPresentationCount = 1,
}: {
  featurePathScores?: number[];
  categoryPathScores?: number[];
  crossPresentationCount?: number;
}) {
  const bestFeaturePathScore = [...featurePathScores].sort((a, b) => b - a)[0];
  const bestCategoryPathScore = [...categoryPathScores].sort(
    (a, b) => b - a,
  )[0];

  const baseScore = bestFeaturePathScore ?? bestCategoryPathScore ?? 0;
  const additionalFeatureBonus = [...featurePathScores]
    .sort((a, b) => b - a)
    .slice(1)
    .reduce((sum, score) => sum + score * 0.12, 0);
  const categorySupportBonus =
    bestFeaturePathScore !== undefined && bestCategoryPathScore !== undefined
      ? bestCategoryPathScore * 0.12
      : 0;
  const additionalCategoryBonus = [...categoryPathScores]
    .sort((a, b) => b - a)
    .slice(1)
    .reduce((sum, score) => sum + score * 0.05, 0);
  const crossPresentationBonus =
    crossPresentationCount > 1
      ? Math.min(0.06, 0.02 * (crossPresentationCount - 1))
      : 0;

  return clamp01(
    baseScore +
      additionalFeatureBonus +
      categorySupportBonus +
      additionalCategoryBonus +
      crossPresentationBonus,
  );
}

describe("runDifferentialDiagnosisWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockReviewDifferentialConfidence.mockReturnValue({
      isConfident: true,
      shouldReturnToInterview: false,
      confidenceLabel: "high",
      reasons: [],
      topDifferentialScore: 0.9,
      topDifferentialEvidenceCount: 2,
      scoreGapToSecond: 0.2,
    });

    mocks.mockRunInterviewerAgent.mockResolvedValue([
      {
        id: "follow-up-1",
        question: "Can you tell me more about the symptom onset?",
        reason: "Clarifies timing and progression.",
      },
    ]);
  });

  it("routes to the interviewer when no clinical presentations meet threshold", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [{ key: "cp-fever", score: 0.59, matchedText: ["fever"] }],
    });

    mocks.mockReviewDifferentialConfidence.mockReturnValue({
      isConfident: false,
      shouldReturnToInterview: true,
      confidenceLabel: "low",
      reasons: ["No differential diagnoses were returned from the knowledge graph."],
      topDifferentialScore: null,
      topDifferentialEvidenceCount: 0,
      scoreGapToSecond: null,
    });

    const result = await runDifferentialDiagnosisWorkflow("fever");

    expect(result).toEqual({
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
      status: "needs_more_information",
      criticAssessment: {
        isConfident: false,
        shouldReturnToInterview: true,
        confidenceLabel: "low",
        reasons: ["No differential diagnoses were returned from the knowledge graph."],
        topDifferentialScore: null,
        topDifferentialEvidenceCount: 0,
        scoreGapToSecond: null,
      },
      followUpQuestions: [
        {
          id: "follow-up-1",
          question: "Can you tell me more about the symptom onset?",
          reason: "Clarifies timing and progression.",
        },
      ],
    });

    expect(
      mocks.mockGetCategoriesForClinicalPresentations,
    ).not.toHaveBeenCalled();
    expect(
      mocks.mockGetFeaturesForClinicalPresentations,
    ).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForFeaturePairs).not.toHaveBeenCalled();
    expect(mocks.mockRunInterviewerAgent).toHaveBeenCalled();
  });

  it("routes to the interviewer when neither categories nor features meet threshold", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [{ key: "cp-fever", score: 0.9, matchedText: ["fever"] }],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
        categoryName: "Infectious",
        categoryNormalizedName: "infectious",
      },
    ]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        featureName: "Rigors",
        featureNormalizedName: "rigors",
      },
    ]);

    mocks.mockMatchCategories.mockResolvedValue({
      matches: [{ key: "cat-infectious", score: 0.54, matchedText: ["fever"] }],
    });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [
        { key: "feature-rigors", score: 0.45, matchedText: ["rigors"] },
      ],
    });

    mocks.mockReviewDifferentialConfidence.mockReturnValue({
      isConfident: false,
      shouldReturnToInterview: true,
      confidenceLabel: "low",
      reasons: ["No differential diagnoses were returned from the knowledge graph."],
      topDifferentialScore: null,
      topDifferentialEvidenceCount: 0,
      scoreGapToSecond: null,
    });

    const result = await runDifferentialDiagnosisWorkflow("fever");

    expect(result).toEqual({
      matchedClinicalPresentations: [
        { key: "cp-fever", name: "Fever", score: 0.9, matchedText: ["fever"] },
      ],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
      status: "needs_more_information",
      criticAssessment: {
        isConfident: false,
        shouldReturnToInterview: true,
        confidenceLabel: "low",
        reasons: ["No differential diagnoses were returned from the knowledge graph."],
        topDifferentialScore: null,
        topDifferentialEvidenceCount: 0,
        scoreGapToSecond: null,
      },
      followUpQuestions: [
        {
          id: "follow-up-1",
          question: "Can you tell me more about the symptom onset?",
          reason: "Clarifies timing and progression.",
        },
      ],
    });

    expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForFeaturePairs).not.toHaveBeenCalled();
    expect(mocks.mockRunInterviewerAgent).toHaveBeenCalled();
  });

  it("returns ready_for_review when feature-only evidence produces a confident differential", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-abdominal-pain", name: "Abdominal pain" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [
        {
          key: "cp-abdominal-pain",
          score: 0.8,
          matchedText: ["abdominal pain"],
        },
      ],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        featureName: "Right lower quadrant tenderness",
        featureNormalizedName: "right lower quadrant tenderness",
        featureType: "site",
      },
    ]);

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [
        {
          key: "feature-rlq-tenderness",
          score: 0.9,
          matchedText: ["right lower quadrant tenderness"],
        },
      ],
    });

    mocks.mockGetDiagnosesForPairs.mockResolvedValue([]);
    mocks.mockGetDiagnosesForFeaturePairs.mockResolvedValue([
      {
        evidenceType: "feature",
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        diagnosisKey: "dx-appendicitis",
        diagnosisName: "Appendicitis",
      },
    ]);

    const result = await runDifferentialDiagnosisWorkflow(
      "abdominal pain with right lower quadrant tenderness",
    );

    expect(result.status).toBe("ready_for_review");
    expect(result.followUpQuestions).toEqual([]);
    expect(result.criticAssessment.isConfident).toBe(true);

    expect(result.matchedFeatures).toEqual([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        featureName: "Right lower quadrant tenderness",
        featureType: "site",
        score: 0.9,
        matchedText: ["right lower quadrant tenderness"],
      },
    ]);

    expect(result.differentials).toEqual([
      {
        diagnosisKey: "dx-appendicitis",
        diagnosisName: "Appendicitis",
        score: expect.any(Number),
        evidence: [
          {
            evidenceType: "feature",
            clinicalPresentationKey: "cp-abdominal-pain",
            featureKey: "feature-rlq-tenderness",
          },
        ],
      },
    ]);

    expect(result.differentials[0].score).toBeCloseTo(
      diagnosisSupportScore({
        featurePathScores: [featurePathScore(0.8, 0.9)],
      }),
      5,
    );
  });

  it("routes low-confidence ranked differentials back to the interviewer", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [{ key: "cp-fever", score: 0.9, matchedText: ["fever"] }],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
        categoryName: "Infectious",
        categoryNormalizedName: "infectious",
      },
    ]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([]);

    mocks.mockMatchCategories.mockResolvedValue({
      matches: [{ key: "cat-infectious", score: 0.8, matchedText: ["fever"] }],
    });

    mocks.mockGetDiagnosesForPairs.mockResolvedValue([
      {
        evidenceType: "category",
        diagnosisKey: "dx-viral",
        diagnosisName: "Viral syndrome",
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
      },
    ]);

    mocks.mockGetDiagnosesForFeaturePairs.mockResolvedValue([]);

    mocks.mockReviewDifferentialConfidence.mockReturnValue({
      isConfident: false,
      shouldReturnToInterview: true,
      confidenceLabel: "medium",
      reasons: [
        "The top differential is supported by only one or zero evidence paths.",
      ],
      topDifferentialScore: 0.835,
      topDifferentialEvidenceCount: 1,
      scoreGapToSecond: null,
    });

    const result = await runDifferentialDiagnosisWorkflow("fever");

    expect(result.status).toBe("needs_more_information");
    expect(result.criticAssessment.isConfident).toBe(false);
    expect(result.followUpQuestions).toEqual([
      {
        id: "follow-up-1",
        question: "Can you tell me more about the symptom onset?",
        reason: "Clarifies timing and progression.",
      },
    ]);
    expect(mocks.mockRunInterviewerAgent).toHaveBeenCalled();
  });

  it("prioritizes feature evidence, uses category support secondarily, and keeps path count as a bonus", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
      { key: "cp-cough", name: "Cough" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [
        { key: "cp-fever", score: 0.9, matchedText: ["fever"] },
        { key: "cp-cough", score: 0.7, matchedText: ["cough"] },
      ],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
        categoryName: "Infectious",
        categoryNormalizedName: "infectious",
      },
      {
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-inflammatory",
        categoryName: "Inflammatory",
        categoryNormalizedName: "inflammatory",
      },
    ]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        featureName: "Rigors",
        featureNormalizedName: "rigors",
        featureType: "associated_symptom",
      },
    ]);

    mocks.mockMatchCategories
      .mockResolvedValueOnce({
        matches: [
          { key: "cat-infectious", score: 0.8, matchedText: ["high fever"] },
        ],
      })
      .mockResolvedValueOnce({
        matches: [
          { key: "cat-inflammatory", score: 0.6, matchedText: ["dry cough"] },
        ],
      });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [{ key: "feature-rigors", score: 0.9, matchedText: ["rigors"] }],
    });

    mocks.mockGetDiagnosesForPairs.mockResolvedValue([
      {
        evidenceType: "category",
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
      },
      {
        evidenceType: "category",
        diagnosisKey: "dx-viral",
        diagnosisName: "Viral syndrome",
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-inflammatory",
      },
    ]);

    mocks.mockGetDiagnosesForFeaturePairs.mockResolvedValue([
      {
        evidenceType: "feature",
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
      },
    ]);

    const result = await runDifferentialDiagnosisWorkflow(
      "fever, rigors, and dry cough for two days",
    );

    expect(
      mocks.mockGetCategoriesForClinicalPresentations,
    ).toHaveBeenCalledWith(["cp-fever", "cp-cough"]);

    expect(mocks.mockGetFeaturesForClinicalPresentations).toHaveBeenCalledWith([
      "cp-fever",
      "cp-cough",
    ]);

    expect(mocks.mockGetDiagnosesForPairs).toHaveBeenCalledWith([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
      },
      {
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-inflammatory",
      },
    ]);

    expect(mocks.mockGetDiagnosesForFeaturePairs).toHaveBeenCalledWith([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
      },
    ]);

    expect(result.matchedCategories).toEqual([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
        categoryName: "Infectious",
        score: 0.8,
        matchedText: ["high fever"],
      },
      {
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-inflammatory",
        categoryName: "Inflammatory",
        score: 0.6,
        matchedText: ["dry cough"],
      },
    ]);

    expect(result.matchedFeatures).toEqual([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        featureName: "Rigors",
        featureType: "associated_symptom",
        score: 0.9,
        matchedText: ["rigors"],
      },
    ]);

    expect(result.differentials).toEqual([
      {
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        score: expect.any(Number),
        evidence: [
          {
            evidenceType: "category",
            clinicalPresentationKey: "cp-fever",
            categoryKey: "cat-infectious",
          },
          {
            evidenceType: "feature",
            clinicalPresentationKey: "cp-fever",
            featureKey: "feature-rigors",
          },
        ],
      },
      {
        diagnosisKey: "dx-viral",
        diagnosisName: "Viral syndrome",
        score: expect.any(Number),
        evidence: [
          {
            evidenceType: "category",
            clinicalPresentationKey: "cp-cough",
            categoryKey: "cat-inflammatory",
          },
        ],
      },
    ]);

    expect(result.differentials[0].score).toBeCloseTo(
      diagnosisSupportScore({
        featurePathScores: [featurePathScore(0.9, 0.9)],
        categoryPathScores: [categoryPathScore(0.9, 0.8)],
      }),
      5,
    );
    expect(result.differentials[1].score).toBeCloseTo(
      diagnosisSupportScore({
        categoryPathScores: [categoryPathScore(0.7, 0.6)],
      }),
      5,
    );
  });

  it("ranks diagnoses with support from multiple distinct presentations above single-path diagnoses", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
      { key: "cp-cough", name: "Cough" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [
        { key: "cp-fever", score: 0.9, matchedText: ["fever"] },
        { key: "cp-cough", score: 0.8, matchedText: ["cough"] },
      ],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
        categoryName: "Infectious",
        categoryNormalizedName: "infectious",
      },
      {
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-respiratory",
        categoryName: "Respiratory",
        categoryNormalizedName: "respiratory",
      },
    ]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([]);

    mocks.mockMatchCategories
      .mockResolvedValueOnce({
        matches: [
          { key: "cat-infectious", score: 0.8, matchedText: ["fever"] },
        ],
      })
      .mockResolvedValueOnce({
        matches: [
          { key: "cat-respiratory", score: 0.7, matchedText: ["cough"] },
        ],
      });

    mocks.mockGetDiagnosesForPairs.mockResolvedValue([
      {
        evidenceType: "category",
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
      },
      {
        evidenceType: "category",
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-respiratory",
      },
      {
        evidenceType: "category",
        diagnosisKey: "dx-bronchitis",
        diagnosisName: "Bronchitis",
        clinicalPresentationKey: "cp-cough",
        categoryKey: "cat-respiratory",
      },
    ]);

    mocks.mockGetDiagnosesForFeaturePairs.mockResolvedValue([]);

    const result = await runDifferentialDiagnosisWorkflow("fever and cough");

    expect(result.differentials[0].diagnosisKey).toBe("dx-flu");
    expect(result.differentials[1].diagnosisKey).toBe("dx-bronchitis");
    expect(result.differentials[0].score).toBeGreaterThan(
      result.differentials[1].score,
    );
    expect(result.differentials[0].score).toBeCloseTo(
      diagnosisSupportScore({
        categoryPathScores: [
          categoryPathScore(0.9, 0.8),
          categoryPathScore(0.8, 0.7),
        ],
        crossPresentationCount: 2,
      }),
      5,
    );
    expect(result.differentials[1].score).toBeCloseTo(
      diagnosisSupportScore({
        categoryPathScores: [categoryPathScore(0.8, 0.7)],
      }),
      5,
    );
  });

  it("keeps only the top 3 clinical presentations with score >= 0.6", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp1", name: "CP1" },
      { key: "cp2", name: "CP2" },
      { key: "cp3", name: "CP3" },
      { key: "cp4", name: "CP4" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [
        { key: "cp1", score: 0.95, matchedText: [] },
        { key: "cp2", score: 0.85, matchedText: [] },
        { key: "cp3", score: 0.75, matchedText: [] },
        { key: "cp4", score: 0.65, matchedText: [] },
      ],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([]);
    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([]);

    const result = await runDifferentialDiagnosisWorkflow("test");

    expect(result.matchedClinicalPresentations).toEqual([
      { key: "cp1", name: "CP1", score: 0.95, matchedText: [] },
      { key: "cp2", name: "CP2", score: 0.85, matchedText: [] },
      { key: "cp3", name: "CP3", score: 0.75, matchedText: [] },
    ]);

    expect(
      mocks.mockGetCategoriesForClinicalPresentations,
    ).toHaveBeenCalledWith(["cp1", "cp2", "cp3"]);

    expect(mocks.mockGetFeaturesForClinicalPresentations).toHaveBeenCalledWith([
      "cp1",
      "cp2",
      "cp3",
    ]);
  });

  it("emits workflow step events for the expanded category and feature flow", async () => {
    const onStep = vi.fn();

    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [{ key: "cp-fever", score: 0.9, matchedText: ["fever"] }],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
        categoryName: "Infectious",
        categoryNormalizedName: "infectious",
      },
    ]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
        featureName: "Rigors",
        featureNormalizedName: "rigors",
        featureType: "associated_symptom",
      },
    ]);

    mocks.mockMatchCategories.mockResolvedValue({
      matches: [{ key: "cat-infectious", score: 0.8, matchedText: ["fever"] }],
    });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [
        { key: "feature-rigors", score: 0.85, matchedText: ["rigors"] },
      ],
    });

    mocks.mockGetDiagnosesForPairs.mockResolvedValue([
      {
        evidenceType: "category",
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        clinicalPresentationKey: "cp-fever",
        categoryKey: "cat-infectious",
      },
    ]);

    mocks.mockGetDiagnosesForFeaturePairs.mockResolvedValue([
      {
        evidenceType: "feature",
        diagnosisKey: "dx-flu",
        diagnosisName: "Influenza",
        clinicalPresentationKey: "cp-fever",
        featureKey: "feature-rigors",
      },
    ]);

    mocks.mockReviewDifferentialConfidence.mockReturnValue({
      isConfident: false,
      shouldReturnToInterview: true,
      confidenceLabel: "medium",
      reasons: [
        "The top differential is supported by only one or zero evidence paths."
      ],
      topDifferentialScore: 0.9,
      topDifferentialEvidenceCount: 1,
      scoreGapToSecond: null,
    });

    await runDifferentialDiagnosisWorkflow("fever with rigors", onStep);

    expect(onStep.mock.calls.map(([event]) => event)).toEqual([
      { type: "step", step: "match_presentations", status: "running" },
      { type: "step", step: "match_presentations", status: "complete" },
      { type: "step", step: "match_categories", status: "running" },
      { type: "step", step: "match_categories", status: "complete" },
      { type: "step", step: "match_features", status: "running" },
      { type: "step", step: "match_features", status: "complete" },
      { type: "step", step: "fetch_diagnoses", status: "running" },
      { type: "step", step: "fetch_diagnoses", status: "complete" },
      { type: "step", step: "group_diagnoses", status: "running" },
      { type: "step", step: "group_diagnoses", status: "complete" },
      { type: "step", step: "critic_review", status: "running" },
      { type: "step", step: "critic_review", status: "complete" },
      {
        type: "step",
        step: "build_follow_up_questions",
        status: "running",
      },
      {
        type: "step",
        step: "build_follow_up_questions",
        status: "complete",
      }
    ]);
  });
});
