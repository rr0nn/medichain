"use client";

/**
 * @fileoverview Renders the model settings dialog for chat and diagnosis model selection.
 * @contributors Johnson Zhang, Aryan Wadhawan
 */

import { ModelProviderLogo } from "@/components/ai-elements/model-provider-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckIcon, Settings2Icon } from "lucide-react";
import { useState } from "react";

import type {
  ModelCatalog,
  ModelSelectorConfig,
  ModelSelectorKey,
  SelectedModelIds,
} from "@/lib/chat/model-catalog";

type ModelSettingsDialogProps = {
  catalog: ModelCatalog | null;
  isLoading: boolean;
  onModelChange: (selectorKey: ModelSelectorKey, modelId: string) => void;
  selectedModelIds: SelectedModelIds;
};

// Prefer the actively selected model, then the catalog default, then the first
// available catalog entry so the summary UI always has something stable to show.
function getSelectedModel(
  selector: ModelSelectorConfig,
  selectedModelId: string,
) {
  return (
    selector.models.find((option) => option.id === selectedModelId) ??
    selector.models.find((option) => option.id === selector.defaultModelId) ??
    selector.models[0]
  );
}

function ModelOptionsSection(input: {
  onModelChange: (modelId: string) => void;
  selectedModelId: string;
  selector: ModelSelectorConfig;
}) {
  // Group models by provider so the dialog can present a short, scannable list
  // without repeating provider labels on every row.
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
    <section className="space-y-4 rounded-[24px] border border-[color:var(--glass-border)]/90 bg-[color:var(--glass-bg-strong)] p-4 shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-shadow)] backdrop-blur-md">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">
            {input.selector.label}
          </h3>
          <span className="rounded-full border border-[color:var(--glass-border)] bg-background/65 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {input.selector.key === "chat" ? "Orchestration" : "Semantic Match"}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {input.selector.key === "chat"
            ? "Use this for the outer interview flow and tool orchestration."
            : "Use this for the inner semantic matching steps in the DDx workflow."}
        </p>
      </div>

      <div className="space-y-3">
        {modelGroups.map((group) => (
          <div className="space-y-2" key={group.group}>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {group.group}
            </p>
            <div className="space-y-2">
              {group.models.map((option) => {
                const isSelected = input.selectedModelId === option.id;

                return (
                  <button
                    type="button"
                    key={option.id}
                    disabled={!option.available}
                    onClick={() => {
                      if (!option.available) {
                        return;
                      }

                      input.onModelChange(option.id);
                    }}
                    className={[
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
                      option.available
                        ? "hover:border-[color:var(--glass-border)]/90 hover:bg-background/80"
                        : "cursor-not-allowed border-dashed opacity-60",
                      isSelected
                        ? "border-primary/30 bg-primary/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                        : "border-[color:var(--glass-border)] bg-background/60 text-foreground",
                    ].join(" ")}
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--glass-border)] bg-background/75 shadow-[inset_0_1px_0_var(--glass-highlight)]">
                      <ModelProviderLogo provider={option.provider} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {option.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {option.available
                          ? `${group.group} provider`
                          : "Unavailable in current environment"}
                      </p>
                    </div>
                    {option.available ? (
                      isSelected ? (
                        <CheckIcon className="size-4 shrink-0 text-primary" />
                      ) : (
                        <div className="size-4 shrink-0" />
                      )
                    ) : (
                      <span className="shrink-0 rounded-full border border-[color:var(--glass-border)] bg-background/75 px-2 py-1 text-[11px] text-muted-foreground">
                        Unavailable
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ModelSettingsDialog({
  catalog,
  isLoading,
  onModelChange,
  selectedModelIds,
}: ModelSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const selectors = catalog?.selectors ?? [];
  const chatSelector = selectors.find((selector) => selector.key === "chat");
  const diagnosisSelector = selectors.find(
    (selector) => selector.key === "diagnosis",
  );
  const selectedChatModel = chatSelector
    ? getSelectedModel(chatSelector, selectedModelIds.chat)
    : null;
  const selectedDiagnosisModel = diagnosisSelector
    ? getSelectedModel(diagnosisSelector, selectedModelIds.diagnosis)
    : null;
  const modelSummary =
    selectedChatModel && selectedDiagnosisModel
      ? `${selectedChatModel.label} / ${selectedDiagnosisModel.label}`
      : "Configure chat and diagnosis models";

  // Keep a compact summary at the top of the dialog so users can confirm the
  // current configuration before changing either selector.
  const summaryItems = [
    {
      label: "Chat",
      value: selectedChatModel?.label ?? "Not selected",
    },
    {
      label: "Diagnosis",
      value: selectedDiagnosisModel?.label ?? "Not selected",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger Button - Keeps model configuration available from the header
          without forcing two full selectors into the main toolbar. */}
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || !catalog}
          className="h-auto w-full min-w-0 basis-[14rem] justify-between rounded-xl border-[color:var(--glass-border)] bg-background/55 py-2 sm:max-w-[220px] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm hover:bg-background/70"
        >
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Models
            </p>
            <span className="block truncate text-sm text-foreground">
              {catalog ? modelSummary : "Loading model options"}
            </span>
          </div>
          <Settings2Icon className="shrink-0 text-muted-foreground" />
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-5 border border-[color:var(--glass-border)] bg-[color:var(--glass-bg-strong)] p-5 shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-shadow)] backdrop-blur-xl sm:max-w-3xl sm:rounded-[28px]">
        {/* Dialog Header - Explains why chat and diagnosis models are split. */}
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base">Model Settings</DialogTitle>
          <DialogDescription className="max-w-2xl leading-relaxed">
            Use a stronger chat model for orchestration and a lighter
            diagnosis model for semantic matching when you want to reduce
            cost.
          </DialogDescription>
        </DialogHeader>

        {/* Current Selection Summary - Shows the active chat/diagnosis pair at a glance. */}
        <div className="grid gap-2 rounded-[22px] border border-[color:var(--glass-border)] bg-background/55 p-3 shadow-[inset_0_1px_0_var(--glass-highlight)] sm:grid-cols-2">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-background/70 px-3 py-2.5"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {item.label} Model
              </p>
              <p className="mt-1 truncate text-sm font-medium text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Selector Sections - Render each selector independently so both
            models can evolve without coupling their presentation logic. */}
        <div className="grid gap-4 lg:grid-cols-2">
          {chatSelector ? (
            <ModelOptionsSection
              onModelChange={(modelId) => onModelChange("chat", modelId)}
              selectedModelId={selectedModelIds.chat}
              selector={chatSelector}
            />
          ) : null}
          {diagnosisSelector ? (
            <ModelOptionsSection
              onModelChange={(modelId) => onModelChange("diagnosis", modelId)}
              selectedModelId={selectedModelIds.diagnosis}
              selector={diagnosisSelector}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
