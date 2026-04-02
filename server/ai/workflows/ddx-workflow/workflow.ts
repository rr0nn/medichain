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
  DifferentialDiagnosis,
  DifferentialDiagnosisWorkflowResult,
  FeatureMatch,
  WorkflowStepEvent,
} from "./types";
import { rankDifferentialDiagnoses } from "./diagnosis-ranking";

type OnStep = (event: WorkflowStepEvent) => void;

function completeRemainingSteps(
  steps: WorkflowStepEvent["step"][],
  onStep?: OnStep,
) {
  for (const step of steps) {
    onStep?.({ type: "step", step, status: "complete" });
  }
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
    completeRemainingSteps(
      [
        "match_categories",
        "match_features",
        "fetch_diagnoses",
        "group_diagnoses",
      ],
      onStep,
    );

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
    completeRemainingSteps(["fetch_diagnoses", "group_diagnoses"], onStep);

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
  const differentials: DifferentialDiagnosis[] = rankDifferentialDiagnoses(
    diagnosisRecords,
    matchedClinicalPresentations,
    matchedCategories,
    matchedFeatures,
  );
  onStep?.({ type: "step", step: "group_diagnoses", status: "complete" });

  return {
    matchedClinicalPresentations,
    matchedCategories,
    matchedFeatures,
    differentials,
  };
}
