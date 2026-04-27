"use client";

/**
 * @fileoverview Renders one selectable conversation item in the sidebar.
 * @contributors Johnson Zhang
 */

import type * as React from "react";
import { MessageSquareIcon, Trash2Icon } from "lucide-react";

import { formatDistanceToNow } from "@/lib/utils/date";
import type { ConversationSummary } from "@/lib/conversations/types";
import { cn } from "@/lib/utils/cn";

type ConversationSidebarItemProps = {
  active: boolean;
  conversation: ConversationSummary;
  disabled?: boolean;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>, id: string) => void;
  onSelect: (id: string) => void;
};

export function ConversationSidebarItem({
  active,
  conversation,
  disabled = false,
  onDelete,
  onSelect,
}: ConversationSidebarItemProps) {
  const handleSelect = () => {
    if (disabled) {
      return;
    }

    onSelect(conversation.id);
  };

  return (
    <li>
      {/* Conversation Row - Selects a saved consultation from the sidebar. */}
      <div
        role="button"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !disabled) {
            onSelect(conversation.id);
          }
        }}
        className={cn(
          "group flex w-full select-none items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-background/50",
          active &&
            "bg-background/70 font-medium text-foreground shadow-[inset_0_1px_0_var(--glass-highlight)]",
        )}
      >
        <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate leading-snug">{conversation.title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(conversation.updatedAt))}
            {(conversation._count?.messages ?? 0) > 0 && (
              <span className="ml-1">
                · {conversation._count.messages} msg
                {conversation._count.messages !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        {/* Delete Action - Appears on hover to remove the consultation. */}
        <button
          onClick={(event) => onDelete(event, conversation.id)}
          aria-disabled={disabled}
          disabled={disabled}
          className={cn(
            "shrink-0 rounded p-0.5 transition-opacity",
            disabled
              ? "cursor-not-allowed opacity-30"
              : "opacity-0 group-hover:opacity-100 hover:text-destructive",
          )}
          title="Delete consultation"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
    </li>
  );
}
