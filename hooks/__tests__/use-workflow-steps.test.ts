/**
 * @fileoverview Tests workflow step derivation from transcript step events and chat status.
 * @contributors Johnson Zhang
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWorkflowSteps } from "../use-workflow-steps";

describe("useWorkflowSteps", () => {
  it("returns idle steps while a submission is pending", () => {
    const { result } = renderHook(() =>
      useWorkflowSteps(
        [
          {
            id: "m1",
            role: "assistant",
            parts: [
              {
                type: "data-step",
                data: { type: "step", step: "match_presentations", status: "complete" },
              },
            ],
          },
        ] as never,
        "submitted",
      ),
    );

    expect(result.current).toEqual({
      match_presentations: "idle",
      match_categories: "idle",
      fetch_diagnoses: "idle",
      group_diagnoses: "idle",
      match_features: "idle",
      safety_review: "idle",
    });
  });

  it("maps step events from the latest assistant message", () => {
    const { result } = renderHook(() =>
      useWorkflowSteps(
        [
          {
            id: "m1",
            role: "assistant",
            parts: [
              {
                type: "data-step",
                data: { type: "step", step: "match_presentations", status: "running" },
              },
            ],
          },
          {
            id: "m2",
            role: "assistant",
            parts: [
              {
                type: "data-step",
                data: { type: "step", step: "match_presentations", status: "complete" },
              },
              {
                type: "data-step",
                data: { type: "step", step: "match_categories", status: "running" },
              },
            ],
          },
        ] as never,
        "ready",
      ),
    );

    expect(result.current).toEqual({
      match_presentations: "complete",
      match_categories: "running",
      fetch_diagnoses: "idle",
      group_diagnoses: "idle",
      match_features: "idle",
      safety_review: "idle",
    });
  });

  it("returns idle steps when there is no assistant workflow data", () => {
    const { result } = renderHook(() =>
      useWorkflowSteps(
        [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "hello" }],
          },
        ] as never,
        "ready",
      ),
    );

    expect(result.current.match_presentations).toBe("idle");
    expect(result.current.safety_review).toBe("idle");
  });
});
