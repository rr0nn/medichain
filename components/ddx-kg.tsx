"use client";

/**
 * @fileoverview Renders the knowledge-graph view that explains evidence behind ranked differentials.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef } from "react";

import { formatDdxName } from "@/lib/format-ddx-name";

type DiagnosisEvidencePath = {
  clinicalPresentationName: string;
  evidenceName: string;
  evidenceType: "category" | "feature";
  featureType?: string;
};

type DdxKGProps = {
  diagnosis: DiagnosisEvidencePath[];
  diagnosisName: string;
};

type Tier = "presentation" | "category" | "feature" | "diagnosis";
type DdxKGNodeData = {
  label: string;
  tier: Tier;
  detail?: string;
  emphasized?: boolean;
};

const TIER_STYLE: Record<Tier, { bg: string; border: string }> = {
  presentation: {
    bg: "var(--kg-presentation-bg)",
    border: "var(--kg-presentation-border)",
  },
  category: {
    bg: "var(--kg-category-bg)",
    border: "var(--kg-category-border)",
  },
  feature: {
    bg: "var(--kg-feature-bg)",
    border: "var(--kg-feature-border)",
  },
  diagnosis: {
    bg: "var(--kg-diagnosis-bg)",
    border: "var(--kg-diagnosis-border)",
  },
};

const CANVAS_PADDING_X = 72;
const CANVAS_PADDING_Y = 56;
const COLUMN_GAP_X = 240;
const PRESENTATION_CENTER_Y = 168;
const CATEGORY_CENTER_Y = 84;
const FEATURE_CENTER_Y = 252;
const PRESENTATION_GAP_Y = 92;
const EVIDENCE_GAP_Y = 88;

const TIER_LABEL: Record<Tier, string> = {
  presentation: "Presentation",
  category: "Category",
  feature: "Feature",
  diagnosis: "Diagnosis",
};

const FIT_VIEW_OPTIONS = { padding: 0.16, minZoom: 0.55, maxZoom: 1 };

function laneY(index: number, count: number, center: number, gap: number) {
  const totalHeight = (count - 1) * gap;
  return center - totalHeight / 2 + index * gap;
}

function DdxKGNode({ data }: NodeProps & { data: DdxKGNodeData }) {
  const { bg, border } = TIER_STYLE[data.tier];

  return (
    <div
      style={{
        background: bg,
        borderColor: border,
        boxShadow: data.emphasized
          ? `0 8px 24px color-mix(in oklch, ${border} 35%, transparent)`
          : "0 1px 2px rgba(0,0,0,0.06)",
      }}
      className={`rounded-lg border px-3 py-2.5 text-left text-foreground ${
        data.emphasized ? "w-44" : "w-40"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border !border-border !bg-background"
      />
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {TIER_LABEL[data.tier]}
      </p>
      <p
        className={`mt-1 leading-tight ${
          data.emphasized ? "text-[12px] font-semibold" : "text-[11px] font-medium"
        }`}
      >
        {data.label}
      </p>
      {data.detail ? (
        <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
          {data.detail}
        </p>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border !border-border !bg-background"
      />
    </div>
  );
}

const nodeTypes = { ddx: DdxKGNode };

function AutoFitView({ graphKey }: { graphKey: string }) {
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const lastGraphKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!nodesInitialized || lastGraphKeyRef.current === graphKey) {
      return;
    }

    lastGraphKeyRef.current = graphKey;

    const frame = requestAnimationFrame(() => {
      void fitView(FIT_VIEW_OPTIONS);
    });

    return () => cancelAnimationFrame(frame);
  }, [fitView, graphKey, nodesInitialized]);

  return null;
}

export function DdxKG({ diagnosis, diagnosisName }: DdxKGProps) {
  const presentations = useMemo(
    () => Array.from(new Set(diagnosis.map((path) => path.clinicalPresentationName))),
    [diagnosis],
  );

  const categoryEvidence = useMemo(
    () =>
      Array.from(
        new Map(
          diagnosis
            .filter((path) => path.evidenceType === "category")
            .map((path) => [path.evidenceName, { name: path.evidenceName }]),
        ).values(),
      ),
    [diagnosis],
  );

  const featureEvidence = useMemo(
    () =>
      Array.from(
        new Map(
          diagnosis
            .filter((path) => path.evidenceType === "feature")
            .map((path) => [
              path.evidenceName,
              { name: path.evidenceName, featureType: path.featureType },
            ]),
        ).values(),
      ),
    [diagnosis],
  );

  const nodes = useMemo(() => {
    const presentationNodes: Node<DdxKGNodeData>[] = presentations.map((name, index) => ({
      id: `pres-${name}`,
      type: "ddx",
      position: {
        x: CANVAS_PADDING_X,
        y: laneY(
          index,
          presentations.length,
          CANVAS_PADDING_Y + PRESENTATION_CENTER_Y,
          PRESENTATION_GAP_Y,
        ),
      },
      data: { label: formatDdxName(name), tier: "presentation" },
    }));

    const categoryNodes: Node<DdxKGNodeData>[] = categoryEvidence.map((evidence, index) => ({
      id: `ev-category-${evidence.name}`,
      type: "ddx",
      position: {
        x: CANVAS_PADDING_X + COLUMN_GAP_X,
        y: laneY(
          index,
          categoryEvidence.length,
          CANVAS_PADDING_Y + CATEGORY_CENTER_Y,
          EVIDENCE_GAP_Y,
        ),
      },
      data: {
        label: formatDdxName(evidence.name),
        tier: "category",
      },
    }));

    const featureNodes: Node<DdxKGNodeData>[] = featureEvidence.map((evidence, index) => ({
      id: `ev-feature-${evidence.name}`,
      type: "ddx",
      position: {
        x: CANVAS_PADDING_X + COLUMN_GAP_X,
        y: laneY(
          index,
          featureEvidence.length,
          CANVAS_PADDING_Y + FEATURE_CENTER_Y,
          EVIDENCE_GAP_Y,
        ),
      },
      data: {
        label: formatDdxName(evidence.name),
        tier: "feature",
        detail: evidence.featureType
          ? `Type: ${formatDdxName(evidence.featureType)}`
          : undefined,
      },
    }));

    const diagnosisNode: Node<DdxKGNodeData> = {
      id: `dx-${diagnosisName}`,
      type: "ddx",
      position: {
        x: CANVAS_PADDING_X + COLUMN_GAP_X * 2,
        y: CANVAS_PADDING_Y + PRESENTATION_CENTER_Y,
      },
      data: {
        label: formatDdxName(diagnosisName),
        tier: "diagnosis",
        emphasized: true,
      },
    };

    return [...presentationNodes, ...categoryNodes, ...featureNodes, diagnosisNode];
  }, [categoryEvidence, diagnosisName, featureEvidence, presentations]);

  const edges = useMemo(() => {
    const edgeStyle = {
      stroke: "var(--kg-edge)",
      strokeWidth: 1.75,
    };
    const marker = {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: "var(--kg-edge)",
    };

    return [
      ...diagnosis.map((path, index) => ({
        id: `e-pres-ev-${index}`,
        source: `pres-${path.clinicalPresentationName}`,
        target: `ev-${path.evidenceType}-${path.evidenceName}`,
        type: "smoothstep" as const,
        style: edgeStyle,
        markerEnd: marker,
      })),
      ...diagnosis.map((path, index) => ({
        id: `e-ev-dx-${index}`,
        source: `ev-${path.evidenceType}-${path.evidenceName}`,
        target: `dx-${diagnosisName}`,
        type: "smoothstep" as const,
        style: edgeStyle,
        markerEnd: marker,
      })),
    ] satisfies Edge[];
  }, [diagnosis, diagnosisName]);

  const graphKey = useMemo(
    () =>
      `${diagnosisName}::${nodes.map((node) => node.id).join("|")}::${edges
        .map((edge) => edge.id)
        .join("|")}`,
    [diagnosisName, edges, nodes],
  );

  if (diagnosis.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
        No evidence paths to visualize.
      </div>
    );
  }

  return (
    <div className="h-96 w-full overflow-hidden rounded-[22px] border border-[color:var(--glass-border)] bg-background/80 p-2 shadow-[inset_0_1px_0_var(--glass-highlight)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--kg-bg-dot)"
        />
        <AutoFitView graphKey={graphKey} />
      </ReactFlow>
    </div>
  );
}
