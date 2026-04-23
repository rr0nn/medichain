/**
 * @fileoverview Scores and ranks candidate differentials using matched graph evidence.
 * @contributors Johnson Zhang
 */

import type { DiagnosisRecord } from "@/server/ai/tools/knowledge-graph/types";

import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  FeatureMatch,
} from "./types";

/**
 * Clamps a numeric score into the closed interval [0, 1].
 */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

/**
 * Aggregates raw diagnosis rows into unique diagnoses and ranks them using the
 * combined strength and diversity of supporting graph paths.
 */
export function rankDifferentialDiagnoses(
  diagnoses: DiagnosisRecord[],
  cpMatches: ClinicalPresentationMatch[],
  categoryMatches: CategoryMatch[],
  featureMatches: FeatureMatch[]
): DifferentialDiagnosis[] {
  type EvidenceType = "category" | "feature";

  type SupportPath = {
    evidenceType: EvidenceType;
    score: number;
    clinicalPresentationKey: string;
    categoryKey?: string;
    featureKey?: string;
  };

  type DiagnosisAccumulator = DifferentialDiagnosis & {
    supportPaths: Map<string, SupportPath>;
  };

  // Index upstream matches once so diagnosis aggregation can stay predictable
  // even as the graph and evidence sets grow.
  const cpMatchMap = new Map(
    cpMatches.map((match) => [match.key, match] as const)
  );

  const categoryMatchMap = new Map(
    categoryMatches.map(
      (match) =>
        [
          `${match.clinicalPresentationKey}::${match.categoryKey}`,
          match,
        ] as const
    )
  );

  const featureMatchMap = new Map(
    featureMatches.map(
      (match) =>
        [
          `${match.clinicalPresentationKey}::${match.featureKey}`,
          match,
        ] as const
    )
  );

  // Merge raw graph rows into unique diagnoses while preserving distinct support
  // paths so ranking can reflect both strength and evidence convergence.
  const diagnosisMap = new Map<string, DiagnosisAccumulator>();

  for (const row of diagnoses) {
    const clinicalPresentationMatch = cpMatchMap.get(
      row.clinicalPresentationKey
    );

    const evidenceMatch =
      row.evidenceType === "category"
        ? categoryMatchMap.get(
            `${row.clinicalPresentationKey}::${row.categoryKey ?? ""}`
          )
        : featureMatchMap.get(
            `${row.clinicalPresentationKey}::${row.featureKey ?? ""}`
          );

    if (!clinicalPresentationMatch || !evidenceMatch) {
      continue;
    }

    // Blend the broad presentation match with the narrower evidence match.
    // Feature evidence carries more specific signal than category evidence, so
    // it gets a stronger weight in the combined path score.
    const cpScore = clamp01(clinicalPresentationMatch.score);
    const evidenceScore = clamp01(evidenceMatch.score);

    const combinedScore =
      row.evidenceType === "feature"
        ? clamp01(evidenceScore * 0.8 + cpScore * 0.2)
        : clamp01(evidenceScore * 0.65 + cpScore * 0.35);

    if (combinedScore < 0.05) {
      continue;
    }

    const supportPathKey =
      row.evidenceType === "category"
        ? `${row.clinicalPresentationKey}:category:${row.categoryKey ?? ""}`
        : `${row.clinicalPresentationKey}:feature:${row.featureKey ?? ""}`;

    if (!diagnosisMap.has(row.diagnosisKey)) {
      diagnosisMap.set(row.diagnosisKey, {
        diagnosisKey: row.diagnosisKey,
        diagnosisName: row.diagnosisName,
        score: combinedScore,
        supportPaths: new Map([
          [
            supportPathKey,
            {
              evidenceType: row.evidenceType,
              score: combinedScore,
              clinicalPresentationKey: row.clinicalPresentationKey,
              categoryKey: row.categoryKey,
              featureKey: row.featureKey,
            },
          ],
        ]),
        evidence: [
          {
            evidenceType: row.evidenceType,
            clinicalPresentationKey: row.clinicalPresentationKey,
            categoryKey: row.categoryKey,
            featureKey: row.featureKey,
          },
        ],
      });
      continue;
    }

    const existing = diagnosisMap.get(row.diagnosisKey)!;

    const previousSupportPath = existing.supportPaths.get(supportPathKey);
    if (!previousSupportPath || combinedScore > previousSupportPath.score) {
      existing.supportPaths.set(supportPathKey, {
        evidenceType: row.evidenceType,
        score: combinedScore,
        clinicalPresentationKey: row.clinicalPresentationKey,
        categoryKey: row.categoryKey,
        featureKey: row.featureKey,
      });
    }

    const alreadyHasEvidence = existing.evidence.some(
      (evidenceRef) =>
        evidenceRef.evidenceType === row.evidenceType &&
        evidenceRef.clinicalPresentationKey === row.clinicalPresentationKey &&
        evidenceRef.categoryKey === row.categoryKey &&
        evidenceRef.featureKey === row.featureKey
    );

    if (!alreadyHasEvidence) {
      existing.evidence.push({
        evidenceType: row.evidenceType,
        clinicalPresentationKey: row.clinicalPresentationKey,
        categoryKey: row.categoryKey,
        featureKey: row.featureKey,
      });
    }
  }

  return Array.from(diagnosisMap.values())
    .map((diagnosis) => {
      const supportPaths = Array.from(diagnosis.supportPaths.values());

      const featurePaths = supportPaths
        .filter((path) => path.evidenceType === "feature")
        .sort((a, b) => b.score - a.score);

      const categoryPaths = supportPaths
        .filter((path) => path.evidenceType === "category")
        .sort((a, b) => b.score - a.score);

      const bestFeaturePathScore = featurePaths[0]?.score;
      const bestCategoryPathScore = categoryPaths[0]?.score;

      // Ranking priority:
      // 1. Feature-backed support dominates when present.
      // 2. Category support can modestly reinforce feature-backed diagnoses.
      // 3. Additional distinct paths contribute discounted bonuses only.
      const baseScore =
        bestFeaturePathScore ?? bestCategoryPathScore ?? diagnosis.score;

      const additionalFeatureBonus = featurePaths
        .slice(1)
        .reduce((sum, path) => sum + path.score * 0.12, 0);

      const categorySupportBonus =
        bestFeaturePathScore !== undefined &&
        bestCategoryPathScore !== undefined
          ? bestCategoryPathScore * 0.12
          : 0;

      const additionalCategoryBonus = categoryPaths
        .slice(1)
        .reduce((sum, path) => sum + path.score * 0.05, 0);

      const crossPresentationCount = new Set(
        supportPaths.map((path) => path.clinicalPresentationKey)
      ).size;

      const crossPresentationBonus =
        crossPresentationCount > 1
          ? Math.min(0.06, 0.02 * (crossPresentationCount - 1))
          : 0;

      // Cap the final score at 1.0 because this is a bounded ranking signal,
      // not a calibrated clinical probability.
      return {
        diagnosisKey: diagnosis.diagnosisKey,
        diagnosisName: diagnosis.diagnosisName,
        score: clamp01(
          baseScore +
            additionalFeatureBonus +
            categorySupportBonus +
            additionalCategoryBonus +
            crossPresentationBonus
        ),
        evidence: diagnosis.evidence,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Break ties by preferring diagnoses supported by more distinct paths.
      return b.evidence.length - a.evidence.length;
    });
}
