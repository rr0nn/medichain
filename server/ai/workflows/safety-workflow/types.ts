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

export type SafetyWorkflowResult = DifferentialDiagnosisWorkflowResult & {
  status: ConsultationStatus;
  criticAssessment: CriticAssessment;
  candidateFeatures: FeatureRecord[];
};
