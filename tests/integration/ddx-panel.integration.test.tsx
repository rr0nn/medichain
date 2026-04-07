import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("@/components/workflow-canvas", () => ({
  WorkflowCanvas: ({
    matchedClinicalPresentationCount,
  }: {
    matchedClinicalPresentationCount: number;
  }) => <div>workflow-canvas:{matchedClinicalPresentationCount}</div>,
}));

import { DdxPanel } from "@/components/ddx-panel";
 beforeAll(() => {
  global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
});

describe("DdxPanel integration", () => {
  it("renders a realistic workflow result with matched evidence, safety state, and diagnosis paths", () => {
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
            score: 0.94,
            evidence: [
              {
                evidenceType: "category",
                clinicalPresentationKey: "cp-abdominal-pain",
                categoryKey: "cat-inflammatory",
              },
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
            score: 0.82,
            matchedText: ["right lower quadrant abdominal pain"],
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
        matchedCategories={[
          {
            clinicalPresentationKey: "cp-abdominal-pain",
            categoryKey: "cat-inflammatory",
            categoryName: "Inflammatory",
            score: 0.72,
            matchedText: ["inflammatory abdominal process"],
          },
        ]}
        matchedFeatures={[
          {
            clinicalPresentationKey: "cp-abdominal-pain",
            featureKey: "feature-rlq-tenderness",
            featureName: "Right lower quadrant tenderness",
            featureType: "site",
            score: 0.91,
            matchedText: ["right lower quadrant tenderness"],
          },
        ]}
        criticAssessment={{
          isConfident: true,
          shouldReturnToInterview: false,
          confidenceLabel: "high",
          reasons: [
            "The top diagnosis is strongly supported by feature-backed evidence.",
          ],
          topDifferentialScore: 0.94,
          topDifferentialEvidenceCount: 2,
          scoreGapToSecond: 0.21,
        }}
        groundingAssessment={{
          isGrounded: true,
          reasons: [
            "All returned diagnoses were verified against graph-backed evidence paths.",
          ],
          groundedDifferentialCount: 1,
          ungroundedDifferentialCount: 0,
          topDiagnosisHasFeatureEvidence: true,
          topDiagnosisHasGroundedEvidence: true,
        }}
      />,
    );

    expect(screen.getByText("Differential Diagnosis")).toBeInTheDocument();
    expect(screen.getByText("workflow-canvas:1")).toBeInTheDocument();
    expect(screen.getByText("Matched Evidence")).toBeInTheDocument();
    expect(screen.getByText("Presentation: Abdominal pain")).toBeInTheDocument();
    expect(screen.getByText("Category: Inflammatory")).toBeInTheDocument();
    expect(
      screen.getByText("Feature: Right lower quadrant tenderness (site)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Source: Pocketbook of Differential Diagnosis, 5th edition (pp. 123-126)",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Safety Review")).toBeInTheDocument();
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
    expect(screen.getByText("Confidence: high")).toBeInTheDocument();
    expect(screen.getByText("Top score: 0.94")).toBeInTheDocument();
    expect(screen.getByText("Top evidence paths: 2")).toBeInTheDocument();
    expect(screen.getByText("Gap to second: 0.21")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The top diagnosis is strongly supported by feature-backed evidence.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Grounding Audit")).toBeInTheDocument();
    expect(screen.getByText("Graph grounded")).toBeInTheDocument();
    expect(screen.getByText("Grounded diagnoses: 1")).toBeInTheDocument();
    expect(screen.getByText("Top diagnosis grounded: yes")).toBeInTheDocument();
    expect(
      screen.getByText("Top diagnosis feature-backed: yes"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "All returned diagnoses were verified against graph-backed evidence paths.",
      ),
    ).toBeInTheDocument();

    const summary = screen.getAllByText("Appendicitis").find(element => element.closest("summary"))!;
    summary.closest("details")?.setAttribute("open", "");

    expect(screen.getByText("Category Evidence Path")).toBeInTheDocument();
    expect(screen.getByText("Feature Evidence Path")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Presentation evidence: right lower quadrant abdominal pain",
      ),
    ).toHaveLength(2);
    expect(
      screen.getByText("Category evidence: inflammatory abdominal process"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Feature evidence: right lower quadrant tenderness"),
    ).toBeInTheDocument();
    expect(screen.getByText("Feature type: site")).toBeInTheDocument();
    expect(
      screen.getByText(/Abdominal pain -> Inflammatory -> Appendicitis/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Abdominal pain -> Right lower quadrant tenderness -> Appendicitis/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence support score")).toBeInTheDocument();
  });
})