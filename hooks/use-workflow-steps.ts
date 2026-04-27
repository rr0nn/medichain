/**
 * @fileoverview Derives workflow step state from the transcript.
 * @contributors Johnson Zhang, Aryan Wadhawan
 */

import { useMemo } from "react";
import type { UIMessage } from "ai";

import type { WorkflowStepState } from "@/components/ddx/workflow-canvas";
import { getWorkflowStepEvents } from "@/lib/chat/transcript";

const initialSteps: WorkflowStepState = {
  match_presentations: "idle",
  match_categories: "idle",
  fetch_diagnoses: "idle",
  group_diagnoses: "idle",
  match_features: "idle",
  safety_review: "idle",
};

/**
 * Derives workflow step state from transcript step events and the current chat status.
 *
 * Returns the idle workflow state while a request is still pending, then maps the
 * latest emitted step events onto the workflow canvas state shape.
 */
export function useWorkflowSteps(
  messages: UIMessage[],
  status: string,
): WorkflowStepState {
  return useMemo(() => {
    if (status === "submitted") {
      return initialSteps;
    }

    const stepEvents = getWorkflowStepEvents(messages);

    if (stepEvents.length === 0) {
      return initialSteps;
    }

    const nextSteps: WorkflowStepState = { ...initialSteps };

    for (const event of stepEvents) {
      nextSteps[event.step] = event.status;
    }

    return nextSteps;
  }, [messages, status]);
}
