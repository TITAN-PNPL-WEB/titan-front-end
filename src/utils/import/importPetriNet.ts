import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import { layoutPetriNet } from '../pn/layoutPetriNet';

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

  const children = Array.from(root.children);
  const placeEls = children.filter(el => el.tagName === 'places');
  const transEls = children.filter(el => el.tagName === 'trans');
  const arcEls   = children.filter(el => el.tagName === 'arcs');

  const placeIds = placeEls.map((_, i) => `p-imp-${i}`);
  const transIds = transEls.map((_, i) => `t-imp-${i}`);
  const arcIds   = arcEls.map((_, i)   => `a-imp-${i}`);

  const arcData = arcEls.map((el, i) => {
    const typAttr = el.getAttribute('xsi:type') ?? '';
    const isPT    = typAttr.includes('PTArc');
    const inIdx   = parseIndex(el.getAttribute('input')  ?? '');
    const outIdx  = parseIndex(el.getAttribute('output') ?? '');
    return {
      id:     arcIds[i],
      name:   el.getAttribute('name') ?? `arc${i + 1}`,
      isPT,
      source: isPT ? (placeIds[inIdx] ?? '') : (transIds[inIdx] ?? ''),
      target: isPT ? (transIds[outIdx] ?? '') : (placeIds[outIdx] ?? ''),
    };
  });

  // Build raw nodes (positions will be assigned by layoutPetriNet)
  const rawNodes: Node[] = [
    ...placeEls.map((el, i) => ({
      id:       placeIds[i],
      type:     'place' as const,
      position: { x: 0, y: 0 },
      data: {
        label:  el.getAttribute('name') ?? `P${i + 1}`,
        tokens: parseInt(el.getAttribute('marking') ?? '0', 10),
      },
    })),
    ...transEls.map((el, i) => ({
      id:       transIds[i],
      type:     'transition' as const,
      position: { x: 0, y: 0 },
      data: {
        label: el.getAttribute('name') ?? `T${i + 1}`,
      },
    })),
  ];

  // Build raw edges (handles will be assigned by layoutPetriNet)
  const rawEdges: Edge[] = arcData
    .filter(a => a.source && a.target)
    .map(a => ({
      id:                  a.id,
      source:              a.source,
      target:              a.target,
      label:               a.name,
      labelStyle:          { fontSize: 11 },
      labelBgStyle:        { fill: '#fff', fillOpacity: 0.85 },
      labelBgPadding:      [4, 4] as [number, number],
      labelBgBorderRadius: 3,
      data:                { label: a.name, arcType: a.isPT ? 'PT' : 'TP' },
      markerEnd:           { type: MarkerType.ArrowClosed },
    }));

  const { nodes, edges } = layoutPetriNet(rawNodes, rawEdges);

  let maxArcIndex = 0;
  for (const a of arcData) {
    const m = a.name.match(/^arc(\d+)$/);
    if (m) maxArcIndex = Math.max(maxArcIndex, parseInt(m[1], 10));
  }

  return { nodes, edges, maxArcIndex };
}
