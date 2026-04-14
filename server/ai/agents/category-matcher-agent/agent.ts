/**
 * @fileoverview Matches a patient description to the most relevant diagnosis categories.
 * @contributors Johnson Zhang
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import { getDefaultDiagnosisModel } from "@/server/ai/core/models";
import type { CategoryRecord } from "@/server/ai/tools/knowledge-graph/types";

const categoryMatchSchema = z.object({
  matches: z.array(
    z.object({
      key: z.string(),
      // Model-reported match strength on a 0..1 scale. Only ranking signal, not a calibrated probability.
      score: z.number().min(0).max(1),
      matchedText: z.array(z.string()).default([]),
    })
  ),
});

export async function matchCategories(
  patientDescription: string,
  clinicalPresentation: { key: string; name: string },
  categories: CategoryRecord[]
) {
  const { output } = await generateText({
    model: getDefaultDiagnosisModel(),
    prompt: `
You are matching patient wording to category nodes within one clinical presentation.

Rules:
- Only choose from the category keys provided.
- Do not invent keys.
- Return an empty array if the match is weak.
- Use anatomical clues from the patient description.
- Match only categories relevant to the given clinical presentation.
- Treat score as relative match strength for ranking, not as a probability.

Clinical presentation:
${JSON.stringify(clinicalPresentation)}

Patient description:
${JSON.stringify(patientDescription)}

Candidate categories:
${JSON.stringify(
  categories.map((category) => ({
    key: category.categoryKey,
    name: category.categoryName,
    normalized_name: category.categoryNormalizedName,
  }))
)}

Return JSON only.
    `,
    output: Output.object({
      schema: categoryMatchSchema,
    }),
  });

  return output;
}
