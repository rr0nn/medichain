"use client";

import {
  ReactFlow,
  Background,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import type { WorkflowStepName } from "@/server/ai/workflows/ddx-workflow/types";

export type StepStatus = "idle" | "running" | "complete" | "error";
export type WorkflowStepState = Record<WorkflowStepName, StepStatus>;

type WorkflowNodeData = {
  label: string;
  description: string;
  status: StepStatus;
};

function WorkflowNode({ data }: NodeProps & { data: WorkflowNodeData }) {
  const { label, description, status } = data;

  return (
    <div
      className={cn(
        "w-36 rounded-lg border bg-background px-3 py-2.5 shadow-sm transition-colors text-left",
        status === "idle" && "border-border",
        status === "running" && "border-blue-500/60 bg-blue-500/5",
        status === "complete" && "border-green-500/60 bg-green-500/5",
        status === "error" && "border-destructive/60 bg-destructive/5"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border !border-border !bg-background"
      />
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight truncate">
            {label}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
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
  if (status === "running")
    return (
      <Loader2Icon className="size-3 shrink-0 text-blue-500 animate-spin mt-0.5" />
    );
  if (status === "complete")
    return <CheckIcon className="size-3 shrink-0 text-green-500 mt-0.5" />;
  return (
    <span className="size-2.5 shrink-0 rounded-full border border-border mt-0.5" />
  );
}

const nodeTypes = { workflow: WorkflowNode };

function subscribe() {
  return () => {};
}

export function DdxWorkflowCanvas({ steps }: { steps: WorkflowStepState }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const nodes = useMemo(
    () => [
      {
        id: "cp",
        type: "workflow",
        position: { x: 0, y: 52 },
        data: {
          label: "CP Matching",
          description: "Presentation agent",
          status: steps.match_presentations,
        },
      },
      {
        id: "cat",
        type: "workflow",
        position: { x: 220, y: 0 },
        data: {
          label: "Category Matching",
          description: "Category agent",
          status: steps.match_categories,
        },
      },
      {
        id: "feature",
        type: "workflow",
        position: { x: 220, y: 104 },
        data: {
          label: "Feature Matching",
          description: "Feature agent",
          status: steps.match_features,
        },
      },
      {
        id: "diag",
        type: "workflow",
        position: { x: 480, y: 52 },
        data: {
          label: "Diagnosis Lookup",
          description: "Graph merge",
          status: steps.fetch_diagnoses,
        },
      },
      {
        id: "results",
        type: "workflow",
        position: { x: 720, y: 52 },
        data: {
          label: "Differentials",
          description: "Ranked differentials",
          status: steps.group_diagnoses,
        },
      },
      {
        id: "critic",
        type: "workflow",
        position: { x: 960, y: 52 },
        data: {
          label: "Critic Review",
          description: "Confidence gate",
          status: steps.critic_review,
        },
      },
    ],
    [steps]
  );

  const edges = useMemo(
    () => [
      {
        id: "cp-cat",
        source: "cp",
        target: "cat",
        animated:
          steps.match_presentations === "running" ||
          steps.match_categories === "running",
      },
      {
        id: "cp-feature",
        source: "cp",
        target: "feature",
        animated:
          steps.match_presentations === "running" ||
          steps.match_features === "running",
      },
      {
        id: "cat-diag",
        source: "cat",
        target: "diag",
        animated:
          steps.match_categories === "running" ||
          steps.fetch_diagnoses === "running",
      },
      {
        id: "feature-diag",
        source: "feature",
        target: "diag",
        animated:
          steps.match_features === "running" ||
          steps.fetch_diagnoses === "running",
      },
      {
        id: "diag-results",
        source: "diag",
        target: "results",
        animated:
          steps.fetch_diagnoses === "running" ||
          steps.group_diagnoses === "running",
      },
      {
        id: "results-critic",
        source: "results",
        target: "critic",
        animated:
          steps.group_diagnoses === "running" ||
          steps.critic_review === "running",
      },
    ],
    [steps]
  );

  if (!mounted) return <div className="h-60 w-full border-b border-border" />;

  return (
    <div className="h-60 w-full border-b border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28 }}
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
