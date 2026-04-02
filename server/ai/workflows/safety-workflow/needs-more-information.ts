import type { FeatureRecord } from "@/server/ai/tools/knowledge-graph/types";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  FeatureMatch,
} from "@/server/ai/workflows/ddx-workflow/types";

import type {
  CriticAssessment,
  GroundingAssessment,
  SafetyWorkflowResult,
} from "./types";

/**
 * Builds the low-confidence workflow result so the interview agent can ask its
 * own follow-up questions using the full conversation context plus graph evidence.
 */
export function buildNeedsMoreInformationResult(
  matchedClinicalPresentations: ClinicalPresentationMatch[],
  matchedCategories: CategoryMatch[],
  matchedFeatures: FeatureMatch[],
  candidateFeatures: FeatureRecord[],
  differentials: DifferentialDiagnosis[],
  criticAssessment: CriticAssessment,
  groundingAssessment: GroundingAssessment,
): SafetyWorkflowResult {
  return {
    matchedClinicalPresentations,
    matchedCategories,
    matchedFeatures,
    differentials,
    status: "needs_more_information",
    criticAssessment,
    groundingAssessment,
    candidateFeatures,
  };
}
