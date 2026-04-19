"use client";

/**
 * @fileoverview Powers the main consultation screen, including chat, workflow state, and differential results.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Jason Yang, John Kollannur, Aryan Wadhawan
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useRef, useState, useCallback } from "react";
import {
  Conversation,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { DdxPanel } from "@/components/ddx/ddx-panel";
import { ConversationSidebar } from "@/components/layout/conversation-sidebar";
import type { ModelProvider } from "@/server/ai/core/models";
import { useDdxResult } from "@/hooks/use-ddx-result";
import { useWorkflowSteps } from "@/hooks/use-workflow-steps";

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [modelProvider, setModelProvider] = useState<ModelProvider>("gemini");
  const modelProviderRef = useRef<ModelProvider>(modelProvider);
  modelProviderRef.current = modelProvider;

  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeConversationId ?? undefined,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages, body }) => ({
        api: `/api/conversations/${id}/chat`,
        body: {
          ...body,
          messages,
          modelProvider: modelProviderRef.current,
        },
      }),
    }),
  });

  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

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

  const steps = useWorkflowSteps(messages, status);
  const ddxResult = useDdxResult(messages);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }, [input, isLoading, sendMessage]);

  return (
    <div className="flex h-screen gap-3 overflow-hidden p-3">
      <ConversationSidebar
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      <div className="flex min-h-0 min-w-0 flex-[1] flex-col gap-3">
        <ChatHeader
          modelProvider={modelProvider}
          onModelChange={setModelProvider}
          isLoading={isLoading}
        />
        <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-[color:var(--glass-border)] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-md">
          <Conversation className="flex-1 min-h-0 bg-transparent">
            <ChatMessageList
              messages={messages}
              loadingMessages={loadingMessages}
              isLoading={isLoading}
              activeConversationId={activeConversationId}
              status={status}
            />
            <ConversationScrollButton />
          </Conversation>
          <ChatComposer
            activeConversationId={activeConversationId}
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-[1] flex-col">
        <DdxPanel
          steps={steps}
          differentials={ddxResult.differentials}
          matchedClinicalPresentations={ddxResult.matchedClinicalPresentations}
          matchedCategories={ddxResult.matchedCategories}
          matchedFeatures={ddxResult.matchedFeatures}
          criticAssessment={ddxResult.criticAssessment}
          groundingAssessment={ddxResult.groundingAssessment}
        />
      </div>
    </div>
  );
}
