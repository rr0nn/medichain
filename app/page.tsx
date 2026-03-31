"use client";

import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { ThemeSelector } from "@/components/theme-selector";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import type { WorkflowStepState } from "@/components/ddx-workflow-canvas";
import type { WorkflowStepEvent } from "@/server/ai/workflows/ddx-workflow/workflow";
import type {
  CategoryMatch,
  ClinicalPresentationMatch,
  DifferentialDiagnosis,
  FeatureMatch,
} from "@/server/ai/workflows/ddx-workflow/types";

const initialSteps: WorkflowStepState = {
  match_presentations: "idle",
  match_categories: "idle",
  fetch_diagnoses: "idle",
  group_diagnoses: "idle",
  match_features: "idle"
};

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeConversationId ?? undefined,
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const msgs = await res.json() as UIMessage[];
        setMessages(msgs);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [setMessages]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    void loadConversation(id);
  }, [loadConversation]);

  const handleNewConversation = useCallback((id: string) => {
    setActiveConversationId(id || null);
    setMessages([]);
  }, [setMessages]);

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

  const ddxResult: {
    differentials: DifferentialDiagnosis[];
    matchedClinicalPresentations: ClinicalPresentationMatch[];
    matchedCategories: CategoryMatch[];
    matchedFeatures: FeatureMatch[];
  } = (() => {
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
            | {
                differentials?: DifferentialDiagnosis[];
                matchedClinicalPresentations?: ClinicalPresentationMatch[];
                matchedCategories?: CategoryMatch[];
                matchedFeatures?: FeatureMatch[];
              }
            | undefined;
          return {
            differentials: output?.differentials ?? [],
            matchedClinicalPresentations:
              output?.matchedClinicalPresentations ?? [],
            matchedCategories: output?.matchedCategories ?? [],
            matchedFeatures: output?.matchedFeatures ?? [],
          };
        }
      }
    }
    return {
      differentials: [],
      matchedClinicalPresentations: [],
      matchedCategories: [],
      matchedFeatures: [],
    };
  })();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      {/* Chat Panel */}
      <div className="flex flex-col flex-1 border-r border-border min-h-0 min-w-0">
        <header className="flex items-center justify-between px-4 h-20 border-b border-border shrink-0">
          <span className="top-3 bg-primary text-xl font-bold text-primary-foreground p-2 px-4 rounded-3xl">MediChain</span>
          <ThemeSelector />
        </header>

        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {loadingMessages ? (
              <div className="flex flex-col gap-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-10 rounded-lg bg-muted animate-pulse ${i % 2 === 0 ? "self-end w-2/3" : "w-3/4"}`} />
                ))}
              </div>
            ) : messages.length === 0 && !isLoading ? (
              <ConversationEmptyState
                title={activeConversationId ? "Start the consultation" : "Select or start a consultation"}
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent
                    className={message.role === "user"
                            ? "!bg-chart-2 !text-primary-foreground self-end p-2 rounded-lg mb-2"
                            : "bg-muted/40 text-secondary-foreground self-start p-2 rounded-lg mb-2"
                    }
                  >
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
                            Look on the right side running ddx . . .
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
          {!activeConversationId && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              Start a new consultation from the sidebar to begin.
            </p>
          )}
          <div className="flex items-end gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
              rows={1}
              value={input}
              placeholder={activeConversationId ? "Describe a patient presentation..." : "Select a consultation first..."}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
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
          <p className="text-[11px] text-muted-foreground mt-1.5 text-right">
            ⌘↵ to send
          </p>
        </form>
      </div>

      {/* DDx Panel */}
      <div className="flex flex-col w-[45%] min-h-0 shrink-0">
        <DdxPanel
          steps={steps}
          differentials={ddxResult.differentials}
          matchedClinicalPresentations={ddxResult.matchedClinicalPresentations}
          matchedCategories={ddxResult.matchedCategories}
          matchedFeatures={ddxResult.matchedFeatures}
        />
      </div>
    </div>
  );
}
