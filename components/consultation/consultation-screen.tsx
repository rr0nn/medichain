"use client";

/**
 * @fileoverview Renders the main consultation screen layout.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Jason Yang, John Kollannur, Aryan Wadhawan
 */

import {
  Conversation,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { DdxPanel } from "@/components/ddx/ddx-panel";
import { ConversationSidebar } from "@/components/layout/conversation-sidebar";
import { useModelCatalog } from "@/hooks/use-model-catalog";
import { useConversationSession } from "@/hooks/use-conversation-session";
import { useDdxResult } from "@/hooks/use-ddx-result";
import { useWorkflowSteps } from "@/hooks/use-workflow-steps";

export function ConsultationScreen() {
  const {
    catalog,
    loading: loadingModelCatalog,
    selectedModelIds,
    setSelectedModel,
  } = useModelCatalog();
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
  } = useConversationSession(selectedModelIds);

  const steps = useWorkflowSteps(messages, status);
  const ddxResult = useDdxResult(messages);

  return (
    <div className="flex h-screen min-h-0 gap-3 overflow-hidden p-3">
      {/* Conversation Sidebar - Shows saved consultations and new chat controls. */}
      <div className="flex min-h-0 shrink-0">
        <ConversationSidebar
          activeId={activeConversationId}
          disableSelection={isLoading}
          onSelect={actions.selectConversation}
          onNew={actions.startNewConversation}
          refreshToken={conversationListVersion}
        />
      </div>

      {/* Chat Workspace - Combines the header, transcript, and composer into one section. */}
      <section className="glass flex min-h-0 min-w-0 flex-[1.15] flex-col overflow-hidden rounded-[30px] border border-[color:var(--glass-border)] shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-md">
        <ChatHeader
          catalog={catalog}
          isLoading={isLoading || loadingModelCatalog}
          onModelChange={setSelectedModel}
          onStartNewConversation={actions.startNewConversation}
          selectedModelIds={selectedModelIds}
        />
        <Conversation className="min-h-0 flex-1 bg-transparent">
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
          onStop={() => void actions.stopGenerating()}
          onSubmit={() => void actions.submitMessage()}
        />
      </section>

      {/* Differential Diagnosis Panel - Shows workflow status, ranked diagnoses, and evidence. */}
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
