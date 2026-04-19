"use client";

/**
 * @fileoverview Displays critic and grounding assessments for the DDx workflow.
 */

import { ChevronRight } from "lucide-react";

import type {
  CriticAssessment,
  GroundingAssessment,
} from "@/server/ai/workflows/safety-workflow/types";

export function SafetyReview({
  criticAssessment,
  groundingAssessment,
}: {
  criticAssessment?: CriticAssessment;
  groundingAssessment?: GroundingAssessment;
}) {
  if (!criticAssessment) {
    return null;
  }

  const primaryStatus = criticAssessment.shouldReturnToInterview
    ? "Needs more information"
    : "Ready for review";

  const hasInternalDetails =
    criticAssessment.reasons.length > 0 || groundingAssessment !== undefined;

  return (
    <details className="group space-y-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-left [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <ChevronRight
            size={14}
            className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Safety Review
            </p>
            <p className="text-xs text-muted-foreground">
              Internal review and grounding checks for the current differential results.
            </p>
          </div>
        </div>
        <span
          className={
            criticAssessment.shouldReturnToInterview
              ? "shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300"
              : "shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300"
          }
        >
          {primaryStatus}
        </span>
      </summary>

      <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={
              criticAssessment.shouldReturnToInterview
                ? "rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300"
                : "rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"
            }
          >
            {primaryStatus}
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
          {groundingAssessment ? (
            <span className="rounded-full bg-muted px-2.5 py-1">
              {groundingAssessment.isGrounded ? "Graph grounded" : "Grounding failed"}
            </span>
          ) : null}
        </div>
        {hasInternalDetails ? (
          <div className="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {criticAssessment.topDifferentialScore !== null ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Top score: {criticAssessment.topDifferentialScore.toFixed(2)}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2.5 py-1">
                Top evidence paths: {criticAssessment.topDifferentialEvidenceCount}
              </span>
              {criticAssessment.scoreGapToSecond !== null ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Gap to second: {criticAssessment.scoreGapToSecond.toFixed(2)}
                </span>
              ) : null}
              {groundingAssessment ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Grounded diagnoses: {groundingAssessment.groundedDifferentialCount}
                </span>
              ) : null}
              {groundingAssessment?.ungroundedDifferentialCount ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Removed as ungrounded: {groundingAssessment.ungroundedDifferentialCount}
                </span>
              ) : null}
              {groundingAssessment ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Top diagnosis grounded: {groundingAssessment.topDiagnosisHasGroundedEvidence ? "yes" : "no"}
                </span>
              ) : null}
              {groundingAssessment ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  Top diagnosis feature-backed: {groundingAssessment.topDiagnosisHasFeatureEvidence ? "yes" : "no"}
                </span>
              ) : null}
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
            ) : null}

            {groundingAssessment?.reasons.length ? (
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
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
