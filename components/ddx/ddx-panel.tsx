"use client";

/**
 * @fileoverview Displays workflow progress, safety review output, and ranked differentials.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import {
  WorkflowCanvas,
  type WorkflowStepState,
} from "@/components/ddx/workflow-canvas";
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
import { formatSourceLabel } from "@/lib/format-source-label";

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
  clinicalPresentationSources: ClinicalPresentationMatch["sources"];
  evidenceName: string;
  evidenceMatchedText: string[];
  evidenceTypeLabel?: string;
};

function formatEvidenceHeadingLabel(name: string) {
  const words = name.trim().split(/\s+/);

  if (words.length <= 3) {
    return name;
  }

  return `${words.slice(0, 3).join(" ")}...`;
}

function EvidenceMetaList({
  label,
  items,
  emptyLabel,
}: {
  label: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={`${label}-${item}`}
              className="max-w-full rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] leading-relaxed text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

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
      clinicalPresentationSources: presentationMatch?.sources ?? [],
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

                      <div className="space-y-3 border-t border-border px-3 py-3">
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Evidence Graph
                          </p>
                          <DdxKG diagnosis={evidencePath} diagnosisName={d.diagnosisName} />
                        </div>

                        <details className="group/evidence-details rounded-md border border-border/70 bg-muted/20">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
                            <div className="flex min-w-0 items-center gap-2">
                              <ChevronRight
                                size={14}
                                className="shrink-0 text-muted-foreground transition-transform group-open/evidence-details:rotate-90"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Evidence Details
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Shows the matched presentation, source, and path evidence for each supporting link.
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              {d.evidence.length} path{d.evidence.length === 1 ? "" : "s"}
                            </span>
                          </summary>
                          <div className="space-y-3 border-t border-border/70 px-3 py-3">
                            {d.evidence.map((path, pathIndex) => {
                              const pathDetails = getPathDetails(path);

                              return (
                                <div
                                  key={`${d.diagnosisKey}-${path.evidenceType}-${path.clinicalPresentationKey}-${path.categoryKey ?? path.featureKey}-${pathIndex}`}
                                  className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        {path.evidenceType === "category"
                                          ? "Category Path"
                                          : "Feature Path"}
                                      </p>
                                      <p
                                        className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground"
                                        title={`${pathDetails.clinicalPresentationName} -> ${pathDetails.evidenceName} -> ${formatDdxName(d.diagnosisName)}`}
                                      >
                                        <span className="shrink-0">
                                          {pathDetails.clinicalPresentationName}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground">
                                          {"->"}
                                        </span>
                                        <span className="min-w-0 truncate">
                                          {formatEvidenceHeadingLabel(pathDetails.evidenceName)}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground">
                                          {"->"}
                                        </span>
                                        <span className="shrink-0">
                                          {formatDdxName(d.diagnosisName)}
                                        </span>
                                      </p>
                                    </div>
                                    <span
                                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] text-foreground"
                                      style={{
                                        background:
                                          path.evidenceType === "category"
                                            ? "var(--kg-category-bg)"
                                            : "var(--kg-feature-bg)",
                                        borderColor:
                                          path.evidenceType === "category"
                                            ? "var(--kg-category-border)"
                                            : "var(--kg-feature-border)",
                                        borderWidth: "1px",
                                      }}
                                    >
                                      {path.evidenceType === "category" ? "Category" : "Feature"}
                                    </span>
                                  </div>

                                  <div className="grid gap-3 lg:grid-cols-2">
                                    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                                      <div>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          Presentation
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-foreground">
                                          {pathDetails.clinicalPresentationName}
                                        </p>
                                      </div>

                                      <EvidenceMetaList
                                        label="Matched Text"
                                        items={pathDetails.clinicalPresentationMatchedText}
                                        emptyLabel="No matched presentation text."
                                      />

                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          Sources
                                        </p>
                                        {pathDetails.clinicalPresentationSources.length > 0 ? (
                                          <div className="flex flex-wrap gap-1.5">
                                            {pathDetails.clinicalPresentationSources.map((source) => (
                                              <span
                                                key={`${path.clinicalPresentationKey}-${source.sourceKey}`}
                                                className="max-w-full whitespace-normal break-words rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] leading-relaxed text-muted-foreground"
                                              >
                                                Source:{" "}
                                                {formatSourceLabel({
                                                  sourceTitle: source.sourceTitle,
                                                  edition: source.edition,
                                                  pageStart: source.pageStart,
                                                  pageEnd: source.pageEnd,
                                                })}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">
                                            No source details available.
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      className="space-y-3 rounded-lg border p-3"
                                      style={{
                                        background:
                                          path.evidenceType === "category"
                                            ? "var(--kg-category-bg)"
                                            : "var(--kg-feature-bg)",
                                        borderColor:
                                          path.evidenceType === "category"
                                            ? "var(--kg-category-border)"
                                            : "var(--kg-feature-border)",
                                      }}
                                    >
                                      <div>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          {path.evidenceType === "category"
                                            ? "Category"
                                            : "Feature"}
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-foreground">
                                          {pathDetails.evidenceName}
                                        </p>
                                        {path.evidenceType === "feature" ? (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            Type:{" "}
                                            {pathDetails.evidenceTypeLabel
                                              ? formatDdxName(pathDetails.evidenceTypeLabel)
                                              : "Not available"}
                                          </p>
                                        ) : null}
                                      </div>

                                      <EvidenceMetaList
                                        label="Matched Text"
                                        items={pathDetails.evidenceMatchedText}
                                        emptyLabel={`No matched ${path.evidenceType} text.`}
                                      />
                                    </div>
                                  </div>

                                  <p className="text-xs leading-relaxed text-muted-foreground">
                                    Supporting path for{" "}
                                    <span className="font-medium text-foreground">
                                      {formatDdxName(d.diagnosisName)}
                                    </span>
                                    .
                                  </p>
                                </div>
                              );
                            })}
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
