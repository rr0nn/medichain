"use client";

import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon } from "lucide-react";
import { DdxPanel } from "@/components/ddx-panel";
import type { WorkflowStepState } from "@/components/ddx-workflow-canvas";
import type { WorkflowStepEvent } from "@/server/ai/workflows/ddx-workflow/workflow";
import type { DifferentialDiagnosis } from "@/server/ai/workflows/ddx-workflow/types";

const initialSteps: WorkflowStepState = {
  match_presentations: "idle",
  match_categories: "idle",
  fetch_diagnoses: "idle",
  group_diagnoses: "idle",
};

export default function Chat() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  const steps = useMemo<WorkflowStepState>(() => {
    if (status === "submitted") {
      return initialSteps;
    }

    const lastMsg = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastMsg) return initialSteps;

    const newSteps: WorkflowStepState = { ...initialSteps };
    for (const part of lastMsg.parts) {
      if (part.type === "data-step") {
        const event = (part as { type: string; data: WorkflowStepEvent }).data;
        newSteps[event.step] = event.status;
      }
    }

    return newSteps;
  }, [messages, status]);

  const differentials = useMemo<DifferentialDiagnosis[]>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (
          isToolUIPart(part) &&
          getToolName(part) === "runDifferentialDiagnosis" &&
          part.state === "output-available"
        ) {
          const output = part.output as
            | { differentials?: DifferentialDiagnosis[] }
            | undefined;
          return output?.differentials ?? [];
        }
      }
    }
    return [];
  }, [messages]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Chat Panel */}
      <div className="flex flex-col w-1/2 border-r border-border min-h-0">
        <header className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <span className="font-semibold text-sm">MediChain</span>
        </header>

        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {messages.length === 0 && !isLoading ? (
              <ConversationEmptyState
                title="Describe patient issues"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <MessageResponse key={i}>{part.text}</MessageResponse>
                        );
                      }
                      if (
                        isToolUIPart(part) &&
                        (part.state === "input-streaming" ||
                          part.state === "input-available")
                      ) {
                        return (
                          <p
                            key={i}
                            className="text-xs text-muted-foreground italic"
                          >
                            Look on the rifht side running ddx . . .
                          </p>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))
            )}

            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <div className="flex gap-1 py-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <form onSubmit={submit} className="shrink-0 p-3 border-t border-border">
          <div className="flex items-end gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
              rows={1}
              value={input}
              placeholder="Describe a patient presentation..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              disabled={isLoading}
            />
            <Button
              size="icon-sm"
              type="submit"
              disabled={!input.trim() || isLoading}
            >
              <ArrowUpIcon />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-right">
            ⌘↵ to send
          </p>
        </form>
      </div>

      {/* DDx Panel */}
      <div className="flex flex-col w-1/2 min-h-0">
        <DdxPanel steps={steps} differentials={differentials} />
      </div>
    </div>
  );
}
