/**
 * @fileoverview Tests extraction of the latest differential diagnosis result from the transcript.
 * @contributors Johnson Zhang
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDdxResult } from "../use-ddx-result";

describe("useDdxResult", () => {
  it("returns empty results when no DDx tool output exists", () => {
    const { result } = renderHook(() =>
      useDdxResult(
        [
          {
            id: "m1",
            role: "assistant",
            parts: [{ type: "text", text: "No structured output yet" }],
          },
        ] as never,
      ),
    );

    expect(result.current).toEqual({
      differentials: [],
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
      criticAssessment: undefined,
      groundingAssessment: undefined,
    });
  });

  it("extracts the latest available DDx tool output", () => {
    const { result } = renderHook(() =>
      useDdxResult(
        [
          {
            id: "m1",
            role: "assistant",
            parts: [
              {
                type: "tool-runDifferentialDiagnosis",
                state: "output-available",
                output: {
                  differentials: [{ diagnosisKey: "old", diagnosisName: "Old Dx", score: 0.4, evidence: [] }],
                },
              },
            ],
          },
          {
            id: "m2",
            role: "assistant",
            parts: [
              {
                type: "tool-runDifferentialDiagnosis",
                state: "output-available",
                output: {
                  differentials: [
                    {
                      diagnosisKey: "dx-appendicitis",
                      diagnosisName: "Appendicitis",
                      score: 0.92,
                      evidence: [],
                    },
                  ],
                  matchedClinicalPresentations: [{ key: "cp-abdominal-pain", name: "Abdominal pain", score: 0.8, matchedText: [], sources: [] }],
                  matchedCategories: [{ clinicalPresentationKey: "cp-abdominal-pain", categoryKey: "cat-inflammatory", categoryName: "Inflammatory", score: 0.7, matchedText: [] }],
                  matchedFeatures: [{ clinicalPresentationKey: "cp-abdominal-pain", featureKey: "feature-rlq-tenderness", featureName: "Right lower quadrant tenderness", featureType: "site", score: 0.9, matchedText: [] }],
                  criticAssessment: { isConfident: true, shouldReturnToInterview: false, confidenceLabel: "high", reasons: [], topDifferentialScore: 0.92, topDifferentialEvidenceCount: 1, scoreGapToSecond: 0.2 },
                  groundingAssessment: { isGrounded: true, reasons: [], groundedDifferentialCount: 1, ungroundedDifferentialCount: 0, topDiagnosisHasGroundedEvidence: true, topDiagnosisHasFeatureEvidence: true },
                },
              },
            ],
          },
        ] as never,
      ),
    );

    expect(result.current.differentials).toHaveLength(1);
    expect(result.current.differentials[0]?.diagnosisName).toBe("Appendicitis");
    expect(result.current.matchedClinicalPresentations[0]?.name).toBe("Abdominal pain");
    expect(result.current.matchedCategories[0]?.categoryName).toBe("Inflammatory");
    expect(result.current.matchedFeatures[0]?.featureName).toBe("Right lower quadrant tenderness");
    expect(result.current.criticAssessment?.confidenceLabel).toBe("high");
    expect(result.current.groundingAssessment?.isGrounded).toBe(true);
  });

  it("ignores tool parts without output-available state", () => {
    const { result } = renderHook(() =>
      useDdxResult(
        [
          {
            id: "m1",
            role: "assistant",
            parts: [
              {
                type: "tool-runDifferentialDiagnosis",
                state: "input-available",
                input: { patientDescription: "RLQ pain" },
              },
            ],
          },
        ] as never,
      ),
    );

    expect(result.current.differentials).toEqual([]);
  });
});
