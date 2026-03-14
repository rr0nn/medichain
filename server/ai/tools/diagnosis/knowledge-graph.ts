// Diagnosis knowledge graph access module:
// provides typed read helpers for traversing the Neo4j diagnosis graph from
// clinical presentations to categories and then to diagnoses.
import neo4j from "neo4j-driver";
import { neo4jDatabase, neo4jDriver } from "./neo4j";

type ClinicalPresentationRecord = {
  key: string;
  name: string;
  normalized_name: string;
};

type CategoryRecord = {
  clinicalPresentationKey: string;
  categoryKey: string;
  categoryName: string;
  categoryNormalizedName: string;
};

type DiagnosisRecord = {
  clinicalPresentationKey: string;
  categoryKey: string;
  diagnosisKey: string;
  diagnosisName: string;
};

export type ClinicalPresentation = ClinicalPresentationRecord;
export type Category = CategoryRecord;
export type DiagnosisRow = DiagnosisRecord;

/**
 * Returns all clinical presentation nodes, sorted by display name, for use as
 * the top-level candidate set in diagnosis matching flows.
 *
 * @returns {Promise<ClinicalPresentation[]>} All clinical presentation nodes ordered by name.
 */
export async function getClinicalPresentations(): Promise<ClinicalPresentation[]> {
  const { records } = await neo4jDriver.executeQuery(
    `
    MATCH (cp:ClinicalPresentation)
    RETURN
      cp.key AS key,
      cp.name AS name,
      cp.normalized_name AS normalized_name
    ORDER BY cp.name
    `,
    {},
    {
      database: neo4jDatabase,
      routing: neo4j.routing.READ,
    }
  );

  return records.map((record) => ({
    key: record.get("key"),
    name: record.get("name"),
    normalized_name: record.get("normalized_name"),
  }));
}

/**
 * Returns category nodes attached to the supplied clinical presentation keys.
 * Short-circuits to an empty array when no presentation keys are provided.
 *
 * @param {string[]} clinicalPresentationKeys Clinical presentation keys to expand into categories.
 * @returns {Promise<Category[]>} Category rows linked to the supplied clinical presentation keys.
 */
export async function getCategoriesForClinicalPresentations(
  clinicalPresentationKeys: string[]
): Promise<Category[]> {
  if (clinicalPresentationKeys.length === 0) {
    return [];
  }

  const { records } = await neo4jDriver.executeQuery(
    `
    MATCH (cp:ClinicalPresentation)-[:HAS_CATEGORY]->(cat:Category)
    WHERE cp.key IN $clinicalPresentationKeys
    RETURN
      cp.key AS clinicalPresentationKey,
      cat.key AS categoryKey,
      cat.name AS categoryName,
      cat.normalized_name AS categoryNormalizedName
    ORDER BY cp.name, cat.name
    `,
    { clinicalPresentationKeys },
    {
      database: neo4jDatabase,
      routing: neo4j.routing.READ,
    }
  );

  return records.map((record) => ({
    clinicalPresentationKey: record.get("clinicalPresentationKey"),
    categoryKey: record.get("categoryKey"),
    categoryName: record.get("categoryName"),
    categoryNormalizedName: record.get("categoryNormalizedName"),
  }));
}

/**
 * Returns diagnosis rows for each provided clinical-presentation/category pair.
 * Short-circuits to an empty array when no pairs are provided.
 *
 * @param {Array<{ clinicalPresentationKey: string; categoryKey: string }>} pairs Clinical presentation and category key pairs to expand into diagnoses.
 * @returns {Promise<DiagnosisRow[]>} Diagnosis rows linked to the supplied presentation-category pairs.
 */
export async function getDiagnosesForPairs(
  pairs: Array<{ clinicalPresentationKey: string; categoryKey: string }>
): Promise<DiagnosisRow[]> {
  if (pairs.length === 0) {
    return [];
  }

  const { records } = await neo4jDriver.executeQuery(
    `
    UNWIND $pairs AS pair
    MATCH (cp:ClinicalPresentation {key: pair.clinicalPresentationKey})
          -[:HAS_CATEGORY]->(cat:Category {key: pair.categoryKey})
          -[:INCLUDES_DIAGNOSIS]->(dx:Diagnosis)
    RETURN
      cp.key AS clinicalPresentationKey,
      cat.key AS categoryKey,
      dx.key AS diagnosisKey,
      dx.name AS diagnosisName
    ORDER BY cp.key, cat.key, dx.name
    `,
    { pairs },
    {
      database: neo4jDatabase,
      routing: neo4j.routing.READ,
    }
  );

  return records.map((record) => ({
    clinicalPresentationKey: record.get("clinicalPresentationKey"),
    categoryKey: record.get("categoryKey"),
    diagnosisKey: record.get("diagnosisKey"),
    diagnosisName: record.get("diagnosisName"),
  }));
}
