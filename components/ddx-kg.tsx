"use client";

/**
 * @fileoverview Renders the knowledge-graph view that explains evidence behind ranked differentials.
 * @contributors Johnson Zhang, Aleisha Ly, Alyssa Ooi
 */

import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';

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

const NODE_STYLES = {
  presentation: {
    background: '#ffd7d0',
    border: '#fc9f8f',
  },
  category: {
    background: '#fdffe3',
    border: '#e3b008',
  },
  feature: {
    background: '#dbeafe',
    border: '#2563eb',
  },
  diagnosis: {
    background: '#d0f2ff',
    border: '#0ea5e9',
  },
} as const;

const LEGEND_ITEMS = [
  { label: "Presentation", colour: NODE_STYLES.presentation.background },
  { label: "Category", colour: NODE_STYLES.category.background },
  { label: "Feature", colour: NODE_STYLES.feature.background },
  { label: "Diagnosis", colour: NODE_STYLES.diagnosis.background },
];

type NodeProps = {
  id: string,
  index: number,
  row: number,
  item: string,
  type: string,
  background: string,
  border: string,
}

type EdgeProps = {
  i: number,
  from: string,
  sourceNumber: number,
  to: string,
  targetNumber: number,
  colour: string
}

export function DdxKG({ diagnosis, diagnosisName }: DdxKGProps) {
  const grouped = {
    presentations: Array.from(
      new Set(diagnosis.map((path) => path.clinicalPresentationName)),
    ),
    evidence: Array.from(
      new Map(
        diagnosis.map((path) => [
          `${path.evidenceType}:${path.evidenceName}`,
          {
            name: path.evidenceName,
            type: path.evidenceType,
            featureType: path.featureType,
          },
        ]),
      ).values(),
    ),
  };

  const makeNode = ({ id, index, row, item, type, background, border }: NodeProps) => {
    return {
      id,
      position: { x: index * 200, y: row * 200 },
      data: { label: item },
      type: type,
      style: {
        background,
        color: '#000000',
        border: background === 'none' ? background : `${border} 2px solid`,
        borderRadius: 15,
        whiteSpace: 'pre-line',
      },
    }
  };

  const presentationNodes = grouped.presentations.map((item, index) =>
    makeNode({
      id: `n-0-${item}`,
      index: index + 1.5,
      row: 0,
      item,
      type: 'default',
      background: NODE_STYLES.presentation.background,
      border: NODE_STYLES.presentation.border,
    }),
  );

  const evidenceNodes = grouped.evidence.map((item, index) => {
    const style =
      item.type === 'feature' ? NODE_STYLES.feature : NODE_STYLES.category;
    const label =
      item.type === 'feature' && item.featureType
        ? `${item.name}\n(${item.featureType})`
        : item.name;

    return makeNode({
      id: `n-1-${item.type}-${item.name}`,
      index: index + 1.5,
      row: 1,
      item: label,
      type: 'default',
      background: style.background,
      border: style.border,
    });
  });

  const allNodes = [
    ...presentationNodes,
    ...evidenceNodes,
    makeNode({
      id: `n-2-${diagnosisName}`,
      index: (grouped.evidence.length - 1) / 2 + 1.5,
      row: 2,
      item: diagnosisName,
      type: 'output',
      background: NODE_STYLES.diagnosis.background,
      border: NODE_STYLES.diagnosis.border,
    })
  ];

  const makeEdge = ({ i, from, sourceNumber, to, targetNumber, colour }: EdgeProps) => {
    return {
      id: `n-${i}-${to}`,
      source: `n-${sourceNumber}-${from}`,
      target: `n-${targetNumber}-${to}`,
      type: 'step',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: colour,
      },
      style: {
        stroke: colour,
        strokeWidth: 2,
      },
    }
  };

  const edges = diagnosis.map((path, i) => {
    return makeEdge({
      i,
      from: path.clinicalPresentationName,
      sourceNumber: 0,
      to: path.evidenceName,
      targetNumber: 1,
      colour: '#757575',
    })
  });

  const finalEdge = diagnosis.map((path, i) => {
    return makeEdge({
      i,
      from: path.evidenceName,
      sourceNumber: 1,
      to: diagnosisName,
      targetNumber: 2,
      colour: '#757575',
    })
  }
  );

  const allEdges = [
    ...edges.map((edge, index) => ({
      ...edge,
      source: `n-0-${diagnosis[index].clinicalPresentationName}`,
      target: `n-1-${diagnosis[index].evidenceType}-${diagnosis[index].evidenceName}`,
    })),
    ...finalEdge.map((edge, index) => ({
      ...edge,
      source: `n-1-${diagnosis[index].evidenceType}-${diagnosis[index].evidenceName}`,
      target: `n-2-${diagnosisName}`,
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex flex-wrap items-center gap-4 rounded-lg border border-input/30 bg-border/11 p-3">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-sm"
              style={{ backgroundColor: item.colour }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ height: '500px', width: '100%' }}>
        <ReactFlow nodes={allNodes} edges={allEdges}>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
