/**
 * @fileoverview Wraps the main consultation screen in a suspense boundary.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Jason Yang, John Kollannur, Aryan Wadhawan
 */

import { Suspense } from "react";

import { ChatPage } from "@/components/chat/chat-page";

function ChatPageFallback() {
  return (
    <div className="flex h-screen gap-3 overflow-hidden p-3">
      <div className="glass w-60 rounded-[28px] border border-[color:var(--glass-border)] bg-background/40" />
      <div className="flex min-h-0 min-w-0 flex-[1] flex-col gap-3">
        <div className="h-16 rounded-[22px] border border-[color:var(--glass-border)] bg-background/40" />
        <div className="glass min-h-0 flex-1 rounded-[30px] border border-[color:var(--glass-border)] bg-background/40" />
      </div>
      <div className="glass min-h-0 min-w-0 flex-[1] rounded-[30px] border border-[color:var(--glass-border)] bg-background/40" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatPage />
    </Suspense>
  );
}
