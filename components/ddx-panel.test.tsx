import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("@/components/workflow-canvas", () => ({
  WorkflowCanvas: () => <div>workflow-canvas</div>,
}));

import { DdxPanel } from "./ddx-panel";
 beforeAll(() => {
  global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
});

describe("DdxPanel", () => {
  it("renders matched features and feature-backed evidence paths", () => {
    render(
      <DdxPanel
        steps={{
          match_presentations: "complete",
          match_categories: "complete",
          match_features: "complete",
          fetch_diagnoses: "complete",
          group_diagnoses: "complete",
          safety_review: "complete",
        }}
        differentials={[
          {
            diagnosisKey: "dx-appendicitis",
            diagnosisName: "Appendicitis",
            score: 0.92,
            evidence: [
              {
                evidenceType: "feature",
                clinicalPresentationKey: "cp-abdominal-pain",
                featureKey: "feature-rlq-tenderness",
              },
            ],
          },
        ]}
        matchedClinicalPresentations={[
          {
            key: "cp-abdominal-pain",
            name: "Abdominal pain",
            score: 0.8,
            matchedText: ["abdominal pain"],
            sources: [
              {
                clinicalPresentationKey: "cp-abdominal-pain",
                sourceKey: "source:pocketbook_ddx_5e_abdominal_pain",
                sourceTitle: "Pocketbook of Differential Diagnosis",
                edition: "5",
                pageStart: 123,
                pageEnd: 126,
              },
            ],
          },
        ]}
        matchedCategories={[]}
        matchedFeatures={[
          {
            clinicalPresentationKey: "cp-abdominal-pain",
            featureKey: "feature-rlq-tenderness",
            featureName: "Right lower quadrant tenderness",
            featureType: "site",
            score: 0.9,
            matchedText: ["right lower quadrant tenderness"],
          },
        ]}
        criticAssessment={{
          isConfident: false,
          shouldReturnToInterview: true,
          confidenceLabel: "medium",
          reasons: ["The top differential score is below the confidence threshold."],
          topDifferentialScore: 0.92,
          topDifferentialEvidenceCount: 1,
          scoreGapToSecond: null,
        }}
        groundingAssessment={{
          isGrounded: true,
          reasons: ["1 differential diagnosis failed direct knowledge graph path verification and was removed."],
          groundedDifferentialCount: 1,
          ungroundedDifferentialCount: 1,
          topDiagnosisHasGroundedEvidence: true,
          topDiagnosisHasFeatureEvidence: true,
        }}
      />
    );

    expect(
      screen.getByText("Feature: Right lower quadrant tenderness (site)")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Source: Pocketbook of Differential Diagnosis, 5th edition (pp. 123-126)"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence support score")).toBeInTheDocument();
    expect(screen.getByText("Safety Review")).toBeInTheDocument();
    expect(screen.getByText("Needs more information")).toBeInTheDocument();
    expect(screen.getByText("Confidence: medium")).toBeInTheDocument();
    expect(screen.getByText("Grounding Audit")).toBeInTheDocument();
    expect(screen.getByText("Graph grounded")).toBeInTheDocument();
    expect(screen.getByText("Grounded diagnoses: 1")).toBeInTheDocument();
    expect(screen.getByText("Removed as ungrounded: 1")).toBeInTheDocument();
    expect(
      screen.getByText("The top differential score is below the confidence threshold.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 differential diagnosis failed direct knowledge graph path verification and was removed.")
    ).toBeInTheDocument();

    const summary = screen.getAllByText("Appendicitis").find(element => element.closest("summary"))!;
    summary.closest("details")?.setAttribute("open", "");

    expect(screen.getByText("Feature Evidence Path")).toBeInTheDocument();
    expect(
      screen.getByText(/Abdominal pain -> Right lower quadrant tenderness -> Appendicitis/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Feature evidence: right lower quadrant tenderness/)
    ).toBeInTheDocument();
    expect(screen.getByText("Feature type: site")).toBeInTheDocument();
  });
});
