import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import dagre from 'dagre';

const PLACE_SIZE = 60;
const TRANS_W    = 40;
const TRANS_H    = 60;

function layoutPN(
  placeIds: string[],
  transIds: string[],
  arcs: { src: string; tgt: string }[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of placeIds) g.setNode(id, { width: PLACE_SIZE, height: PLACE_SIZE });
  for (const id of transIds) g.setNode(id, { width: TRANS_W,   height: TRANS_H });
  for (const { src, tgt } of arcs) {
    if (src && tgt) g.setEdge(src, tgt);
  }
  dagre.layout(g);

  const pos = new Map<string, { x: number; y: number }>();
  for (const id of placeIds) {
    const n = g.node(id);
    if (n) pos.set(id, { x: n.x - PLACE_SIZE / 2, y: n.y - PLACE_SIZE / 2 });
  }
  for (const id of transIds) {
    const n = g.node(id);
    if (n) pos.set(id, { x: n.x - TRANS_W / 2, y: n.y - TRANS_H / 2 });
  }
  return pos;
}

function parseIndex(ref: string): number {
  return parseInt(ref.split('.').pop() ?? '0', 10);
}

export interface PNImportResult {
  nodes: Node[];
  edges: Edge[];
  maxArcIndex: number;
}

export function importPetriNet(xml: string): PNImportResult {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  const children   = Array.from(root.children);
  const placeEls   = children.filter(el => el.tagName === 'places');
  const transEls   = children.filter(el => el.tagName === 'trans');
  const arcEls     = children.filter(el => el.tagName === 'arcs');

  const placeIds = placeEls.map((_, i) => `p-imp-${i}`);
  const transIds = transEls.map((_, i) => `t-imp-${i}`);
  const arcIds   = arcEls.map((_, i)   => `a-imp-${i}`);

  const arcData = arcEls.map((el, i) => {
    const typAttr = el.getAttribute('xsi:type') ?? '';
    const isPT    = typAttr.includes('PTArc');
    const inRef   = el.getAttribute('input')  ?? '';
    const outRef  = el.getAttribute('output') ?? '';
    const inIdx   = parseIndex(inRef);
    const outIdx  = parseIndex(outRef);

    return {
      id:     arcIds[i],
      name:   el.getAttribute('name') ?? `arc${i + 1}`,
      isPT,
      source: isPT ? (placeIds[inIdx]  ?? '') : (transIds[inIdx]  ?? ''),
      target: isPT ? (transIds[outIdx] ?? '') : (placeIds[outIdx] ?? ''),
    };
  });

  const pos = layoutPN(
    placeIds,
    transIds,
    arcData.map(a => ({ src: a.source, tgt: a.target })),
  );

  const nodes: Node[] = [
    ...placeEls.map((el, i) => ({
      id:       placeIds[i],
      type:     'place',
      position: pos.get(placeIds[i]) ?? { x: i * 140, y: 0 },
      data: {
        label:  el.getAttribute('name') ?? `P${i + 1}`,
        tokens: parseInt(el.getAttribute('marking') ?? '0', 10),
      },
    })),
    ...transEls.map((el, i) => ({
      id:       transIds[i],
      type:     'transition',
      position: pos.get(transIds[i]) ?? { x: i * 140, y: 200 },
      data: {
        label: el.getAttribute('name') ?? `T${i + 1}`,
      },
    })),
  ];

  const edges: Edge[] = arcData
    .filter(a => a.source && a.target)
    .map(a => ({
      id:     a.id,
      source: a.source,
      target: a.target,
      label:  a.name,
      labelStyle:          { fontSize: 11 },
      labelBgStyle:        { fill: '#fff', fillOpacity: 0.85 },
      labelBgPadding:      [4, 4] as [number, number],
      labelBgBorderRadius: 3,
      data:   { label: a.name, arcType: a.isPT ? 'PT' : 'TP' },
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

  let maxArcIndex = 0;
  for (const a of arcData) {
    const m = a.name.match(/^arc(\d+)$/);
    if (m) maxArcIndex = Math.max(maxArcIndex, parseInt(m[1], 10));
  }

  return { nodes, edges, maxArcIndex };
}
