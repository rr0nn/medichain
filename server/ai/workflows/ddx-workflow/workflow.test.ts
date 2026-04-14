/**
 * @fileoverview Tests end-to-end orchestration of the differential diagnosis workflow.
 * @contributors Johnson Zhang, John Kollannur
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockMatchClinicalPresentations: vi.fn(),
  mockMatchCategories: vi.fn(),
  mockMatchFeatures: vi.fn(),
  mockGetClinicalPresentations: vi.fn(),
  mockGetCategoriesForClinicalPresentations: vi.fn(),
  mockGetFeaturesForClinicalPresentations: vi.fn(),
  mockGetSourcesForClinicalPresentations: vi.fn(),
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

vi.mock("@/server/ai/tools/knowledge-graph/knowledge-graph", () => ({
  getClinicalPresentations: mocks.mockGetClinicalPresentations,
  getCategoriesForClinicalPresentations:
    mocks.mockGetCategoriesForClinicalPresentations,
  getFeaturesForClinicalPresentations:
    mocks.mockGetFeaturesForClinicalPresentations,
  getSourcesForClinicalPresentations:
    mocks.mockGetSourcesForClinicalPresentations,
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
    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([]);
    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([]);
    mocks.mockGetSourcesForClinicalPresentations.mockResolvedValue([]);
    mocks.mockGetDiagnosesForPairs.mockResolvedValue([]);
    mocks.mockGetDiagnosesForFeaturePairs.mockResolvedValue([]);
  });

  it("returns empty results when no clinical presentations meet threshold", async () => {
    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [{ key: "cp-fever", score: 0.59, matchedText: ["fever"] }],
    });

    const result = await runDifferentialDiagnosisWorkflow("fever");

    expect(result).toEqual({
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
    });

    expect(
      mocks.mockGetCategoriesForClinicalPresentations,
    ).not.toHaveBeenCalled();
    expect(
      mocks.mockGetFeaturesForClinicalPresentations,
    ).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForFeaturePairs).not.toHaveBeenCalled();
  });

  it("completes downstream step states when no clinical presentations match", async () => {
    const onStep = vi.fn();

    mocks.mockGetClinicalPresentations.mockResolvedValue([
      { key: "cp-fever", name: "Fever" },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [{ key: "cp-fever", score: 0.4, matchedText: ["fever"] }],
    });

    await runDifferentialDiagnosisWorkflow("fever", onStep);

    expect(onStep.mock.calls.map(([event]) => event)).toEqual([
      { type: "step", step: "match_presentations", status: "running" },
      { type: "step", step: "match_presentations", status: "complete" },
      { type: "step", step: "match_categories", status: "complete" },
      { type: "step", step: "match_features", status: "complete" },
      { type: "step", step: "fetch_diagnoses", status: "complete" },
      { type: "step", step: "group_diagnoses", status: "complete" },
    ]);
  });

  it("returns matched presentations but no differentials when neither categories nor features meet threshold", async () => {
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
      matches: [{ key: "cat-infectious", score: 0.54, matchedText: ["fever"] }],
    });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [
        { key: "feature-rigors", score: 0.45, matchedText: ["rigors"] },
      ],
    });

    const result = await runDifferentialDiagnosisWorkflow("fever");

    expect(result).toEqual({
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
      differentials: [],
    });
  });

  it("completes diagnosis steps when no category or feature evidence is matched", async () => {
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
      matches: [{ key: "cat-infectious", score: 0.2, matchedText: ["fever"] }],
    });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [{ key: "feature-rigors", score: 0.2, matchedText: ["rigors"] }],
    });

    await runDifferentialDiagnosisWorkflow("fever", onStep);

    expect(onStep.mock.calls.map(([event]) => event)).toEqual([
      { type: "step", step: "match_presentations", status: "running" },
      { type: "step", step: "match_presentations", status: "complete" },
      { type: "step", step: "match_categories", status: "running" },
      { type: "step", step: "match_categories", status: "complete" },
      { type: "step", step: "match_features", status: "running" },
      { type: "step", step: "match_features", status: "complete" },
      { type: "step", step: "fetch_diagnoses", status: "complete" },
      { type: "step", step: "group_diagnoses", status: "complete" },
    ]);
  });

  it("returns differentials from feature-only evidence", async () => {
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

    expect(result.differentials[0].score).toBeCloseTo(
      diagnosisSupportScore({
        featurePathScores: [featurePathScore(0.8, 0.9)],
      }),
      5,
    );
  });

  it("attaches graph sources to matched clinical presentations", async () => {
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

    mocks.mockGetSourcesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
        sourceTitle: "Abdominal pain",
        edition: "5th edition",
        pageStart: 123,
        pageEnd: 126,
      },
    ]);

    const result = await runDifferentialDiagnosisWorkflow("abdominal pain");

    expect(result.matchedClinicalPresentations).toEqual([
      {
        key: "cp-abdominal-pain",
        name: "Abdominal pain",
        score: 0.8,
        matchedText: ["abdominal pain"],
        sources: [
          {
            clinicalPresentationKey: "cp-abdominal-pain",
            sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
            sourceTitle: "Abdominal pain",
            edition: "5th edition",
            pageStart: 123,
            pageEnd: 126,
          },
        ],
      },
    ]);
  });

  it("prioritizes feature evidence and uses category support secondarily", async () => {
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

    expect(result.differentials[0].diagnosisKey).toBe("dx-flu");
    expect(result.differentials[1].diagnosisKey).toBe("dx-viral");
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
      { key: "cp1", name: "CP1", score: 0.95, matchedText: [], sources: [] },
      { key: "cp2", name: "CP2", score: 0.85, matchedText: [], sources: [] },
      { key: "cp3", name: "CP3", score: 0.75, matchedText: [], sources: [] },
    ]);
  });
});
