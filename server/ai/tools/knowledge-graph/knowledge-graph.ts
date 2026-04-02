// Diagnosis knowledge graph access module:
// provides typed read helpers for traversing the Neo4j diagnosis graph from
// clinical presentations to categories and then to diagnoses.
import neo4j from "neo4j-driver";
import { neo4jDatabase, neo4jDriver } from "./neo4j";
import type {
  CategoryRecord,
  ClinicalPresentationRecord,
  DiagnosisPathAuditRecord,
  DiagnosisRecord,
  FeatureRecord,
} from "./types";


/**
 * Returns all clinical presentation nodes, sorted by display name, for use as
 * the top-level candidate set in diagnosis matching flows.
 *
 * @returns {Promise<ClinicalPresentationRecord[]>} All clinical presentation nodes ordered by name.
 */
export async function getClinicalPresentations(): Promise<ClinicalPresentationRecord[]> {
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
 * @returns {Promise<CategoryRecord[]>} Category rows linked to the supplied clinical presentation keys.
 */
export async function getCategoriesForClinicalPresentations(
  clinicalPresentationKeys: string[]
): Promise<CategoryRecord[]> {
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
 * Returns feature nodes attached to the supplied clinical presentation keys.
 * Short-circuits to an empty array when no presentation keys are provided.
 *
 * @param {string[]} clinicalPresentationKeys Clinical presentation keys to expand into features.
 * @returns {Promise<FeatureRecord[]>} Feature rows linked to the supplied clinical presentation keys.
 */
export async function getFeaturesForClinicalPresentations(
  clinicalPresentationKeys: string[]
): Promise<FeatureRecord[]> {
  if (clinicalPresentationKeys.length === 0) {
    return [];
  }

  const { records } = await neo4jDriver.executeQuery(
    `
    MATCH (cp:ClinicalPresentation)-[:HAS_FEATURE]->(feature:Feature)
    WHERE cp.key IN $clinicalPresentationKeys
    RETURN
      cp.key AS clinicalPresentationKey,
      feature.key AS featureKey,
      feature.name AS featureName,
      feature.normalized_name AS featureNormalizedName,
      coalesce(feature.feature_type, feature.type) AS featureType
    ORDER BY cp.name, feature.name
    `,
    { clinicalPresentationKeys },
    {
      database: neo4jDatabase,
      routing: neo4j.routing.READ,
    }
  );

  return records.map((record) => ({
    clinicalPresentationKey: record.get("clinicalPresentationKey"),
    featureKey: record.get("featureKey"),
    featureName: record.get("featureName"),
    featureNormalizedName: record.get("featureNormalizedName"),
    featureType: record.get("featureType"),
  }));
}

/**
 * Returns diagnosis rows for each provided clinical-presentation/category pair.
 * Short-circuits to an empty array when no pairs are provided.
 *
 * @param {Array<{ clinicalPresentationKey: string; categoryKey: string }>} pairs Clinical presentation and category key pairs to expand into diagnoses.
 * @returns {Promise<DiagnosisRecord[]>} Diagnosis rows linked to the supplied presentation-category pairs.
 */
export async function getDiagnosesForPairs(
  pairs: Array<{ clinicalPresentationKey: string; categoryKey: string }>
): Promise<DiagnosisRecord[]> {
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
    evidenceType: "category" as const,
    clinicalPresentationKey: record.get("clinicalPresentationKey"),
    categoryKey: record.get("categoryKey"),
    diagnosisKey: record.get("diagnosisKey"),
    diagnosisName: record.get("diagnosisName"),
  }));
}

/**
 * Returns diagnosis rows for each provided clinical-presentation/feature pair.
 * Short-circuits to an empty array when no pairs are provided.
 *
 * @param {Array<{ clinicalPresentationKey: string; featureKey: string }>} pairs Clinical presentation and feature key pairs to expand into diagnoses.
 * @returns {Promise<DiagnosisRecord[]>} Diagnosis rows linked to the supplied presentation-feature pairs.
 */
export async function getDiagnosesForFeaturePairs(
  pairs: Array<{ clinicalPresentationKey: string; featureKey: string }>
): Promise<DiagnosisRecord[]> {
  if (pairs.length === 0) {
    return [];
  }

  const { records } = await neo4jDriver.executeQuery(
    `
    UNWIND $pairs AS pair
    MATCH (cp:ClinicalPresentation {key: pair.clinicalPresentationKey})
          -[:HAS_FEATURE]->(feature:Feature {key: pair.featureKey})
          -[:SUGGESTS]->(dx:Diagnosis)
    RETURN
      cp.key AS clinicalPresentationKey,
      feature.key AS featureKey,
      dx.key AS diagnosisKey,
      dx.name AS diagnosisName
    ORDER BY cp.key, feature.key, dx.name
    `,
    { pairs },
    {
      database: neo4jDatabase,
      routing: neo4j.routing.READ,
    }
  );

  return records.map((record) => ({
    evidenceType: "feature" as const,
    clinicalPresentationKey: record.get("clinicalPresentationKey"),
    featureKey: record.get("featureKey"),
    diagnosisKey: record.get("diagnosisKey"),
    diagnosisName: record.get("diagnosisName"),
  }));
}

/**
 * Re-verifies exact diagnosis evidence paths directly against Neo4j.
 * Short-circuits to an empty array when no candidate paths are provided.
 *
 * @param {DiagnosisPathAuditRecord[]} paths Candidate evidence paths to audit.
 * @returns {Promise<DiagnosisPathAuditRecord[]>} Only the paths that still exist in the graph.
 */
export async function verifyDiagnosisEvidencePaths(
  paths: DiagnosisPathAuditRecord[],
): Promise<DiagnosisPathAuditRecord[]> {
  if (paths.length === 0) {
    return [];
  }

  const { records } = await neo4jDriver.executeQuery(
    `
    UNWIND $paths AS path
    CALL {
      WITH path
      WITH path WHERE path.evidenceType = 'category'
      MATCH (cp:ClinicalPresentation {key: path.clinicalPresentationKey})
            -[:HAS_CATEGORY]->(cat:Category {key: path.categoryKey})
            -[:INCLUDES_DIAGNOSIS]->(dx:Diagnosis {key: path.diagnosisKey})
      RETURN
        'category' AS evidenceType,
        cp.key AS clinicalPresentationKey,
        cat.key AS categoryKey,
        null AS featureKey,
        dx.key AS diagnosisKey
      UNION
      WITH path
      WITH path WHERE path.evidenceType = 'feature'
      MATCH (cp:ClinicalPresentation {key: path.clinicalPresentationKey})
            -[:HAS_FEATURE]->(feature:Feature {key: path.featureKey})
            -[:SUGGESTS]->(dx:Diagnosis {key: path.diagnosisKey})
      RETURN
        'feature' AS evidenceType,
        cp.key AS clinicalPresentationKey,
        null AS categoryKey,
        feature.key AS featureKey,
        dx.key AS diagnosisKey
    }
    RETURN
      evidenceType,
      clinicalPresentationKey,
      categoryKey,
      featureKey,
      diagnosisKey
    `,
    { paths },
    {
      database: neo4jDatabase,
      routing: neo4j.routing.READ,
    },
  );

  return records.map((record) => ({
    evidenceType: record.get("evidenceType"),
    clinicalPresentationKey: record.get("clinicalPresentationKey"),
    categoryKey: record.get("categoryKey") ?? undefined,
    featureKey: record.get("featureKey") ?? undefined,
    diagnosisKey: record.get("diagnosisKey"),
  }));
}
