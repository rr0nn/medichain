/**
 * @fileoverview Defines the result and assessment types used by the safety workflow.
 * @contributors Johnson Zhang
 */

import type { DifferentialDiagnosisWorkflowResult } from "@/server/ai/workflows/ddx-workflow/types";
import type { FeatureRecord } from "@/server/ai/tools/knowledge-graph/types";

export type CriticAssessment = {
  isConfident: boolean;
  shouldReturnToInterview: boolean;
  confidenceLabel: "low" | "medium" | "high";
  reasons: string[];
  topDifferentialScore: number | null;
  topDifferentialEvidenceCount: number;
  scoreGapToSecond: number | null;
};

export type ConsultationStatus =
  | "ready_for_review"
  | "needs_more_information";

export type GroundingAssessment = {
  isGrounded: boolean;
  reasons: string[];
  groundedDifferentialCount: number;
  ungroundedDifferentialCount: number;
  topDiagnosisHasGroundedEvidence: boolean;
  topDiagnosisHasFeatureEvidence: boolean;
};

export type SafetyWorkflowResult = DifferentialDiagnosisWorkflowResult & {
  status: ConsultationStatus;
  criticAssessment: CriticAssessment;
  groundingAssessment: GroundingAssessment;
  candidateFeatures: FeatureRecord[];
};
