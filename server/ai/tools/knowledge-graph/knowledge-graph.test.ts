import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockExecuteQuery: vi.fn(),
}));

vi.mock("neo4j-driver", () => ({
  default: {
    routing: {
      READ: "READ",
    },
  },
}));

vi.mock("./neo4j", () => ({
  neo4jDatabase: "neo4j-test-db",
  neo4jDriver: {
    executeQuery: mocks.mockExecuteQuery,
  },
}));

import {
  getDiagnosesForFeaturePairs,
  getFeaturesForClinicalPresentations,
  getSourcesForClinicalPresentations,
  verifyDiagnosisEvidencePaths,
} from "./knowledge-graph";

describe("knowledge graph feature helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits feature lookups when no clinical presentation keys are provided", async () => {
    await expect(getFeaturesForClinicalPresentations([])).resolves.toEqual([]);
    expect(mocks.mockExecuteQuery).not.toHaveBeenCalled();
  });

  it("maps feature rows returned from Neo4j", async () => {
    mocks.mockExecuteQuery.mockResolvedValue({
      records: [
        {
          get: vi.fn((key: string) => {
            const values = {
              clinicalPresentationKey: "cp-abdominal-pain",
              featureKey: "feature-rlq-tenderness",
              featureName: "Right lower quadrant tenderness",
              featureNormalizedName: "right lower quadrant tenderness",
              featureType: "site",
            };

            return values[key as keyof typeof values];
          }),
        },
      ],
    });

    const result = await getFeaturesForClinicalPresentations([
      "cp-abdominal-pain",
    ]);

    expect(mocks.mockExecuteQuery).toHaveBeenCalledTimes(1);

    const [query, params, options] = mocks.mockExecuteQuery.mock.calls[0];

    expect(query).toContain(
      "MATCH (cp:ClinicalPresentation)-[:HAS_FEATURE]->(feature:Feature)",
    );
    expect(query).toContain(
      "coalesce(feature.feature_type, feature.type) AS featureType",
    );
    expect(params).toEqual({
      clinicalPresentationKeys: ["cp-abdominal-pain"],
    });
    expect(options).toEqual({
      database: "neo4j-test-db",
      routing: "READ",
    });

    expect(result).toEqual([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        featureName: "Right lower quadrant tenderness",
        featureNormalizedName: "right lower quadrant tenderness",
        featureType: "site",
      },
    ]);
  });

  it("maps source rows returned from Neo4j", async () => {
    mocks.mockExecuteQuery.mockResolvedValue({
      records: [
        {
          get: vi.fn((key: string) => {
            const values = {
              clinicalPresentationKey: "cp-abdominal-pain",
              sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
              sourceTitle: "Pocketbook of Differential Diagnosis",
              edition: "5th edition",
              pageStart: { toNumber: () => 123 },
              pageEnd: { toNumber: () => 126 },
            };

            return values[key as keyof typeof values];
          }),
        },
      ],
    });

    const result = await getSourcesForClinicalPresentations([
      "cp-abdominal-pain",
    ]);

    expect(mocks.mockExecuteQuery).toHaveBeenCalledTimes(1);

    const [query, params, options] = mocks.mockExecuteQuery.mock.calls[0];

    expect(query).toContain(
      "MATCH (excerpt:Source)-[:DOCUMENTS]->(cp:ClinicalPresentation)",
    );
    expect(query).toContain(
      "OPTIONAL MATCH (book:Source)-[:HAS_EXCERPT]->(excerpt)",
    );
    expect(query).toContain(
      "coalesce(book.title, excerpt.title) AS sourceTitle",
    );
    expect(params).toEqual({
      clinicalPresentationKeys: ["cp-abdominal-pain"],
    });
    expect(options).toEqual({
      database: "neo4j-test-db",
      routing: "READ",
    });

    expect(result).toEqual([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
        sourceTitle: "Pocketbook of Differential Diagnosis",
        edition: "5th edition",
        pageStart: 123,
        pageEnd: 126,
      },
    ]);
  });

  it("maps diagnosis rows from presentation-feature pairs and tags them as feature evidence", async () => {
    mocks.mockExecuteQuery.mockResolvedValue({
      records: [
        {
          get: vi.fn((key: string) => {
            const values = {
              clinicalPresentationKey: "cp-abdominal-pain",
              featureKey: "feature-rlq-tenderness",
              diagnosisKey: "dx-appendicitis",
              diagnosisName: "Appendicitis",
            };

            return values[key as keyof typeof values];
          }),
        },
      ],
    });

    const result = await getDiagnosesForFeaturePairs([
      {
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
      },
    ]);

    expect(mocks.mockExecuteQuery).toHaveBeenCalledTimes(1);

    const [query, params, options] = mocks.mockExecuteQuery.mock.calls[0];

    expect(query).toContain(
      "-[:HAS_FEATURE]->(feature:Feature {key: pair.featureKey})",
    );
    expect(query).toContain("-[:SUGGESTS]->(dx:Diagnosis)");
    expect(params).toEqual({
      pairs: [
        {
          clinicalPresentationKey: "cp-abdominal-pain",
          featureKey: "feature-rlq-tenderness",
        },
      ],
    });
    expect(options).toEqual({
      database: "neo4j-test-db",
      routing: "READ",
    });

    expect(result).toEqual([
      {
        evidenceType: "feature",
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        diagnosisKey: "dx-appendicitis",
        diagnosisName: "Appendicitis",
      },
    ]);
  });

  it("re-verifies diagnosis evidence paths directly from Neo4j", async () => {
    mocks.mockExecuteQuery.mockResolvedValue({
      records: [
        {
          get: vi.fn((key: string) => {
            const values = {
              evidenceType: "feature",
              clinicalPresentationKey: "cp-abdominal-pain",
              categoryKey: null,
              featureKey: "feature-rlq-tenderness",
              diagnosisKey: "dx-appendicitis",
            };

            return values[key as keyof typeof values];
          }),
        },
      ],
    });

    const result = await verifyDiagnosisEvidencePaths([
      {
        evidenceType: "feature",
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        diagnosisKey: "dx-appendicitis",
      },
    ]);

    const [query, params, options] = mocks.mockExecuteQuery.mock.calls[0];

    expect(query).toContain("UNWIND $paths AS path");
    expect(query).toContain(
      "-[:SUGGESTS]->(dx:Diagnosis {key: path.diagnosisKey})",
    );
    expect(query).toContain(
      "-[:INCLUDES_DIAGNOSIS]->(dx:Diagnosis {key: path.diagnosisKey})",
    );
    expect(params).toEqual({
      paths: [
        {
          evidenceType: "feature",
          clinicalPresentationKey: "cp-abdominal-pain",
          featureKey: "feature-rlq-tenderness",
          diagnosisKey: "dx-appendicitis",
        },
      ],
    });
    expect(options).toEqual({
      database: "neo4j-test-db",
      routing: "READ",
    });

    expect(result).toEqual([
      {
        evidenceType: "feature",
        clinicalPresentationKey: "cp-abdominal-pain",
        featureKey: "feature-rlq-tenderness",
        diagnosisKey: "dx-appendicitis",
      },
    ]);
  });
});
