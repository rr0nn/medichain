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
 * This agent is intentionally heuristic-first so the routing behavior is
 * predictable, easy to test, and aligned with the Jira acceptance criteria.
 * 
 * @param differentials Ranked differential diagnoses from the DDX workflow.
 * @returns Critic assessment describing whether the result is confident enough.
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

  // Measure how clearly the leading diagnosis seperates from the runner-up.
  const scoreGapToSecond =
    secondDifferential === undefined
      ? null
      : topDifferential.score - secondDifferential.score;
  
  const reasons: string[] = [];
  
  // If the top result is weakly scored, we should gather more information first.
  if (topDifferential.score < 0.7) {
    reasons.push("The top differential score is below the confidence threshold.");
  }

  // If there is only one path or no path to the top differential, more information is
  // requested.
  if (topDifferential.evidence.length <= 1) {
    reasons.push(
      "The top differential is supported by only one or zero evidence paths."
    );
  }

  // If the top two candidates are very close, the differential remains ambiguous.
  if (scoreGapToSecond !== null && scoreGapToSecond < 0.08) {
    reasons.push(
      "The top two differential diagnoses are too close in score to separate confidentally."
    );
  }

  // A confident result must pass all of the above checks.
  const isConfident = reasons.length === 0;

  return {
    isConfident,
    shouldReturnToInterview: !isConfident,
    confidenceLabel: isConfident ? "high" : "low",
    reasons,
    topDifferentialScore: topDifferential.score,
    topDifferentialEvidenceCount: topDifferential.evidence.length,
    scoreGapToSecond,
  };
}