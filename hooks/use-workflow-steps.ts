import { useMemo } from "react";
import type { UIMessage } from "ai";

import type { WorkflowStepState } from "@/components/ddx/workflow-canvas";
import type { WorkflowStepEvent } from "@/server/ai/workflows/ddx-workflow/types";

const initialSteps: WorkflowStepState = {
  match_presentations: "idle",
  match_categories: "idle",
  fetch_diagnoses: "idle",
  group_diagnoses: "idle",
  match_features: "idle",
  safety_review: "idle",
};

export function useWorkflowSteps(
  messages: UIMessage[],
  status: string,
): WorkflowStepState {
  return useMemo(() => {
    if (status === "submitted") {
      return initialSteps;
    }

    const lastMsg = [...messages].reverse().find((message) => message.role === "assistant");
    if (!lastMsg) {
      return initialSteps;
    }

    const nextSteps: WorkflowStepState = { ...initialSteps };
    for (const part of lastMsg.parts) {
      if (part.type === "data-step") {
        const event = (part as { type: string; data: WorkflowStepEvent }).data;
        nextSteps[event.step] = event.status;
      }
    }

    return nextSteps;
  }, [messages, status]);
}
