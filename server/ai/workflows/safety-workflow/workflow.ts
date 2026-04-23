/**
 * @fileoverview Runs safety review over differential results before the final response is composed.
 * @contributors Johnson Zhang, John Kollannur
 */

import { getFeaturesForClinicalPresentations } from "@/server/ai/tools/knowledge-graph/knowledge-graph";
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
    !input.groundingAssessment.isGrounded ||
    !input.criticAssessment.isConfident;

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
 * Runs safety review on top of the core differential diagnosis workflow.
 *
 * Audits graph grounding before confidence review so unsupported diagnosis
 * paths never influence whether the interview loop continues or a review-ready
 * response is returned.
 */
export async function runSafetyWorkflow(
  patientDescription: string,
  onStep?: OnStep,
  diagnosisModelId?: string,
): Promise<SafetyWorkflowResult> {
  // Run the core DDX workflow first and treat its output as a candidate result,
  // not yet something safe to present back through the interview layer.
  const ddxResult = await runDifferentialDiagnosisWorkflow(
    patientDescription,
    onStep,
    diagnosisModelId,
  );

  onStep?.({ type: "step", step: "safety_review", status: "running" });

  // Audit the returned evidence paths directly against Neo4j before confidence
  // review so the critic never scores unsupported graph output.
  const groundingResult = await reviewDifferentialGrounding({
    differentials: ddxResult.differentials,
  });
  const groundedDdxResult = {
    ...ddxResult,
    differentials: groundingResult.differentials,
  };

  // Confidence review happens after grounding so the critic only evaluates the
  // diagnosis set that still survives direct graph verification.
  const criticAssessment = reviewDifferentialConfidence(
    groundedDdxResult.differentials,
  );
  onStep?.({ type: "step", step: "safety_review", status: "complete" });

  // Merge grounding and confidence into one routing decision because either
  // failure mode means the interview loop should continue gathering history.
  const mergedCriticAssessment = mergeSafetyAssessments({
    criticAssessment,
    groundingAssessment: groundingResult.assessment,
  });

  // Route the case back to the interviewer whenever grounding or confidence is
  // insufficient, and attach the audited differential state for follow-up.
  if (mergedCriticAssessment.shouldReturnToInterview) {
    const candidateFeatures = await getFeaturesForClinicalPresentations(
      groundedDdxResult.matchedClinicalPresentations.map((match) => match.key),
    );

    // Return the audited state plus candidate graph features so the interview
    // agent can ask better follow-up questions without inventing unsupported detail.
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

  // Only reach the review-ready state when the differential remains grounded
  // and confident enough after both safety gates have run.
  return {
    ...groundedDdxResult,
    status: "ready_for_review",
    criticAssessment: mergedCriticAssessment,
    groundingAssessment: groundingResult.assessment,
    candidateFeatures: [],
  };
}
