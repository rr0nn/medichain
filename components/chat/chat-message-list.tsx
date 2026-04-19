"use client";

/**
 * @fileoverview Renders the consultation message list, empty state, and assistant loading state.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import {
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { ClipboardListIcon, StethoscopeIcon } from "lucide-react";

type ChatMessageListProps = {
  messages: UIMessage[];
  loadingMessages: boolean;
  isLoading: boolean;
  activeConversationId: string | null;
  status: string;
};

export function ChatMessageList({
  messages,
  loadingMessages,
  isLoading,
  activeConversationId,
  status,
}: ChatMessageListProps) {
  const assistantBubbleClass =
    "self-start mb-3 max-w-[min(44rem,88%)] rounded-2xl rounded-bl-md border border-[color:var(--glass-border)] bg-background/45 px-3.5 py-2.5 text-card-foreground shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm";
  const userBubbleClass =
    "self-end mb-4 max-w-[min(40rem,82%)] rounded-2xl rounded-br-md border border-[color:color-mix(in_oklch,var(--primary)_42%,var(--glass-border))] bg-[color:color-mix(in_oklch,var(--glass-bg-strong)_52%,var(--primary)_48%)] px-3.5 py-2.5 text-foreground shadow-[inset_0_1px_0_var(--glass-highlight),var(--shadow-brand)] backdrop-blur-sm";

  return (
    <ConversationContent className="gap-6 px-5 py-5">
      {loadingMessages ? (
        <div className="flex flex-col gap-3 p-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-10 animate-pulse rounded-2xl border border-[color:var(--glass-border)] bg-background/40 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm ${index % 2 === 0 ? "self-end w-2/3" : "w-3/4"}`}
            />
          ))}
        </div>
      ) : messages.length === 0 && !isLoading ? (
        <ConversationEmptyState
          className="mx-auto my-8 max-w-xl rounded-[28px] border border-[color:var(--glass-border)] bg-background/35 px-6 py-8 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm"
          title={activeConversationId ? "Start the consultation" : "Select or start a consultation"}
          description={
            activeConversationId
              ? "Describe the presentation in natural language, then review the knowledge graph-grounded reasoning on the right."
              : "Open an existing consultation or create a new one from the sidebar to begin."
          }
        >
          <div className="flex w-full max-w-lg flex-col gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-[color:var(--glass-border)] bg-background/55 p-2 text-primary shadow-[inset_0_1px_0_var(--glass-highlight)]">
                <StethoscopeIcon className="size-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  {activeConversationId ? "Start the consultation" : "Select or start a consultation"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeConversationId
                    ? "Describe the presentation in natural language, then review the knowledge graph-grounded reasoning on the right."
                    : "Open an existing consultation or create a new one from the sidebar to begin."}
                </p>
              </div>
            </div>
            {activeConversationId ? (
              <div className="rounded-[22px] border border-[color:var(--glass-border)] bg-background/45 p-4 shadow-[inset_0_1px_0_var(--glass-highlight)]">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <ClipboardListIcon className="size-3.5" />
                  Example intake details
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>52-year-old with crushing central chest pain radiating to the left arm for 2 hours.</li>
                  <li>Child with fever, cough, increased work of breathing, and reduced oral intake.</li>
                  <li>Progressive right lower quadrant pain with nausea, anorexia, and guarding.</li>
                </ul>
              </div>
            ) : null}
          </div>
        </ConversationEmptyState>
      ) : (
        messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageContent
              className={message.role === "user" ? userBubbleClass : assistantBubbleClass}
            >
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return <MessageResponse key={index}>{part.text}</MessageResponse>;
                }

                if (
                  isToolUIPart(part) &&
                  getToolName(part) === "runDifferentialDiagnosis" &&
                  (part.state === "input-streaming" || part.state === "input-available")
                ) {
                  return (
                    <p
                      key={index}
                      className="text-xs italic text-muted-foreground"
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
          <MessageContent className={assistantBubbleClass}>
            <div className="flex gap-1 py-1">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
          </MessageContent>
        </Message>
      )}
    </ConversationContent>
  );
}
