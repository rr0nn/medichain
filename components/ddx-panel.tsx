"use client";

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

function formatSourceLabel(input: {
  sourceTitle: string;
  edition?: string;
  pageStart?: number;
  pageEnd?: number;
}) {
  const titleWithEdition = input.edition
    ? `${input.sourceTitle}, ${formatEditionLabel(input.edition)}`
    : input.sourceTitle;

  if (
    input.pageStart !== undefined &&
    input.pageEnd !== undefined &&
    input.pageStart !== input.pageEnd
  ) {
    return `${titleWithEdition} (pp. ${input.pageStart}-${input.pageEnd})`;
  }

  if (input.pageStart !== undefined) {
    return `${titleWithEdition} (p. ${input.pageStart})`;
  }

  return titleWithEdition;
}

function formatEditionLabel(edition: string) {
  const trimmedEdition = edition.trim();

  if (!/^\d+$/.test(trimmedEdition)) {
    return trimmedEdition;
  }

  const numericEdition = Number(trimmedEdition);
  const lastTwoDigits = numericEdition % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${numericEdition}th edition`;
  }

  switch (numericEdition % 10) {
    case 1:
      return `${numericEdition}st edition`;
    case 2:
      return `${numericEdition}nd edition`;
    case 3:
      return `${numericEdition}rd edition`;
    default:
      return `${numericEdition}th edition`;
  }
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
        presentationMatch?.name ?? path.clinicalPresentationKey,
      clinicalPresentationMatchedText: presentationMatch?.matchedText ?? [],
      evidenceName:
        path.evidenceType === "category"
          ? categoryMatch?.categoryName ?? path.categoryKey ?? "Unknown category"
          : featureMatch?.featureName ?? path.featureKey ?? "Unknown feature",
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
    <div className="flex h-full flex-col">
      <header className="flex h-20 shrink-0 items-center border-b border-border px-4">
        <span className="top-3 rounded-3xl bg-primary p-2 px-4 text-xl font-bold text-primary-foreground">
          Differential Diagnosis
        </span>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        <WorkflowCanvas
          steps={steps}
          matchedClinicalPresentationCount={matchedClinicalPresentations.length}
          criticAssessment={criticAssessment}
        />

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
            {criticAssessment && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Safety Review
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={
                      criticAssessment.shouldReturnToInterview
                        ? "rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300"
                        : "rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"
                    }
                  >
                    {criticAssessment.shouldReturnToInterview
                      ? "Needs more information"
                      : "Ready for review"}
                  </span>
                  <span
                    className={
                      criticAssessment.isConfident
                        ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"
                        : "rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300"
                    }
                  >
                    Confidence: {criticAssessment.confidenceLabel}
                  </span>
                  {criticAssessment.topDifferentialScore !== null && (
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      Top score: {criticAssessment.topDifferentialScore.toFixed(2)}
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    Top evidence paths: {criticAssessment.topDifferentialEvidenceCount}
                  </span>
                  {criticAssessment.scoreGapToSecond !== null && (
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      Gap to second: {criticAssessment.scoreGapToSecond.toFixed(2)}
                    </span>
                  )}
                </div>
                {criticAssessment.reasons.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Review notes
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {criticAssessment.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The critic considered the current differential sufficiently supported for review.
                  </p>
                )}

                {groundingAssessment && (
                  <div className="space-y-2 rounded-md border border-border/70 bg-background/70 p-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Grounding Audit
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={
                          groundingAssessment.isGrounded
                            ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"
                            : "rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {groundingAssessment.isGrounded
                          ? "Graph grounded"
                          : "Grounding failed"}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1">
                        Grounded diagnoses: {groundingAssessment.groundedDifferentialCount}
                      </span>
                      {groundingAssessment.ungroundedDifferentialCount > 0 && (
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          Removed as ungrounded: {groundingAssessment.ungroundedDifferentialCount}
                        </span>
                      )}
                      <span className="rounded-full bg-muted px-2.5 py-1">
                        Top diagnosis grounded: {groundingAssessment.topDiagnosisHasGroundedEvidence ? "yes" : "no"}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1">
                        Top diagnosis feature-backed: {groundingAssessment.topDiagnosisHasFeatureEvidence ? "yes" : "no"}
                      </span>
                    </div>
                    {groundingAssessment.reasons.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Audit notes
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {groundingAssessment.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Matched Evidence
              </p>
              <div className="flex flex-wrap gap-2">
                {matchedClinicalPresentations.map((match) => (
                  <div
                    key={`cp-${match.key}`}
                    className="space-y-1 rounded-md border border-border bg-muted/30 px-2.5 py-2"
                  >
                    <span className="block text-xs">
                      Presentation: {match.name}
                    </span>
                    {match.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {match.sources.map((source) => (
                          <span
                            key={`${match.key}-${source.sourceKey}`}
                            className="rounded-full bg-background px-2 py-1 text-[11px] text-muted-foreground"
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
                    )}
                  </div>
                ))}
                {matchedCategories.map((match) => (
                  <span
                    key={`cat-${match.clinicalPresentationKey}-${match.categoryKey}`}
                    className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300"
                  >
                    Category: {match.categoryName}
                  </span>
                ))}
                {matchedFeatures.map((match) => (
                  <span
                    key={`feature-${match.clinicalPresentationKey}-${match.featureKey}`}
                    className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300"
                  >
                    Feature: {match.featureName}
                    {match.featureType ? ` (${match.featureType})` : ""}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Differentials
              </p>
              {differentials.map((d, i) => (
                <details
                  key={d.diagnosisKey}
                  className="group rounded-lg border border-border"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <span className="w-4 shrink-0 text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {d.diagnosisName} <ChevronRight size={16} />
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
                            {d.diagnosisName}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
