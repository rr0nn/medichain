import {
  getFeaturesForClinicalPresentations,
} from "@/server/ai/tools/knowledge-graph/knowledge-graph";
import { runDifferentialDiagnosisWorkflow } from "@/server/ai/workflows/ddx-workflow/workflow";
import type { WorkflowStepEvent } from "@/server/ai/workflows/ddx-workflow/types";

import { reviewDifferentialConfidence } from "./critic";
import { buildNeedsMoreInformationResult } from "./needs-more-information";
import type { SafetyWorkflowResult } from "./types";

type OnStep = (event: WorkflowStepEvent) => void;

/**
 * Runs the safety workflow on top of the core DDX workflow by reviewing
 * confidence and generating follow-up questions when the differential is weak.
 */
export async function runSafetyWorkflow(
  patientDescription: string,
  onStep?: OnStep
): Promise<SafetyWorkflowResult> {
  const ddxResult = await runDifferentialDiagnosisWorkflow(patientDescription, onStep);

  onStep?.({ type: "step", step: "critic_review", status: "running" });
  const criticAssessment = reviewDifferentialConfidence(ddxResult.differentials);
  onStep?.({ type: "step", step: "critic_review", status: "complete" });

  if (!criticAssessment.isConfident) {
    const candidateFeatures = await getFeaturesForClinicalPresentations(
      ddxResult.matchedClinicalPresentations.map((match) => match.key)
    );

    return buildNeedsMoreInformationResult(
      patientDescription,
      ddxResult.matchedClinicalPresentations,
      ddxResult.matchedCategories,
      ddxResult.matchedFeatures,
      candidateFeatures,
      ddxResult.differentials,
      criticAssessment,
      onStep
    );
  }

  return {
    ...ddxResult,
    status: "ready_for_review",
    criticAssessment,
    followUpQuestions: [],
  };
}
