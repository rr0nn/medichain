"use client";

import type { ModelProvider } from "@/server/ai/core/models";

interface ModelSelectorProps {
  value: ModelProvider;
  onChange: (provider: ModelProvider) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Model</span>
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value as ModelProvider)}
        disabled={disabled}
        aria-label="Select AI model"
      >
        <option value="gemini">Gemini 2.5 Flash</option>
        <option value="claude">Claude Sonnet 4</option>
      </select>
    </label>
  );
}
