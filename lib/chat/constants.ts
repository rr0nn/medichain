/**
 * @fileoverview Shared client-side chat UI constants.
 * @contributors Johnson Zhang
 */

import type { ModelProvider } from "@/server/ai/core/models";

export const STARTER_PROMPTS = [
  "52-year-old with crushing central chest pain radiating to the left arm for 2 hours.",
  "Child with fever, cough, increased work of breathing, and reduced oral intake.",
  "Progressive right lower quadrant pain with nausea, anorexia, and guarding.",
] as const;

export const MODEL_OPTIONS: Array<{
  value: ModelProvider;
  label: string;
  provider: "google" | "anthropic";
  group: "Google" | "Anthropic";
}> = [
  {
    value: "gemini",
    label: "Gemini 2.5 Flash",
    provider: "google",
    group: "Google",
  },
  {
    value: "claude",
    label: "Claude Sonnet 4.5",
    provider: "anthropic",
    group: "Anthropic",
  },
];
