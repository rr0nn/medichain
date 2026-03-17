"use client";

import {
  DdxWorkflowCanvas,
  type WorkflowStepState,
} from "@/components/ddx-workflow-canvas";
import type { DifferentialDiagnosis } from "@/server/ai/workflows/ddx-workflow/types";

type Props = {
  steps: WorkflowStepState;
  differentials: DifferentialDiagnosis[];
};

export function DdxPanel({ steps, differentials }: Props) {
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
              <div
                key={d.diagnosisKey}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <span className="text-xs text-muted-foreground w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {d.diagnosisName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.paths.length} path{d.paths.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                  {(d.score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
