"use client";

/**
 * @fileoverview Shows the consultation list and controls for switching or starting sessions.
 * @contributors Aryan Wadhawan
 */

import { useEffect, useState, useCallback } from "react";
import { PlusIcon, MessageSquareIcon, Trash2Icon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date-utils";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface ConversationSidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: (id: string) => void;
}

export function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json() as ConversationSummary[];
        setConversations(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const handleNew = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) {
        const conv = await res.json() as ConversationSummary;
        setConversations((prev) => [conv, ...prev]);
        onNew(conv.id);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        onSelect(remaining[0].id);
      } else {
        onNew("");
      }
    }
  };

  return (
    <aside className={cn(
      "glass flex flex-col shrink-0 min-h-0 transition-all duration-200 m-3 mr-0 rounded-[28px]",
      collapsed ? "w-12" : "w-60"
    )}>
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
              onClick={handleNew}
              disabled={creating}
              title="New consultation"
            >
              <PlusIcon className="size-4" />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setCollapsed((c) => !c)}
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
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleNew}
            disabled={creating}
            title="New consultation"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto min-h-0", collapsed && "hidden")}>
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <MessageSquareIcon className="size-8 opacity-40" />
            <p className="text-xs">No consultations yet</p>
            <Button size="sm" variant="outline" onClick={handleNew} disabled={creating}>
              Start one
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5 p-2">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(conv.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(conv.id); }}
                  className={cn(
                    "group w-full flex items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60 cursor-pointer select-none",
                    activeId === conv.id && "bg-muted text-foreground font-medium"
                  )}
                >
                  <MessageSquareIcon className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate leading-snug">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(conv.updatedAt))}
                      {(conv._count?.messages ?? 0) > 0 && (
                        <span className="ml-1">· {conv._count.messages} msg{conv._count.messages !== 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => void handleDelete(e, conv.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                    title="Delete consultation"
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
