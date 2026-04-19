"use client";

/**
 * @fileoverview Renders the chat composer used to submit new consultation messages.
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
  const canSubmit = Boolean(input.trim()) && !isLoading && Boolean(activeConversationId);

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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="shrink-0 border-t border-[color:var(--glass-border)]/80 bg-background/30 p-3 backdrop-blur-sm"
    >
      {!activeConversationId && (
        <p className="mb-2 rounded-xl border border-[color:var(--glass-border)] bg-background/35 px-3 py-2 text-center text-xs text-muted-foreground shadow-[inset_0_1px_0_var(--glass-highlight)]">
          Start a new consultation from the sidebar to begin.
        </p>
      )}
      <div className="flex items-center gap-2 rounded-3xl border border-[color:var(--glass-border)] bg-background/65 px-3 py-3 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm transition-shadow focus-within:ring-1 focus-within:ring-ring">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          rows={1}
          value={input}
          placeholder={
            activeConversationId
              ? "Describe a patient presentation..."
              : "Select a consultation first..."
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
          disabled={isLoading || !activeConversationId}
        />
        <Button
          size="icon-sm"
          type="submit"
          disabled={!canSubmit}
        >
          <ArrowUpIcon />
        </Button>
      </div>
    </form>
  );
}
