/**
 * @fileoverview Manages consultation session state for the page.
 * @contributors Johnson Zhang
 */

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getChatErrorToastMessage } from "@/lib/chat/error-payload";
import type { SelectedModelIds } from "@/lib/chat/model-catalog";
import {
  createConversation,
  getConversationMessages,
} from "@/lib/conversations";

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
    stopGenerating: () => Promise<void>;
    submitMessage: () => Promise<void>;
  };
};

export function useConversationSession(
  selectedModelIds: SelectedModelIds,
): UseConversationSessionResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationListVersion, setConversationListVersion] = useState(0);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const activeConversationId = searchParams.get("conversationId");
  const selectedModelIdsRef = useRef<SelectedModelIds>(selectedModelIds);
  selectedModelIdsRef.current = selectedModelIds;

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: activeConversationId ?? undefined,
    onError: (error) => {
      toast.error(getChatErrorToastMessage(error));
    },
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages, body }) => ({
        api: `/api/conversations/${id}/chat`,
        body: {
          ...body,
          chatModelId: selectedModelIdsRef.current.chat,
          diagnosisModelId: selectedModelIdsRef.current.diagnosis,
          messages,
        },
      }),
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const setConversationInUrl = useCallback(
    (id: string | null, replace = false) => {
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
    },
    [router, searchParams],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      setLoadingMessages(true);

      try {
        const nextMessages = await getConversationMessages(id);
        setMessages(nextMessages);
      } catch (error) {
        console.error("[chat] Failed to load conversation messages:", error);
        setMessages([]);
        toast.error("Failed to load conversation history");
      } finally {
        setLoadingMessages(false);
      }
    },
    [setMessages],
  );

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
  }, [
    activeConversationId,
    loadConversation,
    pendingInitialMessage,
    setMessages,
  ]);

  useEffect(() => {
    if (!activeConversationId || !pendingInitialMessage) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        // First Message Sync - Reload after sending so the new conversation shows immediately.
        await sendMessage({ text: pendingInitialMessage });

        if (!cancelled) {
          await loadConversation(activeConversationId);
        }
      } catch (error) {
        console.error("[chat] Failed to send initial message:", error);

        if (!cancelled) {
          setInput(pendingInitialMessage);
          toast.error("Failed to send message");
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
  }, [
    activeConversationId,
    loadConversation,
    pendingInitialMessage,
    sendMessage,
  ]);

  const selectConversation = useCallback(
    (id: string) => {
      setConversationInUrl(id);
    },
    [setConversationInUrl],
  );

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
        toast.error("Failed to create conversation");
        setInput(nextMessage);
      }

      return;
    }

    try {
      await sendMessage({ text: nextMessage });
    } catch (error) {
      console.error("[chat] Failed to send message:", error);
      toast.error("Failed to send message");
      setInput(nextMessage);
    }
  }, [
    activeConversationId,
    input,
    isLoading,
    sendMessage,
    setConversationInUrl,
  ]);

  const stopGenerating = useCallback(async () => {
    if (!isLoading) {
      return;
    }

    await stop();
  }, [isLoading, stop]);

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
      stopGenerating,
      submitMessage,
    },
  };
}
