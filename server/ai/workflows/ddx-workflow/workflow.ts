import { matchCategories } from "@/server/ai/agents/category-matcher-agent/agent";
import { matchClinicalPresentations } from "@/server/ai/agents/clinical-presentation-matcher-agent/agent";
import { matchFeatures } from "@/server/ai/agents/feature-matcher-agent/agent";
import type { DiagnosisRecord } from "@/server/ai/tools/knowledge-graph/types";
import {
  getCategoriesForClinicalPresentations,
  getClinicalPresentations,
  getDiagnosesForFeaturePairs,
  getDiagnosesForPairs,
  getFeaturesForClinicalPresentations,
} from "@/server/ai/tools/knowledge-graph/knowledge-graph";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  DifferentialDiagnosisWorkflowResult,
  FeatureMatch,
  WorkflowStepEvent,
} from "./types";

type OnStep = (event: WorkflowStepEvent) => void;

/**
 * Clamps a numeric score into the closed interval [0, 1].
 *
 * @param value Score candidate.
 * @returns A bounded score suitable for ranking.
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
 *
 * @param diagnoses Raw diagnosis rows returned from the knowledge graph.
 * @param cpMatches Clinical presentation matches scored from the patient description.
 * @param categoryMatches Category matches scored within each matched presentation.
 * @param featureMatches Feature matches scored within each matched presentation.
 * @returns A ranked list of diagnoses with deduplicated evidence references.
 */
function groupDiagnoses(
  diagnoses: DiagnosisRecord[],
  cpMatches: ClinicalPresentationMatch[],
  categoryMatches: CategoryMatch[],
  featureMatches: FeatureMatch[],
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

  // Index upstream matches once so diagnosis aggregation does not repeatedly scan
  // the same arrays. This keeps lookup predictable and efficient as the graph grows.
  const cpMatchMap = new Map(
    cpMatches.map((match) => [match.key, match] as const),
  );

  const categoryMatchMap = new Map(
    categoryMatches.map(
      (match) =>
        [
          `${match.clinicalPresentationKey}::${match.categoryKey}`,
          match,
        ] as const,
    ),
  );

  const featureMatchMap = new Map(
    featureMatches.map(
      (match) =>
        [
          `${match.clinicalPresentationKey}::${match.featureKey}`,
          match,
        ] as const,
    ),
  );

  // Merge raw diagnosis rows from the knowledge graph into unique diagnosis entries.
  // Each entry keeps the distinct supporting paths so ranking can reflect both
  // path strength and how much independent evidence converges on the diagnosis.
  const diagnosisMap = new Map<string, DiagnosisAccumulator>();

  for (const row of diagnoses) {
    // Look up the presentation match and the corresponding category/feature match
    // so this diagnosis path can inherit the confidence assigned upstream.
    const clinicalPresentationMatch = cpMatchMap.get(
      row.clinicalPresentationKey,
    );

    const evidenceMatch =
      row.evidenceType === "category"
        ? categoryMatchMap.get(
            `${row.clinicalPresentationKey}::${row.categoryKey ?? ""}`,
          )
        : featureMatchMap.get(
            `${row.clinicalPresentationKey}::${row.featureKey ?? ""}`,
          );

    // Skip orphaned graph rows that no longer have a matched presentation/evidence
    // context. This prevents weak or stale rows from silently entering the ranking.
    if (!clinicalPresentationMatch || !evidenceMatch) {
      continue;
    }

    // Blend the broad presentation match with the more specific evidence match.
    // Feature evidence is more specific than category evidence, so it gets a
    // stronger weight in the combined path score.
    const cpScore = clamp01(clinicalPresentationMatch.score);
    const evidenceScore = clamp01(evidenceMatch.score);

    const combinedScore =
      row.evidenceType === "feature"
        ? clamp01(evidenceScore * 0.8 + cpScore * 0.2)
        : clamp01(evidenceScore * 0.65 + cpScore * 0.35);

    // Ignore extremely weak paths so they do not add noise to the final diagnosis list.
    if (combinedScore < 0.05) {
      continue;
    }

    const supportPathKey =
      row.evidenceType === "category"
        ? `${row.clinicalPresentationKey}:category:${row.categoryKey ?? ""}`
        : `${row.clinicalPresentationKey}:feature:${row.featureKey ?? ""}`;

    if (!diagnosisMap.has(row.diagnosisKey)) {
      // Seed the diagnosis entry the first time we encounter it.
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

    // Preserve the best score for each distinct path, then recompute a diagnosis-level score.
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
        evidenceRef.featureKey === row.featureKey,
    );

    if (!alreadyHasEvidence) {
      // Preserve distinct supporting routes so downstream explanation can say
      // whether the diagnosis was supported by a category path, feature path, or both.
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
      // 1. Feature evidence is dominant and sets the main diagnosis score.
      // 2. Category support is secondary and can modestly lift a feature-backed diagnosis.
      // 3. Additional distinct feature/category paths are discounted bonuses only.
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
        supportPaths.map((path) => path.clinicalPresentationKey),
      ).size;

      const crossPresentationBonus =
        crossPresentationCount > 1
          ? Math.min(0.06, 0.02 * (crossPresentationCount - 1))
          : 0;

      // Final diagnosis score =
      // dominant feature-backed support when present, otherwise strongest category support
      // + discounted bonuses for additional feature/category support
      // + a small bonus when evidence converges from multiple clinical presentations
      // The result is capped at 1.0 because this is a bounded ranking score,
      // not a calibrated probability.
      return {
        diagnosisKey: diagnosis.diagnosisKey,
        diagnosisName: diagnosis.diagnosisName,
        score: clamp01(
          baseScore +
            additionalFeatureBonus +
            categorySupportBonus +
            additionalCategoryBonus +
            crossPresentationBonus,
        ),
        evidence: diagnosis.evidence,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Stabilize ranking when scores tie by preferring diagnoses with more
      // distinct supporting evidence routes.
      return b.evidence.length - a.evidence.length;
    });
}

