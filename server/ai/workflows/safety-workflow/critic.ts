import type { DifferentialDiagnosis } from "@/server/ai/workflows/ddx-workflow/types";

import type { CriticAssessment } from "./types";

/**
 * Reviews the ranked differential list and decides whether the workflow should
 * continue to the interviewer for more history gathering.
 *
 * This critic is heuristic-first so the routing behaviour is predictable,
 * easy to test, and directly aligned with the workflow's acceptance criteria.
 *
 * @param differentials Ranked differential diagnoses from the DDX workflow.
 * @returns Assessment describing whether the result is confident enough.
 */
export function reviewDifferentialConfidence(
  differentials: DifferentialDiagnosis[]
): CriticAssessment {
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

  const scoreGapToSecond =
    secondDifferential === undefined
      ? null
      : topDifferential.score - secondDifferential.score;

  const reasons: string[] = [];

  if (topDifferential.evidence.length <= 1) {
    reasons.push(
      "The top differential is supported by only one or zero evidence paths."
    );
  }

  if (topDifferential.score < 0.72) {
    reasons.push(
      "The top differential score is below the confidence threshold."
    );
  }

  if (scoreGapToSecond !== null && scoreGapToSecond < 0.08) {
    reasons.push(
      "The top two differential diagnoses are too close in score to separate confidently."
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
