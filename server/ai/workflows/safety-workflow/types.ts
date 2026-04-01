import type { DifferentialDiagnosisWorkflowResult } from "@/server/ai/workflows/ddx-workflow/types";

export type CriticAssessment = {
  isConfident: boolean;
  shouldReturnToInterview: boolean;
  confidenceLabel: "low" | "medium" | "high";
  reasons: string[];
  topDifferentialScore: number | null;
  topDifferentialEvidenceCount: number;
  scoreGapToSecond: number | null;
};

export type FollowUpQuestion = {
  id: string;
  question: string;
  reason: string;
};

export type ConsultationStatus =
  | "ready_for_review"
  | "needs_more_information";

export type SafetyWorkflowResult = DifferentialDiagnosisWorkflowResult & {
  status: ConsultationStatus;
  criticAssessment: CriticAssessment;
  followUpQuestions: FollowUpQuestion[];
};