/**
 * Runs the differential diagnosis workflow from free-text patient description
 * through: clinical presentation matching -> category/feature matching -> diagnosis ranking -> final output.
 *
 * @param patientDescription Free-text summary of the patient's presentation.
 * @returns The intermediate presentation/category matches and final ranked differentials.
 */
export async function runDifferentialDiagnosisWorkflow(
  patientDescription: string,
  onStep?: OnStep,
): Promise<DifferentialDiagnosisWorkflowResult> {
  // Start with every known clinical presentation that could anchor the patient's complaint.
  onStep?.({ type: "step", step: "match_presentations", status: "running" });
  const clinicalPresentations = await getClinicalPresentations();

  // Match the patient's free-text description to the closest clinical presentations.
  const clinicalPresentationResult = await matchClinicalPresentations(
    patientDescription,
    clinicalPresentations,
  );
  onStep?.({ type: "step", step: "match_presentations", status: "complete" });

  // Keep only high-confidence and top-N matched clinical presentations to limit noise and downstream cost.
  const matchedClinicalPresentations = clinicalPresentationResult.matches
    .filter((match) => match.score >= 0.6)
    .slice(0, 3)
    .map((match) => {
      const presentation = clinicalPresentations.find(
        (candidate) => candidate.key === match.key,
      );

      return {
        key: match.key,
        name: presentation?.name ?? match.key,
        score: match.score,
        matchedText: match.matchedText,
      };
    });

  // If no matches at the clinical presentation level, stop before category lookup.
  if (matchedClinicalPresentations.length === 0) {
    return {
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
    };
  }

  // Load the graph branches associated with the shortlisted clinical presentations.
  onStep?.({ type: "step", step: "match_categories", status: "running" });
  const [categories, features] = await Promise.all([
    getCategoriesForClinicalPresentations(
      matchedClinicalPresentations.map((match) => match.key),
    ),
    getFeaturesForClinicalPresentations(
      matchedClinicalPresentations.map((match) => match.key),
    ),
  ]);

  const matchedCategories: CategoryMatch[] = [];
  const matchedFeatures: FeatureMatch[] = [];

  // For each matched clinical presentation, ask the category matcher agent
  // which etiologic buckets best fit this presentation and case text.
  for (const clinicalPresentationMatch of matchedClinicalPresentations) {
    const presentationCategories = categories.filter(
      (category) =>
        category.clinicalPresentationKey === clinicalPresentationMatch.key,
    );

    const presentation = clinicalPresentations.find(
      (candidate) => candidate.key === clinicalPresentationMatch.key,
    );

    if (!presentation) {
      continue;
    }

    if (presentationCategories.length > 0) {
      // Score categories within each matched presentation independently.
      const categoryResult = await matchCategories(
        patientDescription,
        { key: presentation.key, name: presentation.name },
        presentationCategories,
      );

      for (const categoryMatch of categoryResult.matches.filter(
        (match) => match.score >= 0.55,
      )) {
        // Keep only confident category matches and tie them back to their parent presentation.
        matchedCategories.push({
          clinicalPresentationKey: clinicalPresentationMatch.key,
          categoryKey: categoryMatch.key,
          categoryName:
            presentationCategories.find(
              (category) => category.categoryKey === categoryMatch.key,
            )?.categoryName ?? categoryMatch.key,
          score: categoryMatch.score,
          matchedText: categoryMatch.matchedText,
        });
      }
    }
  }
  onStep?.({ type: "step", step: "match_categories", status: "complete" });

  // In parallel conceptually, evaluate concrete presentation features that can
  // connect directly to diagnoses via Feature -> SUGGESTS relationships.
  onStep?.({ type: "step", step: "match_features", status: "running" });
  for (const clinicalPresentationMatch of matchedClinicalPresentations) {
    const presentationFeatures = features.filter(
      (feature) =>
        feature.clinicalPresentationKey === clinicalPresentationMatch.key,
    );

    // If this presentation has no feature nodes, it can still contribute via categories.
    if (presentationFeatures.length === 0) {
      continue;
    }

    const presentation = clinicalPresentations.find(
      (candidate) => candidate.key === clinicalPresentationMatch.key,
    );

    if (!presentation) {
      continue;
    }

    // Ask the feature matcher agent which specific symptoms/signs/descriptors
    // from this presentation are expressed in the patient description.
    const featureResult = await matchFeatures(
      patientDescription,
      { key: presentation.key, name: presentation.name },
      presentationFeatures,
    );

    for (const featureMatch of featureResult.matches.filter(
      (match) => match.score >= 0.55,
    )) {
      // Keep only confident feature matches and tie them back to their parent presentation.
      matchedFeatures.push({
        clinicalPresentationKey: clinicalPresentationMatch.key,
        featureKey: featureMatch.key,
        featureName:
          presentationFeatures.find(
            (feature) => feature.featureKey === featureMatch.key,
          )?.featureName ?? featureMatch.key,
        featureType: presentationFeatures.find(
          (feature) => feature.featureKey === featureMatch.key,
        )?.featureType,
        score: featureMatch.score,
        matchedText: featureMatch.matchedText,
      });
    }
  }
  onStep?.({ type: "step", step: "match_features", status: "complete" });

  // If neither category nor feature matching produced a confident path,
  // there is no supported route to concrete diagnoses in the graph.
  if (matchedCategories.length === 0 && matchedFeatures.length === 0) {
    return {
      matchedClinicalPresentations,
      matchedCategories: [],
      matchedFeatures: [],
      differentials: [],
    };
  }

  // Resolve both matched category paths and matched feature paths into diagnosis rows.
  onStep?.({ type: "step", step: "fetch_diagnoses", status: "running" });
  const diagnosisRecords: DiagnosisRecord[] = (
    await Promise.all([
      getDiagnosesForPairs(
        matchedCategories.map((match) => ({
          clinicalPresentationKey: match.clinicalPresentationKey,
          categoryKey: match.categoryKey,
        })),
      ),
      getDiagnosesForFeaturePairs(
        matchedFeatures.map((match) => ({
          clinicalPresentationKey: match.clinicalPresentationKey,
          featureKey: match.featureKey,
        })),
      ),
    ])
  ).flat();
  onStep?.({ type: "step", step: "fetch_diagnoses", status: "complete" });

  // Deduplicate and rank the final differential diagnoses before returning them.
  onStep?.({ type: "step", step: "group_diagnoses", status: "running" });
  const differentials: DifferentialDiagnosis[] = groupDiagnoses(
    diagnosisRecords,
    matchedClinicalPresentations,
    matchedCategories,
    matchedFeatures,
  );
  onStep?.({ type: "step", step: "group_diagnoses", status: "complete" });

  // Return both the intermediate matches and final differential list for downstream explanation.
  return {
    matchedClinicalPresentations,
    matchedCategories,
    matchedFeatures,
    differentials,
  };
}
