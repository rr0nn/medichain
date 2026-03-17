"use client";

import {
  DdxWorkflowCanvas,
  type WorkflowStepState,
} from "@/components/ddx-workflow-canvas";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
} from "@/server/ai/workflows/ddx-workflow/types";

type Props = {
  steps: WorkflowStepState;
  differentials: DifferentialDiagnosis[];
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
};

export function DdxPanel({
  steps,
  differentials,
  matchedClinicalPresentations,
  matchedCategories,
}: Props) {
  const getPathDetails = (clinicalPresentationKey: string, categoryKey: string) => {
    const presentationMatch = matchedClinicalPresentations.find(
      (match) => match.key === clinicalPresentationKey
    );
    const categoryMatch = matchedCategories.find(
      (match) =>
        match.clinicalPresentationKey === clinicalPresentationKey &&
        match.categoryKey === categoryKey
    );

    return {
      clinicalPresentationName:
        presentationMatch?.name ?? clinicalPresentationKey,
      categoryName: categoryMatch?.categoryName ?? categoryKey,
      matchedText: [
        ...(presentationMatch?.matchedText ?? []),
        ...(categoryMatch?.matchedText ?? []),
      ],
    };
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center px-4 h-12 border-b border-border shrink-0">
        <span className="font-semibold text-sm">Differential Diagnosis</span>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        <DdxWorkflowCanvas steps={steps} />

        {differentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
            <p className="text-sm font-medium">Nothing rn</p>
            <p className="text-sm text-muted-foreground">
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Differentials
            </p>
            {differentials.map((d, i) => (
              <details
                key={d.diagnosisKey}
                className="group rounded-lg border border-border"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {d.diagnosisName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.evidence.length} path{d.evidence.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {(d.score * 100).toFixed(0)}%
                  </span>
                </summary>

                <div className="border-t border-border px-3 py-3 space-y-2">
                  {d.evidence.map((path, pathIndex) => {
                    const pathDetails = getPathDetails(
                      path.clinicalPresentationKey,
                      path.categoryKey
                    );

                    return (
                      <div
                        key={`${d.diagnosisKey}-${path.clinicalPresentationKey}-${path.categoryKey}-${pathIndex}`}
                        className="rounded-md bg-muted/40 px-3 py-2"
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pathDetails.matchedText.length > 0
                            ? pathDetails.matchedText.join(", ")
                            : "matched text unavailable"}
                          {" -> "}
                          {pathDetails.clinicalPresentationName}
                          {" -> "}
                          {pathDetails.categoryName}
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
        )}
      </div>
    </div>
  );
}
