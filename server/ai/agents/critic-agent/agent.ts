import type { DifferentialDiagnosis } from "@/server/ai/workflows/ddx-workflow/types";

export type CriticAssessment = {
  isConfident: boolean;
  shouldReturnToInterview: boolean;
  confidenceLabel: "low" | "medium" | "high";
  reasons: string[];
  topDifferentialScore: number | null;
  topDifferentialEvidenceCount: number;
  scoreGapToSecond: number | null;
};

/**
 * Reviews the ranked differential list and decides whether the workflow should
 * continue to the interviewer for more history gathering.
 * 
 * This critic is heuristic-first so the routing behaviour is predictable,
 * easy to test, and directly aligned with the Jira acceptance criteria.
 * 
 * @param differentials Ranked differential diagnoses from the DDX workflow.
 * @returns Assessment describing whether the result is confident enough.
 */
export function reviewDifferentialConfidence(
  differentials: DifferentialDiagnosis[],
): CriticAssessment {
  // If no differentials were produced at all, the workflow is clearly not ready
  // to stop and should gather more information from the user.

  if (differentials.length === 0) {

    return {
      isConfident: false,
      shouldReturnToInterview: true,
      confidenceLabel: "low",
      reasons: [
        "No differential diagnoses were returned from the knowledge graph.",
      ],
      topDifferentialScore: null,
      topDifferentialEvidenceCount: 0,
      scoreGapToSecond: null,
    };
  }

  const topDifferential = differentials[0];
  const secondDifferential = differentials[1];

  // Measure how clearly the leading diagnosis separates from the runner-up.
  const scoreGapToSecond = 
    secondDifferential === undefined
      ? null
      : topDifferential.score - secondDifferential.score;

  const reasons: string[] = [];

  // Jira acceptance criterion:
  // if there is only one path or no path to the top differential,
  // the interviewer should ask for more information.
  if (topDifferential.evidence.length <= 1) {
    reasons.push(
      "The top differential is supported by only one or zero evidence paths.",
    );
  }

  // If the leading score is still weak, the system should not present the result
  // as if it is stable.
  if (topDifferential.score < 0.72) {
    reasons.push("The top differential score is below the confidence threshold.");
  }

  // If the top two candidates are very close, the differential remains ambiguous.
  if (scoreGapToSecond !== null && scoreGapToSecond < 0.08) {
    reasons.push(
      "The top two differential diagnoses are too close in score to separate confidently.",
    );
  }

  const isConfident = reasons.length === 0;

  return {
    isConfident,
    shouldReturnToInterview: !isConfident,
    confidenceLabel: isConfident
      ? "high"
      : differentials.length > 0
        ? "medium"
        : "low",
    reasons,
    topDifferentialScore: topDifferential.score,
    topDifferentialEvidenceCount: topDifferential.evidence.length,
    scoreGapToSecond,
  };
}