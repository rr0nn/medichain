import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockMatchClinicalPresentations: vi.fn(),
  mockMatchCategories: vi.fn(),
  mockMatchFeatures: vi.fn(),
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

describe("runDifferentialDiagnosisWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(mocks.mockGetCategoriesForClinicalPresentations).not.toHaveBeenCalled();
    expect(mocks.mockGetFeaturesForClinicalPresentations).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForFeaturePairs).not.toHaveBeenCalled();
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
      },
    ]);

    mocks.mockMatchCategories.mockResolvedValue({
      matches: [{ key: "cat-infectious", score: 0.54, matchedText: ["fever"] }],
    });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [{ key: "feature-rigors", score: 0.45, matchedText: ["rigors"] }],
    });

    const result = await runDifferentialDiagnosisWorkflow("fever");

    expect(result).toEqual({
      matchedClinicalPresentations: [
        { key: "cp-fever", name: "Fever", score: 0.9, matchedText: ["fever"] },
      ],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
    });

    expect(mocks.mockGetDiagnosesForPairs).not.toHaveBeenCalled();
    expect(mocks.mockGetDiagnosesForFeaturePairs).not.toHaveBeenCalled();
  });

  it("returns differentials from feature-only evidence when category matching is empty", async () => {
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
      "abdominal pain with right lower quadrant tenderness"
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

    expect(result.differentials[0].score).toBeCloseTo(0.85);
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
        matches: [{ key: "cat-infectious", score: 0.8, matchedText: ["high fever"] }],
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
      "fever, rigors, and dry cough for two days"
    );

    expect(mocks.mockGetCategoriesForClinicalPresentations).toHaveBeenCalledWith([
      "cp-fever",
      "cp-cough",
    ]);

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

    expect(result.differentials[0].score).toBeCloseTo(0.98, 2);
    expect(result.differentials[1].score).toBeCloseTo(0.65);
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
        matches: [{ key: "cat-infectious", score: 0.8, matchedText: ["fever"] }],
      })
      .mockResolvedValueOnce({
        matches: [{ key: "cat-respiratory", score: 0.7, matchedText: ["cough"] }],
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
      result.differentials[1].score
    );
    expect(result.differentials[0].score).toBeCloseTo(0.87, 2);
    expect(result.differentials[1].score).toBeCloseTo(0.75);
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

    expect(mocks.mockGetCategoriesForClinicalPresentations).toHaveBeenCalledWith([
      "cp1",
      "cp2",
      "cp3",
    ]);

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
      matches: [{ key: "feature-rigors", score: 0.85, matchedText: ["rigors"] }],
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
    ]);
  });
});
