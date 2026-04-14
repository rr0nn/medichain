/**
 * @fileoverview Tests differential workflow integration across matchers and graph lookups.
 * @contributors John Kollannur
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

// The workflow orchestration and diagnosis ranking stay real. Only upstream
// data/AI boundaries are mocked so this test exercises the integration between
// workflow stages and the final result shaping.
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

import { runDifferentialDiagnosisWorkflow } from "@/server/ai/workflows/ddx-workflow/workflow";

describe("runDifferentialDiagnosisWorkflow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("combines graph lookups, matcher outputs, sources, and ranking into a single differential result", async () => {
    const onStep = vi.fn();

    mocks.mockGetClinicalPresentations.mockResolvedValue([
      {
        key: "cp-abdominal-pain",
        name: "Abdominal pain",
        normalized_name: "abdominal pain",
      },
    ]);

    mocks.mockMatchClinicalPresentations.mockResolvedValue({
      matches: [
        {
          key: "cp-abdominal-pain",
          score: 0.82,
          matchedText: ["right lower quadrant abdominal pain"],
        },
      ],
    });

    mocks.mockGetCategoriesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        categoryKey: "cat-inflammatory",
        categoryName: "Inflammatory",
        categoryNormalizedName: "inflammatory",
      },
    ]);

    mocks.mockGetFeaturesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        featureName: "Right lower quadrant tenderness",
        featureNormalizedName: "right lower quadrant tenderness",
        featureType: "site",
      },
    ]);

    mocks.mockGetSourcesForClinicalPresentations.mockResolvedValue([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
        sourceTitle: "Pocketbook of Differential Diagnosis",
        edition: "5",
        pageStart: 123,
        pageEnd: 126,
      },
    ]);

    mocks.mockMatchCategories.mockResolvedValue({
      matches: [
        {
          key: "cat-inflammatory",
          score: 0.72,
          matchedText: ["inflammatory abdominal process"],
        },
      ],
    });

    mocks.mockMatchFeatures.mockResolvedValue({
      matches: [
        {
          key: "feature-rlq-tenderness",
          score: 0.91,
          matchedText: ["right lower quadrant tenderness"],
        },
      ],
    });

    mocks.mockGetDiagnosesForPairs.mockResolvedValue([
      {
        evidenceType: "category",
        clinicalPresentationKey: "cp-abdominal-pain",
        categoryKey: "cat-inflammatory",
        diagnosisKey: "dx-appendicitis",
        diagnosisName: "Appendicitis",
      },
    ]);

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
      "Severe right lower quadrant pain with focal tenderness.",
      onStep,
    );

    expect(
      mocks.mockGetCategoriesForClinicalPresentations,
    ).toHaveBeenCalledWith(["cp-abdominal-pain"]);
    expect(mocks.mockGetFeaturesForClinicalPresentations).toHaveBeenCalledWith([
      "cp-abdominal-pain",
    ]);
    expect(mocks.mockGetSourcesForClinicalPresentations).toHaveBeenCalledWith([
      "cp-abdominal-pain",
    ]);

    expect(result.matchedClinicalPresentations).toEqual([
      {
        key: "cp-abdominal-pain",
        name: "Abdominal pain",
        score: 0.82,
        matchedText: ["right lower quadrant abdominal pain"],
        sources: [
          {
            clinicalPresentationKey: "cp-abdominal-pain",
            sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
            sourceTitle: "Pocketbook of Differential Diagnosis",
            edition: "5",
            pageStart: 123,
            pageEnd: 126,
          },
        ],
      },
    ]);

    expect(result.matchedCategories).toEqual([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        categoryKey: "cat-inflammatory",
        categoryName: "Inflammatory",
        score: 0.72,
        matchedText: ["inflammatory abdominal process"],
      },
    ]);

    expect(result.matchedFeatures).toEqual([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        featureName: "Right lower quadrant tenderness",
        featureType: "site",
        score: 0.91,
        matchedText: ["right lower quadrant tenderness"],
      },
    ]);

    expect(result.differentials).toHaveLength(1);
    expect(result.differentials[0]).toMatchObject({
      diagnosisKey: "dx-appendicitis",
      diagnosisName: "Appendicitis",
    });
    expect(result.differentials[0].score).toBeGreaterThan(0.8);
    expect(result.differentials[0].evidence).toEqual(
      expect.arrayContaining([
        {
          evidenceType: "category",
          clinicalPresentationKey: "cp-abdominal-pain",
          categoryKey: "cat-inflammatory",
        },
        {
          evidenceType: "feature",
          clinicalPresentationKey: "cp-abdominal-pain",
          featureKey: "feature-rlq-tenderness",
        },
      ]),
    );

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
