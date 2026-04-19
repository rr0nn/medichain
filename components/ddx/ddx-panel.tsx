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
      <header className="flex h-16 shrink-0 items-center px-4">
        <span className="rounded-3xl bg-primary p-2 px-4 text-xl font-bold text-primary-foreground shadow-[0_4px_16px_rgba(27,125,126,0.25)]">
          Differential Diagnosis
        </span>
      </header>

      <div className="glass flex-1 min-h-0 space-y-3 overflow-y-auto rounded-[30px] border border-[color:var(--glass-border)] p-4 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-md">
        <section className="space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Analysis Workflow
            </p>
            <p className="text-xs text-muted-foreground">
              Shows progress through presentation matching, evidence matching, diagnosis ranking, and safety review.
            </p>
          </div>
          <WorkflowCanvas
            steps={steps}
            matchedClinicalPresentationCount={matchedClinicalPresentations.length}
            criticAssessment={criticAssessment}
          />
        </section>
        <section>
          <SafetyReview
            criticAssessment={criticAssessment}
            groundingAssessment={groundingAssessment}
          />
        </section>

        <section className="mt-2 border-t border-[color:var(--glass-border)]/70 pt-5 space-y-2">
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

        <section className="mt-2 border-t border-[color:var(--glass-border)]/70 pt-5">
          <EvidenceSummary
            matchedClinicalPresentations={matchedClinicalPresentations}
            matchedCategories={matchedCategories}
            matchedFeatures={matchedFeatures}
          />
        </section>
      </div>
    </div>
  );
}
