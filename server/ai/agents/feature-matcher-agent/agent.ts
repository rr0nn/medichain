import { generateText, Output } from "ai";
import { z } from "zod";

import { getDefaultDiagnosisModel } from "@/server/ai/core/models";
import type { FeatureRecord } from "@/server/ai/tools/knowledge-graph/types";

const SUPPORTED_FEATURE_TYPES = [
  "history",
  "past_history",
  "pain",
  "associated_symptom",
  "precipitating_factor",
  "relieving_factor",
  "character",
  "site",
  "onset",
  "age",
  "trauma",
  "associated_factor",
] as const;

const featureMatchSchema = z.object({
  matches: z.array(
    z.object({
      key: z.string(),
      score: z.number().min(0).max(1),
      matchedText: z.array(z.string()).default([]),
    })
  ),
});

export async function matchFeatures(
  patientDescription: string,
  clinicalPresentation: { key: string; name: string },
  features: FeatureRecord[]
) {
  const { output } = await generateText({
    model: getDefaultDiagnosisModel(),
    prompt: `
You are matching patient wording to feature nodes within one clinical presentation.

Rules:
- Only choose from the feature keys provided.
- Do not invent keys.
- Return an empty array if the match is weak.
- Prefer concrete symptoms, signs, and descriptors stated or strongly implied by the patient description.
- Match only features relevant to the given clinical presentation.
- Use feature type to interpret the role of each feature in the history.
- Reason explicitly over these feature types when present: ${SUPPORTED_FEATURE_TYPES.join(", ")}.
- Examples: pain/site/onset/character should capture pain semantics; precipitating_factor and relieving_factor should capture what makes symptoms worse or better; past_history and trauma should capture background context rather than current symptom wording.
- Treat score as relative match strength for ranking, not as a probability.

Clinical presentation:
${JSON.stringify(clinicalPresentation)}

Patient description:
${JSON.stringify(patientDescription)}

Candidate features:
${JSON.stringify(
  features.map((feature) => ({
    key: feature.featureKey,
    name: feature.featureName,
    normalized_name: feature.featureNormalizedName,
    feature_type: feature.featureType ?? null,
  }))
)}

Return JSON only.
    `,
    output: Output.object({
      schema: featureMatchSchema,
    }),
  });

  return output;
}
