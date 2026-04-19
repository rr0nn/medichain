"use client";

/**
 * @fileoverview Powers the main consultation screen, including chat, workflow state, and differential results.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Jason Yang, John Kollannur, Aryan Wadhawan
 */

import { useState } from "react";
import {
  Conversation,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { DdxPanel } from "@/components/ddx/ddx-panel";
import { ConversationSidebar } from "@/components/layout/conversation-sidebar";
import { useConversationSession } from "@/hooks/use-conversation-session";
import type { ModelProvider } from "@/server/ai/core/models";
import { useDdxResult } from "@/hooks/use-ddx-result";
import { useWorkflowSteps } from "@/hooks/use-workflow-steps";

export default function Chat() {
  const [modelProvider, setModelProvider] = useState<ModelProvider>("gemini");
  const {
    activeConversationId,
    conversationListVersion,
    input,
    isLoading,
    loadingMessages,
    messages,
    setInput,
    status,
    actions,
  } = useConversationSession(modelProvider);

  const steps = useWorkflowSteps(messages, status);
  const ddxResult = useDdxResult(messages);

  return (
    <div className="flex h-screen gap-3 overflow-hidden p-3">
      <ConversationSidebar
        activeId={activeConversationId}
        onSelect={actions.selectConversation}
        onNew={actions.startNewConversation}
        refreshToken={conversationListVersion}
      />

      <div className="flex min-h-0 min-w-0 flex-[1] flex-col gap-3">
        <ChatHeader
          modelProvider={modelProvider}
          onModelChange={setModelProvider}
          isLoading={isLoading}
        />
        <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-[color:var(--glass-border)] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-md">
          <Conversation className="flex-1 min-h-0 bg-transparent">
            <ChatMessageList
              messages={messages}
              loadingMessages={loadingMessages}
              isLoading={isLoading}
              activeConversationId={activeConversationId}
              status={status}
              onPromptSelect={setInput}
            />
            <ConversationScrollButton />
          </Conversation>
          <ChatComposer
            activeConversationId={activeConversationId}
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSubmit={() => void actions.submitMessage()}
          />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-[1] flex-col">
        <DdxPanel
          steps={steps}
          differentials={ddxResult.differentials}
          matchedClinicalPresentations={ddxResult.matchedClinicalPresentations}
          matchedCategories={ddxResult.matchedCategories}
          matchedFeatures={ddxResult.matchedFeatures}
          criticAssessment={ddxResult.criticAssessment}
          groundingAssessment={ddxResult.groundingAssessment}
        />
      </div>
    </div>
  );
}
