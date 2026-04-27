/**
 * @fileoverview Shared transcript parsing helpers for assistant messages and tool outputs.
 * @contributors Johnson Zhang
 */

import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import type { WorkflowStepEvent } from "@/server/ai/workflows/ddx-workflow/types";

export function getLatestAssistantMessage(messages: UIMessage[]): UIMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return messages[index];
    }
  }

  return undefined;
}

export function getWorkflowStepEvents(messages: UIMessage[]): WorkflowStepEvent[] {
  const lastAssistantMessage = getLatestAssistantMessage(messages);

  if (!lastAssistantMessage) {
    return [];
  }

  const events: WorkflowStepEvent[] = [];

  for (const part of lastAssistantMessage.parts) {
    if (part.type === "data-step") {
      events.push((part as { type: string; data: WorkflowStepEvent }).data);
    }
  }

  return events;
}

export function getLatestToolOutput<T>(
  messages: UIMessage[],
  toolName: string,
): T | undefined {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];

    if (message.role !== "assistant") {
      continue;
    }

    for (const part of message.parts) {
      if (
        isToolUIPart(part) &&
        getToolName(part) === toolName &&
        part.state === "output-available"
      ) {
        return part.output as T | undefined;
      }
    }
  }

  return undefined;
}
