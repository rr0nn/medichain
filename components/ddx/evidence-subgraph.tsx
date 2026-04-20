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
  getViewportForBounds,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, type RefObject } from "react";

import { formatDdxName } from "@/lib/format-ddx-name";

type DiagnosisEvidencePath = {
  clinicalPresentationName: string;
  evidenceName: string;
  evidenceType: "category" | "feature";
  featureType?: string;
};

type EvidenceSubgraphProps = {
  diagnosis: DiagnosisEvidencePath[];
  diagnosisName: string;
};

type Tier = "presentation" | "category" | "feature" | "diagnosis";
type EvidenceSubgraphNodeData = {
  label: string;
  tier: Tier;
  detail?: string;
  title?: string;
};

type EvidenceNodeEntry = {
  id: string;
  presentationName: string;
  evidenceName: string;
  evidenceType: "category" | "feature";
  featureType?: string;
};

type LaidOutNode = Node<EvidenceSubgraphNodeData>;

type GraphLayout = {
  bounds: { x: number; y: number; width: number; height: number };
  edges: Edge[];
  graphKey: string;
  nodes: LaidOutNode[];
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

const TIER_LABEL: Record<Tier, string> = {
  presentation: "Presentation",
  category: "Category",
  feature: "Feature",
  diagnosis: "Diagnosis",
};

const NODE_WIDTH = 176;
const COLUMN_GAP_X = 132;
const OUTER_PADDING_X = 44;
const OUTER_PADDING_Y = 40;
const BAND_GAP_Y = 42;
const STACK_GAP_Y = 18;
const NODE_BASE_HEIGHT = 56;
const NODE_DETAIL_HEIGHT = 18;
const NODE_LINE_HEIGHT = 16;
const CHARS_PER_LINE = 22;
const FIT_PADDING = 0.12;
const FIT_MIN_ZOOM = 0.55;
const FIT_MAX_ZOOM = 1;

function estimatedLabelLines(label: string) {
  return Math.max(1, Math.ceil(label.trim().length / CHARS_PER_LINE));
}

function estimatedNodeHeight(label: string, detail?: string) {
  return (
    NODE_BASE_HEIGHT +
    (estimatedLabelLines(label) - 1) * NODE_LINE_HEIGHT +
    (detail ? NODE_DETAIL_HEIGHT : 0)
  );
}

function stackHeight(heights: number[], gap: number) {
  return (
    heights.reduce((sum, height) => sum + height, 0) +
    gap * Math.max(0, heights.length - 1)
  );
}

function buildTopOffsets(heights: number[], startY: number, gap: number) {
  const offsets: number[] = [];
  let cursor = startY;

  for (const height of heights) {
    offsets.push(cursor);
    cursor += height + gap;
  }

  return offsets;
}

function buildGraphLayout(
  diagnosis: DiagnosisEvidencePath[],
  diagnosisName: string,
): GraphLayout {
  const presentations = Array.from(
    new Set(diagnosis.map((path) => path.clinicalPresentationName)),
  );

  const evidenceEntries = Array.from(
    new Map(
      diagnosis.map((path) => [
        `${path.clinicalPresentationName}::${path.evidenceType}::${path.evidenceName}`,
        {
          id: `ev-${path.clinicalPresentationName}-${path.evidenceType}-${path.evidenceName}`,
          presentationName: path.clinicalPresentationName,
          evidenceName: path.evidenceName,
          evidenceType: path.evidenceType,
          featureType: path.featureType,
        } satisfies EvidenceNodeEntry,
      ]),
    ).values(),
  );

  const evidenceByPresentation = new Map<string, EvidenceNodeEntry[]>();
  for (const evidence of evidenceEntries) {
    const existing = evidenceByPresentation.get(evidence.presentationName) ?? [];
    existing.push(evidence);
    evidenceByPresentation.set(evidence.presentationName, existing);
  }

  const presentationX = OUTER_PADDING_X;
  const evidenceX = presentationX + NODE_WIDTH + COLUMN_GAP_X;
  const diagnosisX = evidenceX + NODE_WIDTH + COLUMN_GAP_X;

  const nodes: LaidOutNode[] = [];
  const bandCenters: number[] = [];
  let cursorY = OUTER_PADDING_Y;

  for (const presentationName of presentations) {
    const presentationLabel = formatDdxName(presentationName);
    const presentationHeight = estimatedNodeHeight(presentationLabel);
    const evidenceItems = [...(evidenceByPresentation.get(presentationName) ?? [])]
      .sort((left, right) => {
        if (left.evidenceType !== right.evidenceType) {
          return left.evidenceType === "category" ? -1 : 1;
        }

        return left.evidenceName.localeCompare(right.evidenceName);
      })
      .map((evidence) => {
        const label = formatDdxName(evidence.evidenceName);
        const detail =
          evidence.evidenceType === "feature" && evidence.featureType
            ? `Type: ${formatDdxName(evidence.featureType)}`
            : undefined;

        return {
          ...evidence,
          detail,
          height: estimatedNodeHeight(label, detail),
          label,
        };
      });

    const evidenceHeights = evidenceItems.map((entry) => entry.height);
    const evidenceStackHeight = stackHeight(evidenceHeights, STACK_GAP_Y);
    const bandHeight = Math.max(presentationHeight, evidenceStackHeight);
    const bandTop = cursorY;
    const bandCenterY = bandTop + bandHeight / 2;
    const evidenceTopStart = bandTop + (bandHeight - evidenceStackHeight) / 2;
    const evidenceTopOffsets = buildTopOffsets(
      evidenceHeights,
      evidenceTopStart,
      STACK_GAP_Y,
    );

    nodes.push({
      id: `pres-${presentationName}`,
      type: "ddx",
      position: {
        x: presentationX,
        y: bandTop + (bandHeight - presentationHeight) / 2,
      },
      style: {
        width: NODE_WIDTH,
        height: presentationHeight,
      },
      data: {
        label: presentationLabel,
        tier: "presentation",
        title: presentationLabel,
      },
    });

    evidenceItems.forEach((entry, index) => {
      nodes.push({
        id: entry.id,
        type: "ddx",
        position: {
          x: evidenceX,
          y: evidenceTopOffsets[index] ?? evidenceTopStart,
        },
        style: {
          width: NODE_WIDTH,
          height: entry.height,
        },
        data: {
          label: entry.label,
          tier: entry.evidenceType,
          detail: entry.detail,
          title: entry.detail ? `${entry.label}\n${entry.detail}` : entry.label,
        },
      });
    });

    bandCenters.push(bandCenterY);
    cursorY += bandHeight + BAND_GAP_Y;
  }

  const diagnosisLabel = formatDdxName(diagnosisName);
  const diagnosisHeight = estimatedNodeHeight(diagnosisLabel);
  const averageBandCenterY =
    bandCenters.reduce((sum, center) => sum + center, 0) /
    Math.max(1, bandCenters.length);
  const diagnosisY = averageBandCenterY - diagnosisHeight / 2;

  nodes.push({
    id: `dx-${diagnosisName}`,
    type: "ddx",
    position: {
      x: diagnosisX,
      y: diagnosisY,
    },
    style: {
      width: NODE_WIDTH,
      height: diagnosisHeight,
    },
    data: {
      label: diagnosisLabel,
      tier: "diagnosis",
      title: diagnosisLabel,
    },
  });

  const edges: Edge[] = [
    ...diagnosis.map((path, index) => ({
      id: `e-pres-ev-${index}`,
      source: `pres-${path.clinicalPresentationName}`,
      target: `ev-${path.clinicalPresentationName}-${path.evidenceType}-${path.evidenceName}`,
      type: "smoothstep" as const,
      style: {
        stroke: "var(--kg-edge)",
        strokeWidth: 1.7,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: "var(--kg-edge)",
      },
    })),
    ...diagnosis.map((path, index) => ({
      id: `e-ev-dx-${index}`,
      source: `ev-${path.clinicalPresentationName}-${path.evidenceType}-${path.evidenceName}`,
      target: `dx-${diagnosisName}`,
      type: "smoothstep" as const,
      style: {
        stroke: "var(--kg-edge)",
        strokeWidth: 1.7,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: "var(--kg-edge)",
      },
    })),
  ];

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(
    ...nodes.map((node) => node.position.x + (node.style?.width as number)),
  );
  const maxY = Math.max(
    ...nodes.map((node) => node.position.y + (node.style?.height as number)),
  );

  return {
    bounds: {
      x: minX - OUTER_PADDING_X,
      y: minY - OUTER_PADDING_Y,
      width: maxX - minX + OUTER_PADDING_X * 2,
      height: maxY - minY + OUTER_PADDING_Y * 2,
    },
    edges,
    graphKey: `${diagnosisName}::${diagnosis
      .map(
        (path) =>
          `${path.clinicalPresentationName}:${path.evidenceType}:${path.evidenceName}`,
      )
      .join("|")}`,
    nodes,
  };
}

function EvidenceSubgraphNode({
  data,
}: NodeProps & { data: EvidenceSubgraphNodeData }) {
  const { bg, border } = TIER_STYLE[data.tier];

  return (
    /* Graph Node - Shows one presentation, evidence, or diagnosis node. */
    <div
      title={data.title ?? data.label}
      style={{
        background: bg,
        borderColor: border,
        boxShadow: "var(--shadow-soft)",
      }}
      className="flex h-full flex-col rounded-xl border px-3 py-2.5 text-left text-foreground"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border !border-border !bg-background"
      />
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {TIER_LABEL[data.tier]}
      </p>
      <p className="mt-1 text-[11px] font-medium leading-tight">{data.label}</p>
      {data.detail ? (
        <p className="mt-auto pt-2 text-[10px] leading-tight text-muted-foreground">
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

const nodeTypes = { ddx: EvidenceSubgraphNode };

function AutoViewport({
  bounds,
  containerRef,
  graphKey,
}: {
  bounds: GraphLayout["bounds"];
  containerRef: RefObject<HTMLDivElement | null>;
  graphKey: string;
}) {
  const { setViewport, viewportInitialized } = useReactFlow();
  const lastViewportKeyRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto Fit - Keeps the evidence graph framed inside the available canvas size.
    if (!viewportInitialized) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const syncViewport = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) {
        return;
      }

      const viewportKey = `${graphKey}::${Math.round(width)}x${Math.round(height)}`;
      if (lastViewportKeyRef.current === viewportKey) {
        return;
      }

      lastViewportKeyRef.current = viewportKey;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        const viewport = getViewportForBounds(
          bounds,
          width,
          height,
          FIT_MIN_ZOOM,
          FIT_MAX_ZOOM,
          FIT_PADDING,
        );

        void setViewport(viewport, { duration: 0 });
      });
    };

    syncViewport();

    const resizeObserver = new ResizeObserver(() => {
      syncViewport();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [bounds, containerRef, graphKey, setViewport, viewportInitialized]);

  return null;
}

export function EvidenceSubgraph({
  diagnosis,
  diagnosisName,
}: EvidenceSubgraphProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Graph Layout - Builds the positioned nodes and edges for the current diagnosis.
  const layout = useMemo(
    () => buildGraphLayout(diagnosis, diagnosisName),
    [diagnosis, diagnosisName],
  );

  if (diagnosis.length === 0) {
    return (
      /* Empty Graph State - Shows when there are no evidence paths to draw. */
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
        No evidence paths to visualize.
      </div>
    );
  }

  return (
    /* Evidence Graph - Visualizes how matched evidence supports the selected diagnosis. */
    <div className="h-96 w-full rounded-[22px] border border-[color:var(--glass-border)] bg-background/80 p-3 shadow-[inset_0_1px_0_var(--glass-highlight)]">
      <div
        ref={canvasRef}
        className="h-full w-full overflow-hidden rounded-[18px] bg-background/55"
      >
        <ReactFlow
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          panOnDrag
          minZoom={FIT_MIN_ZOOM}
          maxZoom={FIT_MAX_ZOOM}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          {/* Graph Background - Adds a subtle dot grid for spatial context. */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--kg-bg-dot)"
          />

          {/* Auto Viewport - Re-centers the graph when the layout or canvas size changes. */}
          <AutoViewport
            bounds={layout.bounds}
            containerRef={canvasRef}
            graphKey={layout.graphKey}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
