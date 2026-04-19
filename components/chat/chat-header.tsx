"use client";

/**
 * @fileoverview Renders the chat header with branding, model selection, and theme controls.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { ModelProvider } from "@/server/ai/core/models";

const MODEL_OPTIONS: Array<{
  value: ModelProvider;
  label: string;
  provider: "google" | "anthropic";
  group: "Google" | "Anthropic";
}> = [
  { value: "gemini", label: "Gemini 2.5 Flash", provider: "google", group: "Google" },
  { value: "claude", label: "Claude Sonnet 4.5", provider: "anthropic", group: "Anthropic" },
];

type ChatHeaderProps = {
  modelProvider: ModelProvider;
  onModelChange: (provider: ModelProvider) => void;
  isLoading: boolean;
};

export function ChatHeader({
  modelProvider,
  onModelChange,
  isLoading,
}: ChatHeaderProps) {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const selectedModel =
    MODEL_OPTIONS.find((option) => option.value === modelProvider) ?? MODEL_OPTIONS[0];
  const modelGroups = useMemo(
    () => [...new Set(MODEL_OPTIONS.map((option) => option.group))],
    [],
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-4">
      <span className="rounded-3xl bg-primary p-2 px-4 text-xl font-bold text-primary-foreground shadow-[0_4px_16px_rgba(27,125,126,0.25)]">
        MediChain
      </span>
      <div className="flex items-center gap-4">
        <ModelSelector
          open={isModelSelectorOpen}
          onOpenChange={setIsModelSelectorOpen}
        >
          <ModelSelectorTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="w-[220px] justify-between rounded-xl border-[color:var(--glass-border)] bg-background/80 shadow-[inset_0_1px_0_var(--glass-highlight)]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <ModelSelectorLogo provider={selectedModel.provider} />
                <ModelSelectorName>{selectedModel.label}</ModelSelectorName>
              </div>
              <ChevronDownIcon className="shrink-0 text-muted-foreground" />
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent title="Select model" className="sm:max-w-sm">
            <ModelSelectorInput placeholder="Search models..." />
            <ModelSelectorList>
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              {modelGroups.map((group) => (
                <ModelSelectorGroup heading={group} key={group}>
                  {MODEL_OPTIONS
                    .filter((option) => option.group === group)
                    .map((option) => (
                      <ModelSelectorItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => {
                          onModelChange(option.value);
                          setIsModelSelectorOpen(false);
                        }}
                      >
                        <ModelSelectorLogo provider={option.provider} />
                        <ModelSelectorName>{option.label}</ModelSelectorName>
                        {modelProvider === option.value ? (
                          <CheckIcon className="ml-auto size-4" />
                        ) : (
                          <div className="ml-auto size-4" />
                        )}
                      </ModelSelectorItem>
                    ))}
                </ModelSelectorGroup>
              ))}
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>
        <ThemeSelector />
      </div>
    </header>
  );
}
