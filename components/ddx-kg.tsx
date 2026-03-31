"use client";
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';

type DdxKGProps = {
  diagnosis: string[][]; 
  diagnosisName: string; 
};

type NodeProps = {
    index: number,
    i: number,
    item: string,
    type: string,
    background: string,
}

type EdgeProps = {
    i: number,
    from: string, 
    sourceNumber: number,
    to: string,
    targetNumber: number,
    colour: string
}

export function DdxKG({diagnosis, diagnosisName} : DdxKGProps) {
    const grouped: string[][] = [
        Array.from(new Set(diagnosis.map(pair => pair[0]))),
        Array.from(new Set(diagnosis.map(pair => pair[1]))),
    ];

    const labelNames = ['Presentation', 'Category', 'Diagnosis Result'];

    const makeNode = ({index, i, item, type, background} : NodeProps) => {
        return {
            id: `n-${i}-${item}`,
            position: { x: index * 200, y: i * 150 },
            data: { label: item },
            type: type, 
            style: {
                background: background,  //cant find the right colour in theme to be fixed
                color: '#000000',          
                border: background === 'none' ? background : '2px solid #1b7d7e',
                borderRadius: 15,
            },
        }
    };

    const nodes = grouped.flatMap((diagnosisPoint, i) =>
        diagnosisPoint.map((item, index) => {
            return makeNode({index, i, item, type: 'default', background: '#b2e2d9'})
        })
    );

    const labelNodes = [];

    for (let i = 0; i < 3; i++) {
        labelNodes.push(makeNode({
            index: -1,
            i,
            item: 'Level ' + `${i + 1}: ` + labelNames[i],
            type: 'output',
            background: 'none',
        }))
    }
    
    const allNodes = [...nodes,
        makeNode({
            index: (grouped[1].length - 1)/2,
            i: 2,
            item: diagnosisName,
            type: 'output',
            background: '#b2e2d9',
        }),...labelNodes
    ];

    const makeEdge = ({i, from, sourceNumber, to, targetNumber, colour} : EdgeProps) => {
        return {
            id: `n-${i}-${to}`,        
            source: `n-${sourceNumber}-${from}`,   
            target: `n-${targetNumber}-${to}`, 
            type: 'step',
            markerEnd: {
                type: MarkerType.ArrowClosed, 
                width: 15,
                height: 15,
                color: colour, 
            },
            style: {
                stroke: colour,  
                strokeWidth: 2,
            },
        }
    };

    const edges = diagnosis.map(([start, link], i) => {
        return makeEdge({
            i,
            from: start,
            sourceNumber: 0,
            to: link,
            targetNumber: 1,
            colour: '#000000',
        })
    });

    const finalEdge = diagnosis.map((getLink, i) => {
        return makeEdge({
            i,
            from: getLink[1],
            sourceNumber: 1,
            to: diagnosisName,
            targetNumber: 2,
            colour: '#ff0000',
        })}
    );

    const allEdges = [...edges, ...finalEdge];

    console.log(diagnosis)
    return (
        <div style={{ height: '500px', width: '100%' }}>
        <ReactFlow nodes={allNodes} edges={allEdges}>
            <Background />
            <Controls />
        </ReactFlow>
        </div>
    );
}