import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ddx-workflow-canvas", () => ({
  DdxWorkflowCanvas: () => <div>workflow-canvas</div>,
}));

import { DdxPanel } from "./ddx-panel";

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
          critic_review: "complete",
          build_follow_up_questions: "complete",
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
      />
    );

    expect(
      screen.getByText("Feature: Right lower quadrant tenderness (site)")
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence support score")).toBeInTheDocument();

    const summary = screen.getByText("Appendicitis");
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
