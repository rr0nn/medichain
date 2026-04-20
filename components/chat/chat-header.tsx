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
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import type {
  ModelCatalog,
  ModelSelectorConfig,
  ModelSelectorKey,
  SelectedModelIds,
} from "@/lib/chat/model-catalog";

type ChatHeaderProps = {
  catalog: ModelCatalog | null;
  isLoading: boolean;
  onModelChange: (selectorKey: ModelSelectorKey, modelId: string) => void;
  selectedModelIds: SelectedModelIds;
};

function ModelPicker(input: {
  isLoading: boolean;
  onModelChange: (modelId: string) => void;
  selectedModelId: string;
  selector: ModelSelectorConfig;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel =
    input.selector.models.find((option) => option.id === input.selectedModelId) ??
    input.selector.models.find(
      (option) => option.id === input.selector.defaultModelId,
    ) ??
    input.selector.models[0];
  const modelGroups = input.selector.models.reduce<
    Array<{ group: string; models: ModelSelectorConfig["models"] }>
  >((groups, option) => {
    const existingGroup = groups.find((group) => group.group === option.group);

    if (existingGroup) {
      existingGroup.models.push(option);
      return groups;
    }

    groups.push({ group: option.group, models: [option] });
    return groups;
  }, []);

  return (
    <ModelSelector open={isOpen} onOpenChange={setIsOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={input.isLoading}
          className="h-auto w-full min-w-0 basis-[15rem] justify-between rounded-xl border-[color:var(--glass-border)] bg-background/55 py-2 sm:max-w-[220px] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm hover:bg-background/70"
        >
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {input.selector.label}
            </p>
            <div className="flex min-w-0 items-center gap-2">
              {selectedModel ? (
                <ModelSelectorLogo provider={selectedModel.provider} />
              ) : null}
              <ModelSelectorName className="text-sm text-foreground">
                {selectedModel?.label ?? "Loading model options"}
              </ModelSelectorName>
            </div>
          </div>
          <ChevronDownIcon className="shrink-0 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>

      <ModelSelectorContent title={input.selector.title} className="sm:max-w-sm">
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {modelGroups.map((group) => (
            <ModelSelectorGroup heading={group.group} key={group.group}>
              {group.models.map((option) => (
                  <ModelSelectorItem
                    disabled={!option.available}
                    key={option.id}
                    value={option.label}
                    onSelect={() => {
                      if (!option.available) {
                        return;
                      }

                      input.onModelChange(option.id);
                      setIsOpen(false);
                    }}
                  >
                    <ModelSelectorLogo provider={option.provider} />
                    <ModelSelectorName
                      className={!option.available ? "text-muted-foreground" : undefined}
                    >
                      {option.label}
                    </ModelSelectorName>
                    {!option.available ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Unavailable
                      </span>
                    ) : input.selectedModelId === option.id ? (
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
  );
}

export function ChatHeader({
  catalog,
  isLoading,
  onModelChange,
  selectedModelIds,
}: ChatHeaderProps) {
  const selectors = catalog?.selectors ?? [];

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
        {selectors.map((selector) => (
          <ModelPicker
            key={selector.key}
            isLoading={isLoading}
            onModelChange={(modelId) => onModelChange(selector.key, modelId)}
            selectedModelId={selectedModelIds[selector.key]}
            selector={selector}
          />
        ))}
        <ThemeSelector />
      </div>
    </header>
  );
}
