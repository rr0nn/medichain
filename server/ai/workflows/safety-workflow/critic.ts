/**
 * @fileoverview Evaluates confidence signals for a generated differential diagnosis result.
 * @contributors Johnson Zhang, John Kollannur
 */

import type { DifferentialDiagnosis } from "@/server/ai/workflows/ddx-workflow/types";

import type { CriticAssessment } from "./types";

/**
 * Reviews the ranked differential list and decides whether the workflow should
 * continue to the interviewer for more history gathering.
 *
 * This critic is heuristic-first so the routing behaviour is predictable,
 * easy to test, and pragmatic for a small example knowledge graph.
 *
 * Current project rule:
 * - ask follow-up questions only when no differentials are returned, or when
 *   the top differential score is below the confidence threshold
 *
 * Stricter criteria that can be reintroduced later if graph coverage improves:
 * - require more than one supporting evidence path for the top differential
 * - require a minimum score gap from the second-ranked differential
 * - require feature-backed evidence for specific high-risk presentations
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

  if (topDifferential.score < 0.6) {
    reasons.push(
      "The top differential score is below the confidence threshold."
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
