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
  title?: string;
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
const CANVAS_PADDING_Y = 72;
const COLUMN_GAP_X = 240;
const BAND_GAP_Y = 72;
const EVIDENCE_GAP_Y = 28;
const NODE_BASE_HEIGHT = 56;
const NODE_DETAIL_HEIGHT = 18;
const NODE_LINE_HEIGHT = 16;
const CHARS_PER_LINE = 24;

const TIER_LABEL: Record<Tier, string> = {
  presentation: "Presentation",
  category: "Category",
  feature: "Feature",
  diagnosis: "Diagnosis",
};

const FIT_VIEW_OPTIONS = { padding: 0.16, minZoom: 0.55, maxZoom: 1 };

type EvidenceNodeEntry = {
  id: string;
  presentationName: string;
  evidenceName: string;
  evidenceType: "category" | "feature";
  featureType?: string;
};

type PresentationBand = {
  centerY: number;
  height: number;
  evidence: Array<
    EvidenceNodeEntry & {
      label: string;
      detail?: string;
      estimatedHeight: number;
      y: number;
    }
  >;
};

function DdxKGNode({ data }: NodeProps & { data: DdxKGNodeData }) {
  const { bg, border } = TIER_STYLE[data.tier];

  return (
    <div
      title={data.title ?? data.label}
      style={{
        background: bg,
        borderColor: border,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
      className="w-40 rounded-lg border px-3 py-2.5 text-left text-foreground"
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
        className="mt-1 text-[11px] font-medium leading-tight"
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
  return heights.reduce((sum, height) => sum + height, 0) +
    gap * Math.max(0, heights.length - 1);
}

function buildVerticalCenters(heights: number[], centerY: number, gap: number) {
  const totalHeight =
    heights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, heights.length - 1);
  const centers: number[] = [];
  let cursor = centerY - totalHeight / 2;

  for (const height of heights) {
    centers.push(cursor + height / 2);
    cursor += height + gap;
  }

  return centers;
}

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

  const evidenceNodes = useMemo(
    () =>
      Array.from(
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
      ),
    [diagnosis],
  );

  const nodes = useMemo(() => {
    const simpleLinearCase = presentations.length === 1 && evidenceNodes.length === 1;

    const evidenceByPresentation = new Map<string, EvidenceNodeEntry[]>();
    for (const evidence of evidenceNodes) {
      const existing = evidenceByPresentation.get(evidence.presentationName) ?? [];
      existing.push(evidence);
      evidenceByPresentation.set(evidence.presentationName, existing);
    }

    const evidenceGroupsByPresentation = new Map<
      string,
      Array<
        EvidenceNodeEntry & {
          label: string;
          detail?: string;
          estimatedHeight: number;
        }
      >
    >();

    for (const presentationName of presentations) {
      const orderedGroup = [...(evidenceByPresentation.get(presentationName) ?? [])]
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
            label,
            detail,
            estimatedHeight: estimatedNodeHeight(label, detail),
          };
        });

      evidenceGroupsByPresentation.set(presentationName, orderedGroup);
    }

    const bands: PresentationBand[] = [];
    for (const presentationName of presentations) {
      const presentationLabel = formatDdxName(presentationName);
      const presentationHeight = estimatedNodeHeight(presentationLabel);
      const evidenceGroup = evidenceGroupsByPresentation.get(presentationName) ?? [];
      const evidenceHeights = evidenceGroup.map((entry) => entry.estimatedHeight);
      const evidenceStackHeight = simpleLinearCase
        ? evidenceHeights[0] ?? 0
        : stackHeight(evidenceHeights, EVIDENCE_GAP_Y);
      const bandHeight = Math.max(presentationHeight, evidenceStackHeight);
      const previousBand = bands.at(-1);
      const centerY = previousBand
        ? previousBand.centerY + previousBand.height / 2 + BAND_GAP_Y + bandHeight / 2
        : CANVAS_PADDING_Y + bandHeight / 2;

      const evidenceCenters = simpleLinearCase
        ? [centerY]
        : buildVerticalCenters(evidenceHeights, centerY, EVIDENCE_GAP_Y);

      bands.push({
        centerY,
        height: bandHeight,
        evidence: evidenceGroup.map((entry, index) => ({
          ...entry,
          y: evidenceCenters[index] ?? centerY,
        })),
      });
    }

    const bandCenterByPresentation = new Map(
      presentations.map((name, index) => [name, bands[index]] as const),
    );

    const presentationNodes: Node<DdxKGNodeData>[] = presentations.map((name, index) => ({
      id: `pres-${name}`,
      type: "ddx",
      position: {
        x: CANVAS_PADDING_X,
        y: bands[index].centerY,
      },
      data: {
        label: formatDdxName(name),
        tier: "presentation",
        title: formatDdxName(name),
      },
    }));

    const evidenceFlowNodes: Node<DdxKGNodeData>[] = evidenceNodes.map((evidence) => {
      const band = bandCenterByPresentation.get(evidence.presentationName);
      const positionedEvidence = band?.evidence.find((entry) => entry.id === evidence.id);
      const label = positionedEvidence?.label ?? formatDdxName(evidence.evidenceName);
      const detail = positionedEvidence?.detail;

      return {
        id: evidence.id,
        type: "ddx",
        position: {
          x: CANVAS_PADDING_X + COLUMN_GAP_X,
          y: positionedEvidence?.y ?? band?.centerY ?? CANVAS_PADDING_Y,
        },
        data: {
          label,
          tier: evidence.evidenceType,
          detail,
          title: detail ? `${label}\n${detail}` : label,
        },
      };
    });

    const diagnosisY = simpleLinearCase
      ? bands[0].centerY
      : bands.reduce((sum, band) => sum + band.centerY, 0) / bands.length;

    const diagnosisNode: Node<DdxKGNodeData> = {
      id: `dx-${diagnosisName}`,
      type: "ddx",
      position: {
        x: CANVAS_PADDING_X + COLUMN_GAP_X * 2,
        y: diagnosisY,
      },
      data: {
        label: formatDdxName(diagnosisName),
        tier: "diagnosis",
        title: formatDdxName(diagnosisName),
      },
    };

    return [...presentationNodes, ...evidenceFlowNodes, diagnosisNode];
  }, [diagnosisName, evidenceNodes, presentations]);

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
        target: `ev-${path.clinicalPresentationName}-${path.evidenceType}-${path.evidenceName}`,
        type: "smoothstep" as const,
        style: edgeStyle,
        markerEnd: marker,
      })),
      ...diagnosis.map((path, index) => ({
        id: `e-ev-dx-${index}`,
        source: `ev-${path.clinicalPresentationName}-${path.evidenceType}-${path.evidenceName}`,
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
        nodeOrigin={[0, 0.5]}
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
