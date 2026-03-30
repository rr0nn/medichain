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
} from "./types";

export type WorkflowStepName =
  | "match_presentations"
  | "match_categories"
  | "match_features"
  | "fetch_diagnoses"
  | "group_diagnoses";

export type WorkflowStepEvent = {
  type: "step";
  step: WorkflowStepName;
  status: "running" | "complete";
};

type OnStep = (event: WorkflowStepEvent) => void;

/**
 * Aggregates raw diagnosis rows into unique diagnoses and ranks them using the
 * strongest supporting presentation/category match path.
 *
 * @param diagnoses Raw diagnosis rows returned from the knowledge graph.
 * @param cpMatches Clinical presentation matches scored from the patient description.
 * @param categoryMatches Category matches scored within each matched presentation.
 * @returns A ranked list of diagnoses with deduplicated evidence references.
 */
function groupDiagnoses(
  diagnoses: DiagnosisRecord[],
  cpMatches: ClinicalPresentationMatch[],
  categoryMatches: CategoryMatch[],
  featureMatches: FeatureMatch[]
): DifferentialDiagnosis[] {
  // Merge raw diagnosis rows from the knowledge graph into unique diagnosis entries.
  // Each entry keeps the strongest score plus every supporting category or feature path.
  const diagnosisMap = new Map<
    string,
    DifferentialDiagnosis & {
      supportPathKeys: Set<string>;
      strongestScore: number;
    }
  >();

  for (const row of diagnoses) {
    // Look up the presentation match and the corresponding category/feature match
    // so this diagnosis path can inherit the confidence assigned upstream.
    const clinicalPresentationMatch = cpMatches.find(
      (match) => match.key === row.clinicalPresentationKey
    );
    const evidenceMatch =
      row.evidenceType === "category"
        ? categoryMatches.find(
            (match) =>
              match.clinicalPresentationKey === row.clinicalPresentationKey &&
              match.categoryKey === row.categoryKey
          )
        : featureMatches.find(
            (match) =>
              match.clinicalPresentationKey === row.clinicalPresentationKey &&
              match.featureKey === row.featureKey
          );

    // Blend the broad presentation match with the more specific evidence match.
    const combinedScore =
      ((clinicalPresentationMatch?.score ?? 0) + (evidenceMatch?.score ?? 0)) /
      2;
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
        strongestScore: combinedScore,
        supportPathKeys: new Set([supportPathKey]),
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
    // Rank the diagnosis by its strongest supporting path, then give a small
    // bonus when multiple distinct graph paths converge on the same diagnosis.
    existing.strongestScore = Math.max(existing.strongestScore, combinedScore);
    existing.supportPathKeys.add(supportPathKey);
    const supportBoost = Math.min(0.15, 0.05 * (existing.supportPathKeys.size - 1));
    existing.score = Math.min(1, existing.strongestScore + supportBoost);

    const alreadyHasEvidence = existing.evidence.some(
      (evidenceRef) =>
        evidenceRef.evidenceType === row.evidenceType &&
        evidenceRef.clinicalPresentationKey === row.clinicalPresentationKey &&
        evidenceRef.categoryKey === row.categoryKey &&
        evidenceRef.featureKey === row.featureKey
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
    .map((diagnosis) => ({
      diagnosisKey: diagnosis.diagnosisKey,
      diagnosisName: diagnosis.diagnosisName,
      score: diagnosis.score,
      evidence: diagnosis.evidence,
    }))
    .sort((a, b) => b.score - a.score);
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
  onStep?: OnStep
): Promise<DifferentialDiagnosisWorkflowResult> {
  // Start with every known clinical presentation that could anchor the patient's complaint.
  onStep?.({ type: "step", step: "match_presentations", status: "running" });
  const clinicalPresentations = await getClinicalPresentations();

  // Match the patient's free-text description to the closest clinical presentations.
  const clinicalPresentationResult = await matchClinicalPresentations(
    patientDescription,
    clinicalPresentations
  );
  onStep?.({ type: "step", step: "match_presentations", status: "complete" });

  // Keep only high-confidence and top-N matched clinical presentations to limit noise and downstream cost.
  const matchedClinicalPresentations = clinicalPresentationResult.matches
    .filter((match) => match.score >= 0.6)
    .slice(0, 3)
    .map((match) => {
      const presentation = clinicalPresentations.find(
        (candidate) => candidate.key === match.key
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
      matchedClinicalPresentations.map((match) => match.key)
    ),
    getFeaturesForClinicalPresentations(
      matchedClinicalPresentations.map((match) => match.key)
    ),
  ]);

  const matchedCategories: CategoryMatch[] = [];
  const matchedFeatures: FeatureMatch[] = [];

  // For each matched clinical presentation, ask the category matcher agent
  // which etiologic buckets best fit this presentation and case text.
  for (const clinicalPresentationMatch of matchedClinicalPresentations) {
    const presentationCategories = categories.filter(
      (category) =>
        category.clinicalPresentationKey === clinicalPresentationMatch.key
    );

    const presentation = clinicalPresentations.find(
      (candidate) => candidate.key === clinicalPresentationMatch.key
    );

    if (!presentation) {
      continue;
    }

    if (presentationCategories.length > 0) {
      // Score categories within each matched presentation independently.
      const categoryResult = await matchCategories(
        patientDescription,
        { key: presentation.key, name: presentation.name },
        presentationCategories
      );

      for (const categoryMatch of categoryResult.matches.filter(
        (match) => match.score >= 0.55
      )) {
        // Keep only confident category matches and tie them back to their parent presentation.
        matchedCategories.push({
          clinicalPresentationKey: clinicalPresentationMatch.key,
          categoryKey: categoryMatch.key,
          categoryName:
            presentationCategories.find(
              (category) => category.categoryKey === categoryMatch.key
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
        feature.clinicalPresentationKey === clinicalPresentationMatch.key
    );

    // If this presentation has no feature nodes, it can still contribute via categories.
    if (presentationFeatures.length === 0) {
      continue;
    }

    const presentation = clinicalPresentations.find(
      (candidate) => candidate.key === clinicalPresentationMatch.key
    );

    if (!presentation) {
      continue;
    }

    // Ask the feature matcher agent which specific symptoms/signs/descriptors
    // from this presentation are expressed in the patient description.
    const featureResult = await matchFeatures(
      patientDescription,
      { key: presentation.key, name: presentation.name },
      presentationFeatures
    );

    for (const featureMatch of featureResult.matches.filter(
      (match) => match.score >= 0.55
    )) {
      // Keep only confident feature matches and tie them back to their parent presentation.
      matchedFeatures.push({
        clinicalPresentationKey: clinicalPresentationMatch.key,
        featureKey: featureMatch.key,
        featureName:
          presentationFeatures.find(
            (feature) => feature.featureKey === featureMatch.key
          )?.featureName ?? featureMatch.key,
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
        }))
      ),
      getDiagnosesForFeaturePairs(
        matchedFeatures.map((match) => ({
          clinicalPresentationKey: match.clinicalPresentationKey,
          featureKey: match.featureKey,
        }))
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
    matchedFeatures
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
