"use client";

/**
 * @fileoverview Renders the chat header controls.
 * @contributors Johnson Zhang, Aryan Wadhawan
 */

import { ModelSettingsDialog } from "@/components/chat/model-settings-dialog";
import { ThemeSelector } from "@/components/theme/theme-selector";

import type {
  ModelCatalog,
  ModelSelectorKey,
  SelectedModelIds,
} from "@/lib/chat/model-catalog";

type ChatHeaderProps = {
  catalog: ModelCatalog | null;
  isLoading: boolean;
  onModelChange: (selectorKey: ModelSelectorKey, modelId: string) => void;
  onStartNewConversation: () => void;
  selectedModelIds: SelectedModelIds;
};

export function ChatHeader({
  catalog,
  isLoading,
  onModelChange,
  onStartNewConversation,
  selectedModelIds,
}: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[color:var(--glass-border)]/80 px-4 py-3 sm:px-5">
      {/* Brand Block - Shows the product identity for the chat workspace. */}
      <button
        type="button"
        onClick={onStartNewConversation}
        disabled={isLoading}
        title="Start a new consultation"
        className="inline-flex h-14 w-[12.5rem] shrink-0 items-center gap-3 rounded-[22px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg-strong)] px-3 py-2 text-left shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-shadow)] backdrop-blur-md transition-colors hover:bg-[color:var(--glass-bg)] disabled:cursor-default disabled:opacity-100"
      >
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
      </button>

      {/* Header Controls - Groups model selection and theme controls. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <ModelSettingsDialog
          catalog={catalog}
          isLoading={isLoading}
          onModelChange={onModelChange}
          selectedModelIds={selectedModelIds}
        />
        <ThemeSelector />
      </div>
    </header>
  );
}
