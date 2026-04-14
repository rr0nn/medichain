/**
 * @fileoverview Composes patient-facing replies from grounded workflow output.
 * @contributors Johnson Zhang
 */

import { generateText } from "ai";

import { getDefaultChatModel } from "@/server/ai/core/models";
import type { SafetyWorkflowResult } from "@/server/ai/workflows/safety-workflow/types";

/**
 * Composes a patient-facing explanation from the safety-reviewed differential
 * result. This module only formats grounded workflow output; it does not
 * perform any routing or ask follow-up questions.
 */
export async function composePatientResponse(
  patientDescription: string,
  result: SafetyWorkflowResult,
): Promise<string> {
  const topDifferentials = result.differentials.slice(0, 3).map((differential) => ({
    diagnosisName: differential.diagnosisName,
    score: differential.score,
    evidence: differential.evidence,
  }));

  const { text } = await generateText({
    model: getDefaultChatModel(),
    prompt: `
You are writing a patient-facing summary for a clinical differential diagnosis support tool.

Write a short, calm, empathetic explanation for the patient.

Rules:
- Use only the grounded workflow data provided below.
- Do not ask follow-up questions.
- Do not invent diagnoses, evidence, investigations, or medical advice beyond the provided result.
- Make it clear this is not a confirmed diagnosis and does not replace a clinician.
- Avoid mentioning internal scoring, graph mechanics, or technical workflow terms.
- Use plain language and keep the response concise.

Patient summary:
${patientDescription}

Workflow status:
${result.status}

Top differential diagnoses:
${JSON.stringify(topDifferentials)}

Critic assessment:
${JSON.stringify(result.criticAssessment)}

Grounding assessment:
${JSON.stringify(result.groundingAssessment)}

Return plain text only.
    `,
  });

  return text.trim();
}
