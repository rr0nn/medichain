"use client";

/**
 * @fileoverview Powers the main consultation screen, including chat, workflow state, and differential results.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Jason Yang, John Kollannur, Aryan Wadhawan
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [modelProvider, setModelProvider] = useState<ModelProvider>("gemini");
  const [conversationListVersion, setConversationListVersion] = useState(0);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<string | null>(null);
  const activeConversationId = searchParams.get("conversationId");
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
      } else {
        setMessages([]);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [setMessages]);

  const steps = useWorkflowSteps(messages, status);
  const ddxResult = useDdxResult(messages);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    if (pendingInitialMessage) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    void loadConversation(activeConversationId);
  }, [activeConversationId, loadConversation, pendingInitialMessage, setMessages]);

  useEffect(() => {
    if (!activeConversationId || !pendingInitialMessage) {
      return;
    }

    sendMessage({ text: pendingInitialMessage });
    setPendingInitialMessage(null);
  }, [activeConversationId, pendingInitialMessage, sendMessage]);

  const createConversation = useCallback(async (title?: string) => {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(title ? { title } : {}),
    });

    if (!response.ok) {
      throw new Error("Failed to create conversation");
    }

    const conversation = await response.json() as { id: string };
    setConversationListVersion((value) => value + 1);
    return conversation.id;
  }, []);

  const setConversationInUrl = useCallback((id: string | null, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());

    if (id) {
      params.set("conversationId", id);
    } else {
      params.delete("conversationId");
    }

    const query = params.toString();
    const href = query ? `/?${query}` : "/";

    if (replace) {
      router.replace(href);
      return;
    }

    router.push(href);
  }, [router, searchParams]);

  const handleSelectConversation = useCallback((id: string) => {
    setConversationInUrl(id);
  }, [setConversationInUrl]);

  const handleNewConversation = useCallback(() => {
    setPendingInitialMessage(null);
    setInput("");
    setConversationInUrl(null);
  }, [setConversationInUrl]);

  const handleSubmit = useCallback(async () => {
    const nextMessage = input.trim();
    if (!nextMessage || isLoading) return;

    setInput("");

    if (!activeConversationId) {
      const title = nextMessage.slice(0, 60).trim();

      try {
        const conversationId = await createConversation(title);
        setPendingInitialMessage(nextMessage);
        setConversationInUrl(conversationId, true);
      } catch (error) {
        console.error("[chat] Failed to create conversation:", error);
        setInput(nextMessage);
      }
      return;
    }

    sendMessage({ text: nextMessage });
  }, [activeConversationId, createConversation, input, isLoading, sendMessage, setConversationInUrl]);

  return (
    <div className="flex h-screen gap-3 overflow-hidden p-3">
      <ConversationSidebar
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        refreshToken={conversationListVersion}
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
              onPromptSelect={setInput}
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
