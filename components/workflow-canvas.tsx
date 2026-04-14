"use client";

/**
 * @fileoverview Visualizes diagnostic workflow progress and the current safety review state.
 * @contributors Aryan Wadhawan, Johnson Zhang
 */

import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import type { WorkflowStepName } from "@/server/ai/workflows/ddx-workflow/types";
import type { CriticAssessment } from "@/server/ai/workflows/safety-workflow/types";

export type StepStatus = "idle" | "running" | "complete" | "error";
export type WorkflowStepState = Record<WorkflowStepName, StepStatus>;

type WorkflowNodeData = {
  label: string;
  description: string;
  status: StepStatus;
  tone?: "default" | "success" | "warning";
};

function WorkflowNode({ data }: NodeProps & { data: WorkflowNodeData }) {
  const { label, description, status, tone = "default" } = data;

  return (
    <div
      className={cn(
        "w-36 rounded-lg border bg-background px-3 py-2.5 text-left shadow-sm transition-colors",
        status === "idle" && "border-border",
        status === "running" && "border-blue-500/60 bg-blue-500/5",
        status === "complete" && "border-green-500/60 bg-green-500/5",
        tone === "success" &&
        status === "complete" &&
        "border-emerald-500/60 bg-emerald-500/5",
        tone === "warning" &&
        status === "complete" &&
        "border-amber-500/60 bg-amber-500/5",
        status === "error" && "border-destructive/60 bg-destructive/5",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border !border-border !bg-background"
      />
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium leading-tight">
            {label}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
            {description}
          </p>
        </div>
        <StatusDot status={status} />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border !border-border !bg-background"
      />
    </div>
  );
}

function StatusDot({ status }: { status: StepStatus }) {
  if (status === "running") {
    return (
      <Loader2Icon className="mt-0.5 size-3 shrink-0 animate-spin text-blue-500" />
    );
  }

  if (status === "complete") {
    return <CheckIcon className="mt-0.5 size-3 shrink-0 text-green-500" />;
  }

  return (
    <span className="mt-0.5 size-2.5 shrink-0 rounded-full border border-border" />
  );
}

const nodeTypes = { workflow: WorkflowNode };

function subscribe() {
  return () => { };
}

function getOutcomeStatus(active: boolean): StepStatus {
  return active ? "complete" : "idle";
}

export function WorkflowCanvas({
  steps,
  matchedClinicalPresentationCount,
  criticAssessment,
}: {
  steps: WorkflowStepState;
  matchedClinicalPresentationCount: number;
  criticAssessment?: CriticAssessment;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const hasPresentationMatch = matchedClinicalPresentationCount > 0;
  const noGraphMatch =
    steps.match_presentations === "complete" && !hasPresentationMatch;
  const needsMoreInformation = criticAssessment?.shouldReturnToInterview ?? false;
  const readyForReview =
    criticAssessment !== undefined && !criticAssessment.shouldReturnToInterview;

  const nodes = useMemo(
    () => [
      {
        id: "interview",
        type: "workflow",
        position: { x: 0, y: 108 },
        data: {
          label: "Interview",
          description: "Patient description",
          status: "complete" as StepStatus,
        },
      },
      {
        id: "presentations",
        type: "workflow",
        position: { x: 170, y: 108 },
        data: {
          label: "Match Presentations",
          description: "Find graph anchors",
          status: steps.match_presentations,
        },
      },
      {
        id: "categories",
        type: "workflow",
        position: { x: 340, y: 44 },
        data: {
          label: "Match Categories",
          description: "Category evidence",
          status: steps.match_categories,
        },
      },
      {
        id: "features",
        type: "workflow",
        position: { x: 340, y: 172 },
        data: {
          label: "Match Features",
          description: "Feature evidence",
          status: steps.match_features,
        },
      },
      {
        id: "diagnoses",
        type: "workflow",
        position: { x: 520, y: 108 },
        data: {
          label: "Build Differential",
          description: "Diagnoses and ranking",
          status:
            steps.fetch_diagnoses === "running" || steps.group_diagnoses === "running"
              ? "running"
              : steps.group_diagnoses === "complete"
                ? "complete"
                : "idle",
        },
      },
      {
        id: "safety",
        type: "workflow",
        position: { x: 680, y: 108 },
        data: {
          label: "Safety Workflow",
          description: "Grounding and review",
          status: steps.safety_review,
        },
      },
      {
        id: "review",
        type: "workflow",
        position: { x: 850, y: 30 },
        data: {
          label: "Ready for Review",
          description: "Show supported differential",
          status: getOutcomeStatus(readyForReview),
          tone: "success",
        },
      },
      {
        id: "more-info",
        type: "workflow",
        position: { x: 850, y: 186 },
        data: {
          label: noGraphMatch ? "No Graph Match" : "More Information",
          description: noGraphMatch
            ? "Ask broader clarification"
            : "Return to interview",
          status: getOutcomeStatus(noGraphMatch || needsMoreInformation),
          tone: "warning",
        },
      },
    ],
    [needsMoreInformation, noGraphMatch, readyForReview, steps],
  );

  const edges = useMemo(
    () => [
      {
        id: "interview-presentations",
        source: "interview",
        target: "presentations",
        animated: steps.match_presentations === "running",
      },
      {
        id: "presentations-categories",
        source: "presentations",
        target: "categories",
        animated: steps.match_categories === "running",
      },
      {
        id: "presentations-features",
        source: "presentations",
        target: "features",
        animated: steps.match_features === "running",
      },
      {
        id: "categories-diagnoses",
        source: "categories",
        target: "diagnoses",
        animated:
          steps.fetch_diagnoses === "running" || steps.group_diagnoses === "running",
      },
      {
        id: "features-diagnoses",
        source: "features",
        target: "diagnoses",
        animated:
          steps.fetch_diagnoses === "running" || steps.group_diagnoses === "running",
      },
      {
        id: "diagnoses-safety",
        source: "diagnoses",
        target: "safety",
        animated: steps.safety_review === "running",
      },
      {
        id: "safety-review",
        source: "safety",
        target: "review",
        label: "review",
        animated: readyForReview,
      },
      {
        id: "safety-more-info",
        source: "safety",
        target: "more-info",
        label: noGraphMatch ? "no match" : "ask more",
        animated: noGraphMatch || needsMoreInformation,
      },
    ],
    [
      needsMoreInformation,
      noGraphMatch,
      readyForReview,
      steps.fetch_diagnoses,
      steps.group_diagnoses,
      steps.safety_review,
      steps.match_categories,
      steps.match_features,
      steps.match_presentations,
    ],
  );

  if (!mounted) {
    return <div className="h-80 w-full border-b border-border" />;
  }

  return (
    <div className="h-80 w-full p-2 bg-background rounded-[30px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.14, minZoom: 0.6, maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnDrag={false}
        proOptions={{ hideAttribution: true }}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      >
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
