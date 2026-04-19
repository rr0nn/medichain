"use client";

/**
 * @fileoverview Displays matched clinical presentations, categories, and features.
 * @contributors Johnson Zhang
 */

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { formatDdxName } from "@/lib/format-ddx-name";
import { formatSourceLabel } from "@/lib/format-source-label";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  FeatureMatch,
} from "@/server/ai/workflows/ddx-workflow/types";

function EvidenceSection({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children ? (
        <div className="flex flex-wrap gap-2">{children}</div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export function EvidenceSummary({
  matchedClinicalPresentations,
  matchedCategories,
  matchedFeatures,
}: {
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
  matchedFeatures: FeatureMatch[];
}) {
  const totalCount =
    matchedClinicalPresentations.length +
    matchedCategories.length +
    matchedFeatures.length;

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
              Evidence Summary
            </p>
            <p className="text-xs text-muted-foreground">
              Shows all matched presentations, categories, and features across the current differential results.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
          {totalCount} item{totalCount === 1 ? "" : "s"}
        </span>
      </summary>

      <div className="grid gap-3 lg:grid-cols-3">
        <EvidenceSection
          title="Presentations"
          emptyLabel="No matched presentations."
        >
          {matchedClinicalPresentations.length > 0
            ? matchedClinicalPresentations.map((match) => (
              <div
                key={`cp-${match.key}`}
                className="w-full min-w-0 rounded-lg border border-border bg-background/80 px-3 py-2.5"
              >
                <p className="text-xs font-medium text-foreground">
                  {formatDdxName(match.name)}
                </p>
                {match.sources.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {match.sources.map((source) => (
                      <span
                        key={`${match.key}-${source.sourceKey}`}
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
                ) : null}
              </div>
            ))
            : null}
        </EvidenceSection>

        <EvidenceSection
          title="Categories"
          emptyLabel="No matched categories."
        >
          {matchedCategories.length > 0
            ? matchedCategories.map((match) => (
              <div
                key={`cat-${match.clinicalPresentationKey}-${match.categoryKey}`}
                className="inline-flex min-w-0 items-center rounded-lg border px-3 py-2 text-xs"
                style={{
                  background: "var(--kg-category-bg)",
                  borderColor: "var(--kg-category-border)",
                  color: "var(--foreground)",
                }}
              >
                {formatDdxName(match.categoryName)}
              </div>
            ))
            : null}
        </EvidenceSection>

        <EvidenceSection
          title="Features"
          emptyLabel="No matched features."
        >
          {matchedFeatures.length > 0
            ? matchedFeatures.map((match) => (
              <div
                key={`feature-${match.clinicalPresentationKey}-${match.featureKey}`}
                className="inline-flex min-w-0 flex-col items-start rounded-lg border px-3 py-2"
                style={{
                  background: "var(--kg-feature-bg)",
                  borderColor: "var(--kg-feature-border)",
                  color: "var(--foreground)",
                }}
              >
                <span className="text-xs">
                  {formatDdxName(match.featureName)}
                </span>
                {match.featureType ? (
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    Type: {formatDdxName(match.featureType)}
                  </span>
                ) : null}
              </div>
            ))
            : null}
        </EvidenceSection>
      </div>
    </details>
  );
}
