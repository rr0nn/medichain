"use client";

/**
 * @fileoverview Renders loading placeholders for the conversation sidebar list.
 * @contributors Johnson Zhang
 */

export function ConversationSidebarLoadingState() {
  return (
    /* Sidebar Loading State - Uses simple placeholders while the list is loading. */
    <div className="flex flex-col gap-2 p-3">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  );
}
