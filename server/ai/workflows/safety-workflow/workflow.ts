import {
  getFeaturesForClinicalPresentations,
} from "@/server/ai/tools/knowledge-graph/knowledge-graph";
import { runDifferentialDiagnosisWorkflow } from "@/server/ai/workflows/ddx-workflow/workflow";
import type { WorkflowStepEvent } from "@/server/ai/workflows/ddx-workflow/types";

import { reviewDifferentialConfidence } from "./critic";
import { reviewDifferentialGrounding } from "./grounding";
import { buildNeedsMoreInformationResult } from "./needs-more-information";
import type {
  CriticAssessment,
  GroundingAssessment,
  SafetyWorkflowResult,
} from "./types";

type OnStep = (event: WorkflowStepEvent) => void;

function mergeSafetyAssessments(input: {
  criticAssessment: CriticAssessment;
  groundingAssessment: GroundingAssessment;
}): CriticAssessment {
  const shouldReturnToInterview =
    !input.groundingAssessment.isGrounded || !input.criticAssessment.isConfident;

  if (!shouldReturnToInterview) {
    return input.criticAssessment;
  }

  return {
    ...input.criticAssessment,
    isConfident: false,
    shouldReturnToInterview: true,
    confidenceLabel:
      input.groundingAssessment.groundedDifferentialCount === 0
        ? "low"
        : input.criticAssessment.confidenceLabel,
    reasons: [
      ...input.groundingAssessment.reasons,
      ...input.criticAssessment.reasons,
    ],
  };
}

/**
 * Runs the safety workflow on top of the core DDX workflow by reviewing
 * confidence and generating follow-up questions when the differential is weak.
 */
export async function runSafetyWorkflow(
  patientDescription: string,
  onStep?: OnStep
): Promise<SafetyWorkflowResult> {
  const ddxResult = await runDifferentialDiagnosisWorkflow(patientDescription, onStep);

  // First, audit every returned diagnosis path directly against Neo4j so the
  // safety workflow only evaluates differentials that still exist in the graph.
  const groundingResult = await reviewDifferentialGrounding({
    differentials: ddxResult.differentials,
  });
  const groundedDdxResult = {
    ...ddxResult,
    differentials: groundingResult.differentials,
  };

  // Then run the critic on the audited differential list rather than the raw
  // DDX output, so confidence never depends on unsupported graph paths.
  onStep?.({ type: "step", step: "critic_review", status: "running" });
  const criticAssessment = reviewDifferentialConfidence(
    groundedDdxResult.differentials
  );
  onStep?.({ type: "step", step: "critic_review", status: "complete" });

  const mergedCriticAssessment = mergeSafetyAssessments({
    criticAssessment,
    groundingAssessment: groundingResult.assessment,
  });

  // Any grounding failure or confidence failure routes the case back to the
  // interview loop with the audited differential state attached.
  if (mergedCriticAssessment.shouldReturnToInterview) {
    const candidateFeatures = await getFeaturesForClinicalPresentations(
      groundedDdxResult.matchedClinicalPresentations.map((match) => match.key)
    );

    return buildNeedsMoreInformationResult(
      groundedDdxResult.matchedClinicalPresentations,
      groundedDdxResult.matchedCategories,
      groundedDdxResult.matchedFeatures,
      candidateFeatures,
      groundedDdxResult.differentials,
      mergedCriticAssessment,
      groundingResult.assessment,
    );
  }

  return {
    ...groundedDdxResult,
    status: "ready_for_review",
    criticAssessment: mergedCriticAssessment,
    groundingAssessment: groundingResult.assessment,
    candidateFeatures: [],
  };
}
