"use client";

/**
 * @fileoverview Renders the chat header controls.
 * @contributors Johnson Zhang, Aryan Wadhawan
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
import { MODEL_OPTIONS } from "@/lib/chat/constants";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { ModelProvider } from "@/server/ai/core/models";

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
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[color:var(--glass-border)]/80 px-4 py-3 sm:px-5">
      {/* Brand Block - Shows the product identity for the chat workspace. */}
      <div className="inline-flex h-14 w-[12.5rem] shrink-0 items-center gap-3 rounded-[22px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg-strong)] px-3 py-2 shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-shadow)] backdrop-blur-md">
        {/* Simple placeholder brand mark for the prototype header. */}
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[inset_0_1px_0_var(--glass-highlight)]">
          <span className="size-2 rounded-full bg-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            KG-Grounded
          </p>
          <p className="text-lg font-semibold leading-none text-foreground">
            MediChain
          </p>
        </div>
      </div>

      {/* Header Controls - Groups model selection and theme controls. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <ModelSelector
          open={isModelSelectorOpen}
          onOpenChange={setIsModelSelectorOpen}
        >
          {/* Model Picker - Lets users switch the active chat model for this consultation. */}
          <ModelSelectorTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-auto w-full min-w-0 basis-[15rem] justify-between rounded-xl border-[color:var(--glass-border)] bg-background/55 py-2 sm:max-w-[220px] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm hover:bg-background/70"
            >
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Chat Model
                </p>
                <div className="flex min-w-0 items-center gap-2">
                  <ModelSelectorLogo provider={selectedModel.provider} />
                  <ModelSelectorName className="text-sm text-foreground">
                    {selectedModel.label}
                  </ModelSelectorName>
                </div>
              </div>
              <ChevronDownIcon className="shrink-0 text-muted-foreground" />
            </Button>
          </ModelSelectorTrigger>

          {/* Model Menu - Organizes available chat models by provider. */}
          <ModelSelectorContent title="Select chat model" className="sm:max-w-sm">
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
