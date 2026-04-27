"use client";

/**
 * @fileoverview Renders the differential diagnosis panel.
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
  FeatureMatch,
} from "@/server/ai/workflows/ddx-workflow/types";
import type {
  CriticAssessment,
  GroundingAssessment,
} from "@/server/ai/workflows/safety-workflow/types";

import { DifferentialList } from "./differential-list";
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

export function DdxPanel({
  steps,
  differentials,
  matchedClinicalPresentations,
  matchedCategories,
  matchedFeatures,
  criticAssessment,
  groundingAssessment,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="glass flex-1 min-h-0 space-y-3 overflow-y-auto rounded-[30px] border border-[color:var(--glass-border)] p-4 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-md">
        <header className="space-y-2 border-b border-[color:var(--glass-border)]/70 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Explainable Diagnostic Reasoning
            </p>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                  Differential Diagnosis Support
                </h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Knowledge graph-grounded review of likely diagnoses and supporting context.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                Live Analysis
              </span>
            </div>
          </div>
        </header>

        {/* Workflow Status - Groups pipeline progress, matched evidence, and safety checks. */}
        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Workflow Status
            </p>
            <p className="text-xs text-muted-foreground">
              Shows workflow progress and matched evidence before diagnosis ranking.
            </p>
          </div>
          {/* Workflow Canvas - Visualizes the current DDx pipeline stage and completion state. */}
          <WorkflowCanvas
            steps={steps}
            matchedClinicalPresentationCount={matchedClinicalPresentations.length}
            criticAssessment={criticAssessment}
          />

          {/* Evidence Summary - Shows matched presentations, categories, and features. */}
          <EvidenceSummary
            matchedClinicalPresentations={matchedClinicalPresentations}
            matchedCategories={matchedCategories}
            matchedFeatures={matchedFeatures}
          />

          {/* Safety Review - Summarizes confidence and grounding checks. */}
          <SafetyReview
            criticAssessment={criticAssessment}
            groundingAssessment={groundingAssessment}
          />
        </section>

        {/* Differential List - Shows the ranked diagnosis suggestions. */}
        <section className="pt-5 space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Differential List
            </p>
          </div>
          <DifferentialList
            differentials={differentials}
            matchedClinicalPresentations={matchedClinicalPresentations}
            matchedCategories={matchedCategories}
            matchedFeatures={matchedFeatures}
          />
        </section>
      </div>
    </div>
  );
}
