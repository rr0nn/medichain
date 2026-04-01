import { runInterviewerAgent } from "@/server/ai/agents/interviewer-agent/agent";
import type { FeatureRecord } from "@/server/ai/tools/knowledge-graph/types";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  FeatureMatch,
  WorkflowStepEvent,
} from "@/server/ai/workflows/ddx-workflow/types";

import type { CriticAssessment, SafetyWorkflowResult } from "./types";

type OnStep = (event: WorkflowStepEvent) => void;

/**
 * Builds a low-confidence workflow result by running the interviewer and
 * attaching follow-up questions needed to improve the differential.
 */
export async function buildNeedsMoreInformationResult(
  patientDescription: string,
  matchedClinicalPresentations: ClinicalPresentationMatch[],
  matchedCategories: CategoryMatch[],
  matchedFeatures: FeatureMatch[],
  candidateFeatures: FeatureRecord[],
  differentials: DifferentialDiagnosis[],
  criticAssessment: CriticAssessment,
  onStep?: OnStep
): Promise<SafetyWorkflowResult> {
  onStep?.({
    type: "step",
    step: "build_follow_up_questions",
    status: "running",
  });

  const followUpQuestions = await runInterviewerAgent({
    patientDescription,
    matchedClinicalPresentations,
    matchedCategories,
    differentials,
    candidateFeatures,
    criticAssessment,
  });

  onStep?.({
    type: "step",
    step: "build_follow_up_questions",
    status: "complete",
  });

  return {
    matchedClinicalPresentations,
    matchedCategories,
    matchedFeatures,
    differentials,
    status: "needs_more_information",
    criticAssessment,
    followUpQuestions,
  };
}
