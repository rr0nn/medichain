"use client";
import { useState } from "react";
import { ReactFlow, Background, Controls } from '@xyflow/react';
import { DifferentialDiagnosisEvidenceRef } from "@/server/ai/workflows/ddx-workflow/types";

// testing rn

type DdxKGProps = {
  diagnosis: DifferentialDiagnosisEvidenceRef[]; // array of paths
  diagnosisName?: string; // optional string
};

export function DdxKG({diagnosis, diagnosisName} : DdxKGProps) {
    const [nodes] = useState([
    {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: diagnosisName },
      type: 'input',
    },
    {
      id: 'n2',
      position: { x: 100, y: 100 },
      data: { label: 'Node 2' },
    },
  ]);
  console.log(diagnosis)
  return (
    <div style={{ height: '500px', width: '100%' }}>
      <ReactFlow nodes={nodes}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}