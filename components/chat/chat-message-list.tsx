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
  return (
    <ConversationContent>
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
          className="mx-auto my-6 max-w-md rounded-[24px] border border-[color:var(--glass-border)] bg-background/35 px-6 py-8 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm"
          title={activeConversationId ? "Start the consultation" : "Select or start a consultation"}
        />
      ) : (
        messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageContent
              className={
                message.role === "user"
                  ? "!bg-primary !text-primary-foreground self-end mb-2 rounded-2xl rounded-br-md px-3 py-2 shadow-[0_2px_8px_rgba(27,125,126,0.15)]"
                  : "self-start mb-2 rounded-2xl rounded-bl-md border border-[color:var(--glass-border)] bg-background/45 px-3 py-2 text-card-foreground shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm"
              }
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
          <MessageContent className="rounded-2xl rounded-bl-md border border-[color:var(--glass-border)] bg-background/45 px-3 py-2 shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-sm">
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
