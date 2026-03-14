import { matchCategories } from "@/server/ai/agents/category-matcher-agent/agent";
import { matchClinicalPresentations } from "@/server/ai/agents/clinical-presentation-matcher-agent/agent";
import type { DiagnosisRow } from "@/server/ai/tools/diagnosis/knowledge-graph";
import {
  getCategoriesForClinicalPresentations,
  getClinicalPresentations,
  getDiagnosesForPairs,
} from "@/server/ai/tools/diagnosis/knowledge-graph";

/**
 * Aggregates raw diagnosis rows into unique diagnoses and ranks them using the
 * strongest supporting presentation/category match path.
 *
 * @param diagnoses Raw diagnosis rows returned from the knowledge graph.
 * @param cpMatches Clinical presentation matches scored from the patient description.
 * @param categoryMatches Category matches scored within each matched presentation.
 * @returns A ranked list of diagnoses with deduplicated support paths.
 */
function groupDiagnoses(
  diagnoses: DiagnosisRow[],
  cpMatches: Array<{ key: string; score: number; matchedText: string[] }>,
  categoryMatches: Array<{
    clinicalPresentationKey: string;
    categoryKey: string;
    score: number;
    matchedText: string[];
  }>
) {
  // Merge raw diagnosis rows from the knowledge graph into unique diagnosis entries.
  // Each entry keeps the strongest score plus every presentation/category path that supports it.
  const diagnosisMap = new Map<
    string,
    {
      diagnosisKey: string;
      diagnosisName: string;
      score: number;
      paths: Array<{
        clinicalPresentationKey: string;
        categoryKey: string;
      }>;
    }
  >();

  for (const row of diagnoses) {
    // Look up the scores assigned in the earlier matching stages for this graph path.
    const clinicalPresentationMatch = cpMatches.find(
      (match) => match.key === row.clinicalPresentationKey
    );
    const categoryMatch = categoryMatches.find(
      (match) =>
        match.clinicalPresentationKey === row.clinicalPresentationKey &&
        match.categoryKey === row.categoryKey
    );

    // Blend presentation and category confidence into one score for this diagnosis path.
    const combinedScore =
      ((clinicalPresentationMatch?.score ?? 0) + (categoryMatch?.score ?? 0)) /
      2;

    if (!diagnosisMap.has(row.diagnosisKey)) {
      // Seed the diagnosis entry the first time we encounter it.
      diagnosisMap.set(row.diagnosisKey, {
        diagnosisKey: row.diagnosisKey,
        diagnosisName: row.diagnosisName,
        score: combinedScore,
        paths: [
          {
            clinicalPresentationKey: row.clinicalPresentationKey,
            categoryKey: row.categoryKey,
          },
        ],
      });
      continue;
    }

    const existing = diagnosisMap.get(row.diagnosisKey)!;
    // Rank the diagnosis by its best supporting path.
    existing.score = Math.max(existing.score, combinedScore);

    const alreadyHasPath = existing.paths.some(
      (path) =>
        path.clinicalPresentationKey === row.clinicalPresentationKey &&
        path.categoryKey === row.categoryKey
    );

    if (!alreadyHasPath) {
      // Preserve distinct supporting routes so the caller can explain why it matched.
      existing.paths.push({
        clinicalPresentationKey: row.clinicalPresentationKey,
        categoryKey: row.categoryKey,
      });
    }
  }

  return Array.from(diagnosisMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Runs the differential diagnosis workflow from free-text patient description
 * through: clinical presentation matching -> category matching -> diagnosis ranking -> final output.
 *
 * @param patientDescription Free-text summary of the patient's presentation.
 * @returns The intermediate presentation/category matches and final ranked differentials.
 */
export async function runDifferentialDiagnosisWorkflow(
  patientDescription: string
) {
  // Start with every known clinical presentation that could anchor the patient's complaint.
  const clinicalPresentations = await getClinicalPresentations();

  // Match the patient's free-text description to the closest clinical presentations.
  const clinicalPresentationResult = await matchClinicalPresentations(
    patientDescription,
    clinicalPresentations
  );

  // Keep only high-confidence and top-N matched clinical presentations to limit noise and downstream cost.
  const matchedClinicalPresentations = clinicalPresentationResult.matches
    .filter((match) => match.score >= 0.6)
    .slice(0, 3);

  // If no matches at the clinical presentation level, stop before category lookup.
  if (matchedClinicalPresentations.length === 0) {
    return {
      matchedClinicalPresentations: [],
      matchedCategories: [],
      differentials: [],
    };
  }

  // Load the diagnosis categories associated with the shortlisted clinical presentations.
  const categories = await getCategoriesForClinicalPresentations(
    matchedClinicalPresentations.map((match) => match.key)
  );

  const matchedCategories: Array<{
    clinicalPresentationKey: string;
    categoryKey: string;
    score: number;
    matchedText: string[];
  }> = [];

  // For each matched clinical presentation,
  // see which diagnosis categories fit best with the patient description using the category matcher agent.
  for (const clinicalPresentationMatch of matchedClinicalPresentations) {
    // Score categories within each matched presentation independently.
    const presentationCategories = categories.filter(
      (category) =>
        category.clinicalPresentationKey === clinicalPresentationMatch.key
    );

    // For simplicity, if this presentation has no categories, it can't lead to any diagnoses, so skip it.
    // TODO: In future implementation, we could consider allowing category-less presentations to match directly to diagnoses.
    if (presentationCategories.length === 0) {
      continue;
    }

    // Look up the full clinical presentation record for this match so we can pass its name to the category matcher.
    const presentation = clinicalPresentations.find(
      (candidate) => candidate.key === clinicalPresentationMatch.key
    );

    // If the matched key no longer resolves to a source record.
    if (!presentation) {
      continue;
    }

    // Ask the category matcher agent which etiologic buckets best fit this presentation and case text.
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
        score: categoryMatch.score,
        matchedText: categoryMatch.matchedText,
      });
    }
  }

  // If no confident presentation/category pair means there is no path to concrete diagnoses.
  if (matchedCategories.length === 0) {
    return {
      matchedClinicalPresentations,
      matchedCategories: [],
      differentials: [],
    };
  }

  // Resolve the matched presentation/category pairs into diagnosis rows from the graph.
  const diagnosisRows = await getDiagnosesForPairs(
    matchedCategories.map((match) => ({
      clinicalPresentationKey: match.clinicalPresentationKey,
      categoryKey: match.categoryKey,
    }))
  );

  // Deduplicate and rank the final differential diagnoses before returning them.
  const differentials = groupDiagnoses(
    diagnosisRows,
    matchedClinicalPresentations,
    matchedCategories
  );

  // Return both the intermediate matches and final differential list for downstream explanation.
  return {
    matchedClinicalPresentations,
    matchedCategories,
    differentials,
  };
}
