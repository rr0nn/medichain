/**
 * @fileoverview Manages conversation list state for the sidebar.
 * @contributors Johnson Zhang
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { ConversationSummary } from "@/lib/conversations";
import {
  deleteConversation,
  listConversations,
} from "@/lib/conversations";

type UseConversationListOptions = {
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  refreshToken?: number;
};

type UseConversationListResult = {
  collapsed: boolean;
  conversations: ConversationSummary[];
  loading: boolean;
  actions: {
    deleteConversation: (id: string) => Promise<void>;
    toggleCollapsed: () => void;
  };
};

export function useConversationList({
  activeId,
  onNew,
  onSelect,
  refreshToken = 0,
}: UseConversationListOptions): UseConversationListResult {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchConversations = useCallback(async () => {
    // Conversation Fetch - Refreshes the sidebar list from the API.
    setLoading(true);

    try {
      const data = await listConversations();
      setConversations(data);
    } catch (error) {
      console.error("[sidebar] Failed to load conversations:", error);
      setConversations([]);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations, refreshToken]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    // Delete Flow - Removes the conversation and redirects if the active one disappears.
    try {
      await deleteConversation(id);

      setConversations((previousConversations) => {
        const remainingConversations = previousConversations.filter(
          (conversation) => conversation.id !== id,
        );

        if (activeId === id) {
          if (remainingConversations.length > 0) {
            onSelect(remainingConversations[0].id);
          } else {
            onNew();
          }
        }

        return remainingConversations;
      });
    } catch (error) {
      console.error("[sidebar] Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  }, [activeId, onNew, onSelect]);

  return {
    collapsed,
    conversations,
    loading,
    actions: {
      deleteConversation: handleDeleteConversation,
      // Collapse Toggle - Switches the sidebar between compact and expanded layouts.
      toggleCollapsed: () => setCollapsed((value) => !value),
    },
  };
}
