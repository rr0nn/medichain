"use client";

/**
 * @fileoverview Renders the consultation sidebar.
 * @contributors Aryan Wadhawan
 */

import { useCallback } from "react";
import type * as React from "react";
import { PlusIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConversationSidebarEmptyState } from "@/components/layout/conversation-sidebar-empty-state";
import { ConversationSidebarItem } from "@/components/layout/conversation-sidebar-item";
import { ConversationSidebarLoadingState } from "@/components/layout/conversation-sidebar-loading-state";
import { useConversationList } from "@/hooks/use-conversation-list";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  activeId: string | null;
  disableSelection?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshToken?: number;
}

export function ConversationSidebar({
  activeId,
  disableSelection = false,
  onSelect,
  onNew,
  refreshToken = 0,
}: ConversationSidebarProps) {
  const {
    collapsed,
    conversations,
    loading,
    actions,
  } = useConversationList({
    activeId,
    onNew,
    onSelect,
    refreshToken,
  });

  const handleDelete = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    event.stopPropagation();
    void actions.deleteConversation(id);
  }, [actions]);

  return (
    <aside className={cn(
      "glass flex min-h-0 shrink-0 flex-col rounded-[28px] border border-[color:var(--glass-border)] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-md transition-all duration-200",
      collapsed ? "w-12" : "w-60"
    )}>
      {/* Sidebar Header - Shows the title and main sidebar actions. */}
      <div className="flex items-center justify-between px-2 py-3 border-b border-[color:var(--glass-border)] shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Consultations
          </span>
        )}
        <div className={cn("flex items-center gap-1", collapsed && "w-full justify-center")}>
          {!collapsed && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onNew}
              disabled={disableSelection}
              title="New consultation"
            >
              <PlusIcon className="size-4" />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={actions.toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpenIcon className="size-4" />
              : <PanelLeftCloseIcon className="size-4" />
            }
          </Button>
        </div>
      </div>

      {collapsed && (
        /* Collapsed Actions - Keeps the new chat button visible in compact mode. */
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onNew}
            disabled={disableSelection}
            title="New consultation"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto min-h-0", collapsed && "hidden")}>
        {loading ? (
          <ConversationSidebarLoadingState />
        ) : conversations.length === 0 ? (
          <ConversationSidebarEmptyState
            disabled={disableSelection}
            onNew={onNew}
          />
        ) : (
          /* Conversation List - Displays each saved consultation entry. */
          <ul className="flex flex-col gap-0.5 p-2">
            {conversations.map((conversation) => (
              <ConversationSidebarItem
                key={conversation.id}
                active={activeId === conversation.id}
                conversation={conversation}
                disabled={disableSelection}
                onDelete={handleDelete}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
