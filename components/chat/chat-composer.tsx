"use client";

/**
 * @fileoverview Renders the chat composer.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import { Button } from "@/components/ui/button";
import { ArrowUpIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type ChatComposerProps = {
  activeConversationId: string | null;
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({
  activeConversationId,
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = Boolean(input.trim()) && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit();
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [input]);

  useEffect(() => {
    if (activeConversationId || isLoading) {
      return;
    }

    textareaRef.current?.focus();
  }, [activeConversationId, isLoading]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="shrink-0 border-t border-[color:var(--glass-border)]/80 bg-background/30 p-3 backdrop-blur-sm"
    >
      {/* Composer Shell - Keeps the intake form visually separated from the transcript. */}
      <div className="rounded-[26px] border border-[color:var(--glass-border)] bg-background/65 px-3 py-3 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] focus-within:border-[color:color-mix(in_oklch,var(--ring)_48%,var(--glass-border))] focus-within:bg-background/75 focus-within:shadow-[inset_0_1px_0_var(--glass-highlight),0_0_0_1px_var(--ring),var(--shadow-brand)]">
        {/* Composer Header - Labels the input and shows keyboard guidance. */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Patient Intake
          </p>
          <p className="text-[11px] text-muted-foreground sm:text-right">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>

        {/* Composer Input Row - Combines the textarea with the send action. */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            rows={1}
            value={input}
            placeholder={
              activeConversationId
                ? "Describe the patient presentation, timing, severity, and relevant findings..."
                : "Describe the presenting complaint to start a consultation..."
            }
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                return;
              }

              if (event.metaKey || event.ctrlKey) {
                return;
              }

              if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />

          {/* Send Button - Submits the current intake note when input is valid. */}
          <Button
            size="icon-sm"
            type="submit"
            disabled={!canSubmit}
            className="shrink-0 rounded-2xl shadow-[var(--shadow-brand)]"
          >
            <ArrowUpIcon />
          </Button>
        </div>
      </div>
    </form>
  );
}
