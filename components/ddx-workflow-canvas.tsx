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
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { WorkflowStepName } from "@/server/ai/workflows/ddx-workflow/workflow";

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

export function DdxWorkflowCanvas({ steps }: { steps: WorkflowStepState }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nodes = useMemo(
    () => [
      {
        id: "cp",
        type: "workflow",
        position: { x: 0, y: 0 },
        data: {
          label: "CP Matching",
          description: "Presentation agent",
          status: steps.match_presentations,
        },
      },
      {
        id: "cat",
        type: "workflow",
        position: { x: 210, y: 0 },
        data: {
          label: "Category Matching",
          description: "Category agent",
          status: steps.match_categories,
        },
      },
      {
        id: "diag",
        type: "workflow",
        position: { x: 420, y: 0 },
        data: {
          label: "Diagnosis Lookup",
          description: "Knowledge graph",
          status: steps.fetch_diagnoses,
        },
      },
      {
        id: "results",
        type: "workflow",
        position: { x: 630, y: 0 },
        data: {
          label: "Results",
          description: "Ranked differentials",
          status: steps.group_diagnoses,
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
        id: "cat-diag",
        source: "cat",
        target: "diag",
        animated:
          steps.match_categories === "running" ||
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
    ],
    [steps]
  );

  if (!mounted) return <div className="h-44 w-full border-b border-border" />;

  return (
    <div className="h-44 w-full border-b border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.35 }}
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
