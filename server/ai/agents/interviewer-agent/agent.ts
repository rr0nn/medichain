import { generateText, Output } from "ai";
import { z } from "zod";

import { getDefaultDiagnosisModel } from "@/server/ai/core/models";
import type { FeatureRecord } from "@/server/ai/tools/knowledge-graph/types";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
} from "@/server/ai/workflows/ddx-workflow/types";
import type {
  CriticAssessment,
  FollowUpQuestion,
} from "@/server/ai/workflows/safety-workflow/types";

const interviewerOutputSchema = z.object({
  followUpQuestions: z
    .array(
      z.object({
        question: z.string(),
        reason: z.string(),
      }),
    )
    .min(1)
    .max(3),
});

type RunInterviewerAgentInput = {
  patientDescription: string;
  matchedClinicalPresentations: ClinicalPresentationMatch[];
  matchedCategories: CategoryMatch[];
  differentials: DifferentialDiagnosis[];
  candidateFeatures: FeatureRecord[];
  criticAssessment: CriticAssessment;
};

/**
 * Builds targeted follow-up questions when the critic decides the current
 * differential is too weak or ambiguous.
 * 
 * The interviewer uses graph-linked features when available so the questions
 * stay anchored to the shortlisted clinical presentations rather than drifting
 * into generic questioning.
 * 
 * @param input Current case summary, graph matches, differential results, and candidate features.
 * @returns One to three targeted follow-up questions.
 */
export async function runInterviewerAgent(
  input: RunInterviewerAgentInput,
): Promise<FollowUpQuestion[]> {
  const { output } = await generateText({
    model: getDefaultDiagnosisModel(),
    prompt: `
You are the interviewer agent in a clinical decision support workflow.

Your job is to ask the next best follow-up questions when the diagnosis is not yet confident.

Rules:
- Ask between 1 and 3 focused follow-up questions only.
- Each question should target missing diagnostic information.
- Prefer questions grounded in the candidate graph features when those are available.
- Do not ask for investigations, imaging, examination findings, or treatment.
- Ask history or symptom clarification questions only.
- Keep the questions concise and patient-facing.
- Do not repeat information that is already clearly present in the patient description.
- If there are no strong graph matches yet, ask broad clarification questions about onset, site, character, associated symptoms, and relevant history.

Patient description:
${JSON.stringify(input.patientDescription)}

Matched clinical presentations:
${JSON.stringify(input.matchedClinicalPresentations)}

Matched categories:
${JSON.stringify(input.matchedCategories)}

Top differentials:
${JSON.stringify(input.differentials.slice(0,3))}

Critic assessment:
${JSON.stringify(input.criticAssessment)}

Candidate graph features:
${JSON.stringify(
  input.candidateFeatures.map((feature) => ({
    clinicalPresentationKey: feature.clinicalPresentationKey,
    featureKey: feature.featureKey,
    featureType: feature.featureType ?? null,
    featureName: feature.featureName,
  })),
)}

Return JSON only.
    `,
    output: Output.object({
      schema: interviewerOutputSchema,
    }),
  });

  // Attach stable IDs so the frontend can later render or track each question.
  return output.followUpQuestions.map((question, index) => ({
    id: `follow-up-${index + 1}`,
    question: question.question,
    reason: question.reason,
  }));
}
