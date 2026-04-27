/**
 * @fileoverview Orchestrates the differential diagnosis flow from matching through ranking.
 * @contributors Johnson Zhang
 */

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
  getSourcesForClinicalPresentations,
} from "@/server/ai/tools/knowledge-graph/knowledge-graph";
import type {
  CategoryMatch,
  DifferentialDiagnosis,
  DifferentialDiagnosisWorkflowResult,
  FeatureMatch,
  WorkflowStepEvent,
} from "./types";
import { rankDifferentialDiagnoses } from "./diagnosis-ranking";

export type { WorkflowStepEvent };

type OnStep = (event: WorkflowStepEvent) => void;

/**
 * Marks the remaining workflow steps as complete when the pipeline exits early.
 *
 * This keeps the UI workflow state consistent even when the graph cannot
 * support downstream matching or diagnosis resolution.
 */
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
 * through: clinical presentation matching -> category/feature matching ->
 * diagnosis ranking -> final output.
 *
 * The workflow first anchors the complaint to clinical presentations, then
 * expands those branches into categories, features, and diagnoses before
 * returning the intermediate evidence matches alongside the ranked result.
 */
export async function runDifferentialDiagnosisWorkflow(
  patientDescription: string,
  onStep?: OnStep,
  diagnosisModelId?: string,
): Promise<DifferentialDiagnosisWorkflowResult> {
  // Start with every known clinical presentation that could anchor the patient's complaint.
  onStep?.({ type: "step", step: "match_presentations", status: "running" });
  const clinicalPresentations = await getClinicalPresentations();

  // Match the patient's free-text description to the closest clinical presentations.
  const clinicalPresentationResult = await matchClinicalPresentations(
    patientDescription,
    clinicalPresentations,
    diagnosisModelId,
  );
  onStep?.({ type: "step", step: "match_presentations", status: "complete" });

  // Keep only high-confidence and top-N matched clinical presentations to limit noise and downstream cost.
  const shortlistedClinicalPresentationMatches =
    clinicalPresentationResult.matches
      .filter((match) => match.score >= 0.6)
      .slice(0, 3)
      .map((match) => ({
        key: match.key,
        score: match.score,
        matchedText: match.matchedText,
      }));

  // If no matches at the clinical presentation level, stop before category lookup.
  if (shortlistedClinicalPresentationMatches.length === 0) {
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
  const clinicalPresentationKeys = shortlistedClinicalPresentationMatches.map(
    (match) => match.key,
  );
  const [categories, features, sources] = await Promise.all([
    getCategoriesForClinicalPresentations(clinicalPresentationKeys),
    getFeaturesForClinicalPresentations(clinicalPresentationKeys),
    getSourcesForClinicalPresentations(clinicalPresentationKeys),
  ]);

  // Index source metadata by clinical presentation so the shortlisted matches
  // can carry their graph-grounded references into the returned workflow output.
  const sourcesByClinicalPresentationKey = new Map<string, typeof sources>();

  for (const source of sources) {
    const existingSources =
      sourcesByClinicalPresentationKey.get(source.clinicalPresentationKey) ??
      [];
    existingSources.push(source);
    sourcesByClinicalPresentationKey.set(
      source.clinicalPresentationKey,
      existingSources,
    );
  }

  // Rehydrate the shortlisted presentation matches with stable display names
  // and source references so downstream UI can explain which presentation
  // branches were selected and where they came from.
  const matchedClinicalPresentations =
    shortlistedClinicalPresentationMatches.map((match) => {
      const presentation = clinicalPresentations.find(
        (candidate) => candidate.key === match.key,
      );

      return {
        key: match.key,
        name: presentation?.name ?? match.key,
        score: match.score,
        matchedText: match.matchedText,
        sources: sourcesByClinicalPresentationKey.get(match.key) ?? [],
      };
    });

  // Keep category and feature evidence separate because they represent
  // different graph paths and later contribute differently to ranking.
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
        diagnosisModelId,
      );

      // Filter to category matches that are strong enough to justify a
      // downstream diagnosis lookup on that presentation branch.
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
      diagnosisModelId,
    );

    // Filter to feature matches that are strong enough to act as direct
    // evidence paths into the diagnosis graph.
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

  // Resolve both matched category paths and matched feature paths into raw
  // diagnosis rows. At this stage the workflow is converting evidence matches
  // into the candidate diagnoses they explicitly support in the graph.
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

  // Deduplicate and rank the final differential diagnoses before returning
  // them, while preserving the intermediate evidence matches for explanation.
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
