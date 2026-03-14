import { matchCategories } from "@/server/ai/agents/category-matcher-agent/agent";
import { matchClinicalPresentations } from "@/server/ai/agents/clinical-presentation-matcher-agent/agent";
import type { DiagnosisRow } from "@/server/ai/tools/diagnosis/knowledge-graph";
import {
  getCategoriesForClinicalPresentations,
  getClinicalPresentations,
  getDiagnosesForPairs,
} from "@/server/ai/tools/diagnosis/knowledge-graph";

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
    const clinicalPresentationMatch = cpMatches.find(
      (match) => match.key === row.clinicalPresentationKey
    );
    const categoryMatch = categoryMatches.find(
      (match) =>
        match.clinicalPresentationKey === row.clinicalPresentationKey &&
        match.categoryKey === row.categoryKey
    );

    const combinedScore =
      ((clinicalPresentationMatch?.score ?? 0) + (categoryMatch?.score ?? 0)) /
      2;

    if (!diagnosisMap.has(row.diagnosisKey)) {
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
    existing.score = Math.max(existing.score, combinedScore);

    const alreadyHasPath = existing.paths.some(
      (path) =>
        path.clinicalPresentationKey === row.clinicalPresentationKey &&
        path.categoryKey === row.categoryKey
    );

    if (!alreadyHasPath) {
      existing.paths.push({
        clinicalPresentationKey: row.clinicalPresentationKey,
        categoryKey: row.categoryKey,
      });
    }
  }

  return Array.from(diagnosisMap.values()).sort((a, b) => b.score - a.score);
}

export async function runDifferentialDiagnosisWorkflow(
  patientDescription: string
) {
  const clinicalPresentations = await getClinicalPresentations();

  const clinicalPresentationResult = await matchClinicalPresentations(
    patientDescription,
    clinicalPresentations
  );

  const matchedClinicalPresentations = clinicalPresentationResult.matches
    .filter((match) => match.score >= 0.6)
    .slice(0, 3);

  if (matchedClinicalPresentations.length === 0) {
    return {
      matchedClinicalPresentations: [],
      matchedCategories: [],
      differentials: [],
    };
  }

  const categories = await getCategoriesForClinicalPresentations(
    matchedClinicalPresentations.map((match) => match.key)
  );

  const matchedCategories: Array<{
    clinicalPresentationKey: string;
    categoryKey: string;
    score: number;
    matchedText: string[];
  }> = [];

  for (const clinicalPresentationMatch of matchedClinicalPresentations) {
    const presentationCategories = categories.filter(
      (category) =>
        category.clinicalPresentationKey === clinicalPresentationMatch.key
    );

    if (presentationCategories.length === 0) {
      continue;
    }

    const presentation = clinicalPresentations.find(
      (candidate) => candidate.key === clinicalPresentationMatch.key
    );

    if (!presentation) {
      continue;
    }

    const categoryResult = await matchCategories(
      patientDescription,
      { key: presentation.key, name: presentation.name },
      presentationCategories
    );

    for (const categoryMatch of categoryResult.matches.filter(
      (match) => match.score >= 0.55
    )) {
      matchedCategories.push({
        clinicalPresentationKey: clinicalPresentationMatch.key,
        categoryKey: categoryMatch.key,
        score: categoryMatch.score,
        matchedText: categoryMatch.matchedText,
      });
    }
  }

  if (matchedCategories.length === 0) {
    return {
      matchedClinicalPresentations,
      matchedCategories: [],
      differentials: [],
    };
  }

  const diagnosisRows = await getDiagnosesForPairs(
    matchedCategories.map((match) => ({
      clinicalPresentationKey: match.clinicalPresentationKey,
      categoryKey: match.categoryKey,
    }))
  );

  const differentials = groupDiagnoses(
    diagnosisRows,
    matchedClinicalPresentations,
    matchedCategories
  );

  return {
    matchedClinicalPresentations,
    matchedCategories,
    differentials,
  };
}

export const retrieveDifferentials = runDifferentialDiagnosisWorkflow;
