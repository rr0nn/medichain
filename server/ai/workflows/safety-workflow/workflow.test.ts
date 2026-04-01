import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockRunDifferentialDiagnosisWorkflow: vi.fn(),
  mockGetFeaturesForClinicalPresentations: vi.fn(),
  mockRunInterviewerAgent: vi.fn(),
}));

vi.mock("@/server/ai/workflows/ddx-workflow/workflow", () => ({
  runDifferentialDiagnosisWorkflow: mocks.mockRunDifferentialDiagnosisWorkflow,
}));

vi.mock("@/server/ai/tools/knowledge-graph/knowledge-graph", () => ({
  getFeaturesForClinicalPresentations:
    mocks.mockGetFeaturesForClinicalPresentations,
}));

vi.mock("@/server/ai/agents/interviewer-agent/agent", () => ({
  runInterviewerAgent: mocks.mockRunInterviewerAgent,
}));

import { runSafetyWorkflow } from "./workflow";

describe("runSafetyWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRunInterviewerAgent.mockResolvedValue([
      {
        id: "follow-up-1",
        question: "When did the pain start?",
        reason: "Clarifies onset.",
      },
    ]);
  });

  it("returns ready_for_review when the differential is confident", async () => {
    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [
        { key: "cp-fever", name: "Fever", score: 0.9, matchedText: ["fever"] },
      ],
      matchedCategories: [],
      matchedFeatures: [],
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
    expect(result.followUpQuestions).toEqual([]);
    expect(mocks.mockGetFeaturesForClinicalPresentations).not.toHaveBeenCalled();
  });

  it("routes to needs_more_information when the differential is weak", async () => {
    mocks.mockRunDifferentialDiagnosisWorkflow.mockResolvedValue({
      matchedClinicalPresentations: [
        { key: "cp-fever", name: "Fever", score: 0.9, matchedText: ["fever"] },
      ],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [
        {
          diagnosisKey: "dx-flu",
          diagnosisName: "Influenza",
          score: 0.7,
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
          score: 0.66,
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
    expect(result.followUpQuestions).toEqual([
      {
        id: "follow-up-1",
        question: "When did the pain start?",
        reason: "Clarifies onset.",
      },
    ]);
    expect(mocks.mockGetFeaturesForClinicalPresentations).toHaveBeenCalledWith([
      "cp-fever",
    ]);
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
      { type: "step", step: "critic_review", status: "running" },
      { type: "step", step: "critic_review", status: "complete" },
      { type: "step", step: "build_follow_up_questions", status: "running" },
      { type: "step", step: "build_follow_up_questions", status: "complete" },
    ]);
  });
});
