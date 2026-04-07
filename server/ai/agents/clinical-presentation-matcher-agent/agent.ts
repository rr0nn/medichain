// Clinical presentation matcher agent:
// maps free-text patient wording to candidate clinical presentation nodes,
// returning ranked presentation-key matches for downstream selection.
import { generateText, Output } from "ai";
import { z } from "zod";

import { getDiagnosisModel, type ModelProvider } from "@/server/ai/core/models";
import type { ClinicalPresentationRecord } from "@/server/ai/tools/knowledge-graph/types";

const clinicalPresentationMatchSchema = z.object({
  matches: z.array(
    z.object({
      key: z.string(),
      // Model-reported match strength on a 0..1 scale. This is a ranking signal, not a calibrated probability.
      score: z.number().min(0).max(1),
      matchedText: z.array(z.string()).default([]),
    })
  ),
});

export async function matchClinicalPresentations(
  patientDescription: string,
  candidates: ClinicalPresentationRecord[],
  modelProvider?: ModelProvider,
) {
  const { output } = await generateText({
    model: getDiagnosisModel(modelProvider),
    prompt: `
You are matching patient wording to graph nodes.

Rules:
- Only choose from the candidate keys provided.
- Do not invent keys.
- Match the presenting complaint, not the final diagnosis.
- Return an empty array if the match is weak.
- Prefer broad symptom/presentation matching.
- Treat score as relative match strength for ranking, not as a probability.

Patient description:
${JSON.stringify(patientDescription)}

Candidate clinical presentations:
${JSON.stringify(candidates)}

Return JSON only.
    `,
    output: Output.object({
      schema: clinicalPresentationMatchSchema,
    }),
  });

  return output;
}
