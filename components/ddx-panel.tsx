"use client";

/**
 * @fileoverview Displays workflow progress, safety review output, and ranked differentials.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import {
  WorkflowCanvas,
  type WorkflowStepState,
} from "@/components/workflow-canvas";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  DifferentialDiagnosisEvidenceRef,
  FeatureMatch,
} from "@/server/ai/workflows/ddx-workflow/types";
import type {
  CriticAssessment,
  GroundingAssessment,
} from "@/server/ai/workflows/safety-workflow/types";
import { ChevronRight } from "lucide-react";

import { formatDdxName } from "@/lib/format-ddx-name";

import { DdxKG } from "./ddx-kg";
import { EvidenceSummary } from "./evidence-summary";
import { SafetyReview } from "./safety-review";

type Props = {
  steps: WorkflowStepState;
  differentials: DifferentialDiagnosis[];
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
  matchedFeatures: FeatureMatch[];
  criticAssessment?: CriticAssessment;
  groundingAssessment?: GroundingAssessment;
};

type PathDetails = {
  clinicalPresentationName: string;
  clinicalPresentationMatchedText: string[];
  evidenceName: string;
  evidenceMatchedText: string[];
  evidenceTypeLabel?: string;
};

export function DdxPanel({
  steps,
  differentials,
  matchedClinicalPresentations,
  matchedCategories,
  matchedFeatures,
  criticAssessment,
  groundingAssessment,
}: Props) {
  const getPathDetails = (
    path: DifferentialDiagnosisEvidenceRef
  ): PathDetails => {
    const presentationMatch = matchedClinicalPresentations.find(
      (match) => match.key === path.clinicalPresentationKey
    );
    const categoryMatch =
      path.evidenceType === "category"
        ? matchedCategories.find(
          (match) =>
            match.clinicalPresentationKey === path.clinicalPresentationKey &&
            match.categoryKey === path.categoryKey
        )
        : undefined;
    const featureMatch =
      path.evidenceType === "feature"
        ? matchedFeatures.find(
          (match) =>
            match.clinicalPresentationKey === path.clinicalPresentationKey &&
            match.featureKey === path.featureKey
        )
        : undefined;



    return {
      clinicalPresentationName:
        formatDdxName(presentationMatch?.name ?? path.clinicalPresentationKey),
      clinicalPresentationMatchedText: presentationMatch?.matchedText ?? [],
      evidenceName:
        formatDdxName(
          path.evidenceType === "category"
            ? categoryMatch?.categoryName ?? path.categoryKey ?? "Unknown category"
            : featureMatch?.featureName ?? path.featureKey ?? "Unknown feature",
        ),
      evidenceMatchedText:
        path.evidenceType === "category"
          ? categoryMatch?.matchedText ?? []
          : featureMatch?.matchedText ?? [],
      evidenceTypeLabel:
        path.evidenceType === "feature"
          ? featureMatch?.featureType
          : undefined,
    };
  };

  return (

    <div className="flex h-full flex-col p-3 gap-3">
      <header className="flex h-16 shrink-0 items-center px-4">
        <span className="rounded-3xl bg-primary p-2 px-4 text-xl font-bold text-primary-foreground shadow-[0_4px_16px_rgba(27,125,126,0.25)]">
          Differential Diagnosis
        </span>
      </header>

      <div className="glass flex-1 overflow-y-auto min-h-0 rounded-[30px] p-4 space-y-3">
        <WorkflowCanvas
          steps={steps}
          matchedClinicalPresentationCount={matchedClinicalPresentations.length}
          criticAssessment={criticAssessment}
        />
        <div className="bg-background/80 border border-[color:var(--glass-border)] rounded-[22px] shadow-[inset_0_1px_0_var(--glass-highlight)]">

          {differentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-medium">
                No differential diagnoses available yet
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Enter a patient presentation with key symptoms, signs, timing, or
                anatomical detail to populate matched presentations, categories,
                features, and ranked differentials.
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Differentials
                </p>
                {differentials.map((d, i) => {
                  const evidencePath = d.evidence.map(path => {
                    const pathDetails = getPathDetails(path);
                    return {
                      clinicalPresentationName: pathDetails.clinicalPresentationName,
                      evidenceName: pathDetails.evidenceName,
                      evidenceType: path.evidenceType,
                      featureType: pathDetails.evidenceTypeLabel,
                    };
                  });

                  return (
                    <details
                      key={d.diagnosisKey}
                      className="group rounded-[15px] border border-border bg-popover"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                        <span className="w-4 shrink-0 text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            {formatDdxName(d.diagnosisName)} <ChevronRight size={16} />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.evidence.length} supporting path
                            {d.evidence.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Evidence support score
                          </p>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {d.score.toFixed(2)}
                          </span>
                        </div>
                      </summary>

                      <div className="space-y-2 border-t border-border px-3 py-3">
                        {d.evidence.map((path, pathIndex) => {
                          const pathDetails = getPathDetails(path);

                          return (
                            <div
                              key={`${d.diagnosisKey}-${path.evidenceType}-${path.clinicalPresentationKey}-${path.categoryKey ?? path.featureKey}-${pathIndex}`}
                              className="rounded-md bg-muted/40 px-3 py-2"
                            >
                              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {path.evidenceType === "category"
                                  ? "Category Evidence Path"
                                  : "Feature Evidence Path"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Presentation evidence:{" "}
                                {pathDetails.clinicalPresentationMatchedText.length > 0
                                  ? pathDetails.clinicalPresentationMatchedText.join(", ")
                                  : "not available"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {path.evidenceType === "category"
                                  ? "Category evidence"
                                  : "Feature evidence"}
                                :{" "}
                                {pathDetails.evidenceMatchedText.length > 0
                                  ? pathDetails.evidenceMatchedText.join(", ")
                                  : "not available"}
                              </p>
                              {path.evidenceType === "feature" && (
                                <p className="text-xs text-muted-foreground">
                                  Feature type: {pathDetails.evidenceTypeLabel ?? "not available"}
                                </p>
                              )}
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {pathDetails.clinicalPresentationName}
                                {" -> "}
                                {pathDetails.evidenceName}
                                {" -> "}
                                {formatDdxName(d.diagnosisName)}
                              </p>
                            </div>
                          );
                        })}
                        <details className="group/subgraph">
                          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                            <ChevronRight size={14} className="transition-transform group-open/subgraph:rotate-90" />
                            Diagnosis Subgraph
                          </summary>
                          <div className="mt-2 mb-2">
                            <DdxKG diagnosis={evidencePath} diagnosisName={d.diagnosisName} />
                          </div>
                        </details>

                      </div>
                    </details>
                  )
                })}
              </div>

              <EvidenceSummary
                matchedClinicalPresentations={matchedClinicalPresentations}
                matchedCategories={matchedCategories}
                matchedFeatures={matchedFeatures}
              />

              <SafetyReview
                criticAssessment={criticAssessment}
                groundingAssessment={groundingAssessment}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
