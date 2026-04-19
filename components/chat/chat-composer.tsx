"use client";

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
        onSubmit();
      }}
      className="shrink-0 border-t border-[color:var(--glass-border)] p-3"
    >
      {!activeConversationId && (
        <p className="mb-2 text-center text-xs text-muted-foreground">
          Start a new consultation from the sidebar to begin.
        </p>
      )}
      <div className="flex items-center gap-2 rounded-3xl border border-[color:var(--glass-border)] bg-background/80 px-3 py-3 shadow-[inset_0_1px_0_var(--glass-highlight)] transition-shadow focus-within:ring-1 focus-within:ring-ring">
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
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          disabled={isLoading || !activeConversationId}
        />
        <Button
          size="icon-sm"
          type="submit"
          disabled={!input.trim() || isLoading || !activeConversationId}
        >
          <ArrowUpIcon />
        </Button>
      </div>
      <p className="mt-1.5 mr-3 text-right text-[11px] text-muted-foreground">
        ⌘↵ to send
      </p>
    </form>
  );
}
