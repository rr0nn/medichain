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

    expect(query).toContain("MATCH (cp:ClinicalPresentation)-[:HAS_FEATURE]->(feature:Feature)");
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

    expect(query).toContain("-[:HAS_FEATURE]->(feature:Feature {key: pair.featureKey})");
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
});
