"use client";

/**
 * @fileoverview Renders one selectable conversation item in the sidebar.
 * @contributors Johnson Zhang
 */

import type * as React from "react";
import { MessageSquareIcon, Trash2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date-utils";
import type { ConversationSummary } from "@/lib/conversations";

type ConversationSidebarItemProps = {
  active: boolean;
  conversation: ConversationSummary;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>, id: string) => void;
  onSelect: (id: string) => void;
};

export function ConversationSidebarItem({
  active,
  conversation,
  onDelete,
  onSelect,
}: ConversationSidebarItemProps) {
  return (
    <li>
      {/* Conversation Row - Selects a saved consultation from the sidebar. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(conversation.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onSelect(conversation.id);
          }
        }}
        className={cn(
          "group flex w-full cursor-pointer select-none items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-background/50",
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
          className="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          title="Delete consultation"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
    </li>
  );
}
