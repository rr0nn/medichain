"use client";

/**
 * @fileoverview Renders the empty state for the conversation sidebar.
 * @contributors Johnson Zhang
 */

import { MessageSquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConversationSidebarEmptyStateProps = {
  onNew: () => void;
};

export function ConversationSidebarEmptyState({
  onNew,
}: ConversationSidebarEmptyStateProps) {
  return (
    /* Empty Sidebar State - Guides users to start their first consultation. */
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <MessageSquareIcon className="size-8 opacity-40" />
      <p className="text-xs">No consultations yet</p>
      <Button size="sm" variant="outline" onClick={onNew}>
        Start one
      </Button>
    </div>
  );
}
