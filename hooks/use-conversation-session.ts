/**
 * @fileoverview Manages URL-synced conversation lifecycle state for the consultation page.
 * @contributors Johnson Zhang
 */

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createConversation,
  getConversationMessages,
} from "@/lib/conversations";
import type { ModelProvider } from "@/server/ai/core/models";

type UseConversationSessionResult = {
  activeConversationId: string | null;
  conversationListVersion: number;
  input: string;
  isLoading: boolean;
  loadingMessages: boolean;
  messages: UIMessage[];
  setInput: (value: string) => void;
  status: string;
  actions: {
    selectConversation: (id: string) => void;
    startNewConversation: () => void;
    submitMessage: () => Promise<void>;
  };
};

export function useConversationSession(
  modelProvider: ModelProvider,
): UseConversationSessionResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationListVersion, setConversationListVersion] = useState(0);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const activeConversationId = searchParams.get("conversationId");
  const modelProviderRef = useRef<ModelProvider>(modelProvider);
  modelProviderRef.current = modelProvider;

  const { messages, sendMessage, setMessages, status } = useChat({
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

  const isLoading = status === "submitted" || status === "streaming";

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

  const loadConversation = useCallback(async (id: string) => {
    setLoadingMessages(true);

    try {
      const nextMessages = await getConversationMessages(id);
      setMessages(nextMessages);
    } finally {
      setLoadingMessages(false);
    }
  }, [setMessages]);

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

    let cancelled = false;

    void (async () => {
      try {
        await sendMessage({ text: pendingInitialMessage });

        if (!cancelled) {
          await loadConversation(activeConversationId);
        }
      } finally {
        if (!cancelled) {
          setPendingInitialMessage(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, loadConversation, pendingInitialMessage, sendMessage]);

  const selectConversation = useCallback((id: string) => {
    setConversationInUrl(id);
  }, [setConversationInUrl]);

  const startNewConversation = useCallback(() => {
    setPendingInitialMessage(null);
    setInput("");
    setConversationInUrl(null);
  }, [setConversationInUrl]);

  const submitMessage = useCallback(async () => {
    const nextMessage = input.trim();

    if (!nextMessage || isLoading) {
      return;
    }

    setInput("");

    if (!activeConversationId) {
      const title = nextMessage.slice(0, 60).trim();

      try {
        const conversation = await createConversation({ title });
        setConversationListVersion((value) => value + 1);
        setPendingInitialMessage(nextMessage);
        setConversationInUrl(conversation.id, true);
      } catch (error) {
        console.error("[chat] Failed to create conversation:", error);
        setInput(nextMessage);
      }

      return;
    }

    sendMessage({ text: nextMessage });
  }, [activeConversationId, input, isLoading, sendMessage, setConversationInUrl]);

  return {
    activeConversationId,
    conversationListVersion,
    input,
    isLoading,
    loadingMessages,
    messages,
    setInput,
    status,
    actions: {
      selectConversation,
      startNewConversation,
      submitMessage,
    },
  };
}
