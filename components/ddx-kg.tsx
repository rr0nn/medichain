"use client";

/**
 * @fileoverview Renders the knowledge-graph view that explains evidence behind ranked differentials.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi, Aryan Wadhawan
 */

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";

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

const NODE_WIDTH = 180;
const NODE_GAP_X = 40;
const ROW_GAP_Y = 130;

function nodeStyle(tier: Tier, emphasized = false) {
  const { bg, border } = TIER_STYLE[tier];
  return {
    background: bg,
    color: "var(--foreground)",
    border: `1.5px solid ${border}`,
    borderRadius: 14,
    padding: emphasized ? "14px 16px" : "10px 12px",
    fontSize: emphasized ? 14 : 12,
    fontWeight: emphasized ? 600 : 500,
    width: emphasized ? NODE_WIDTH + 40 : NODE_WIDTH,
    textAlign: "center" as const,
    whiteSpace: "pre-line" as const,
    boxShadow: emphasized
      ? `0 8px 24px color-mix(in oklch, ${border} 35%, transparent)`
      : "0 1px 2px rgba(0,0,0,0.06)",
  };
}

function rowX(i: number, count: number) {
  const rowWidth = count * NODE_WIDTH + (count - 1) * NODE_GAP_X;
  const start = -rowWidth / 2 + NODE_WIDTH / 2;
  return start + i * (NODE_WIDTH + NODE_GAP_X);
}

export function DdxKG({ diagnosis, diagnosisName }: DdxKGProps) {
  if (diagnosis.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
        No evidence paths to visualize.
      </div>
    );
  }

  const presentations = Array.from(
    new Set(diagnosis.map((p) => p.clinicalPresentationName)),
  );
  const evidence = Array.from(
    new Map(
      diagnosis.map((p) => [
        `${p.evidenceType}:${p.evidenceName}`,
        { name: p.evidenceName, type: p.evidenceType, featureType: p.featureType },
      ]),
    ).values(),
  );

  const presentationNodes: Node[] = presentations.map((name, i) => ({
    id: `pres-${name}`,
    position: { x: rowX(i, presentations.length), y: 0 },
    data: { label: name },
    style: nodeStyle("presentation"),
    sourcePosition: "bottom" as const,
    targetPosition: "top" as const,
  }));

  const evidenceNodes: Node[] = evidence.map((e, i) => ({
    id: `ev-${e.type}-${e.name}`,
    position: { x: rowX(i, evidence.length), y: ROW_GAP_Y },
    data: {
      label:
        e.type === "feature" && e.featureType
          ? `${e.name}\n(${e.featureType})`
          : e.name,
    },
    style: nodeStyle(e.type),
    sourcePosition: "bottom" as const,
    targetPosition: "top" as const,
  }));

  const diagnosisNode: Node = {
    id: `dx-${diagnosisName}`,
    position: { x: rowX(0, 1), y: ROW_GAP_Y * 2 },
    data: { label: diagnosisName },
    style: nodeStyle("diagnosis", true),
    type: "output",
    targetPosition: "top" as const,
  };

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

  const edges: Edge[] = [
    ...diagnosis.map((p, i) => ({
      id: `e-pres-ev-${i}`,
      source: `pres-${p.clinicalPresentationName}`,
      target: `ev-${p.evidenceType}-${p.evidenceName}`,
      type: "smoothstep" as const,
      style: edgeStyle,
      markerEnd: marker,
    })),
    ...diagnosis.map((p, i) => ({
      id: `e-ev-dx-${i}`,
      source: `ev-${p.evidenceType}-${p.evidenceName}`,
      target: `dx-${diagnosisName}`,
      type: "smoothstep" as const,
      style: edgeStyle,
      markerEnd: marker,
    })),
  ];

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-xl border border-[color:var(--glass-border)] bg-background/40">
      <ReactFlow
        nodes={[...presentationNodes, ...evidenceNodes, diagnosisNode]}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="var(--kg-bg-dot)"
        />
      </ReactFlow>
    </div>
  );
}
