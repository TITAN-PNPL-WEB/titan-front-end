import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';

const PLACE_SIZE = 60;
const TRANS_W = 40;
const TRANS_H = 60;

function nodeCenter(pos: { x: number; y: number }, type: string) {
  return type === 'place'
    ? { x: pos.x + PLACE_SIZE / 2, y: pos.y + PLACE_SIZE / 2 }
    : { x: pos.x + TRANS_W / 2,   y: pos.y + TRANS_H / 2 };
}

// Pick handles purely based on the direction between the two node centers.
// No "avoid used handles" logic — that caused arcs to get handles pointing
// the wrong way when their preferred handle was already taken.
function assignHandles(
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
  srcType: string,
  tgtType: string,
): { sourceHandle: string; targetHandle: string } {
  const sc = nodeCenter(srcPos, srcType);
  const tc = nodeCenter(tgtPos, tgtType);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'e', targetHandle: 'w' }
      : { sourceHandle: 'w', targetHandle: 'e' };
  }
  return dy >= 0
    ? { sourceHandle: 's', targetHandle: 'n' }
    : { sourceHandle: 'n', targetHandle: 's' };
}

export function layoutPetriNet(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const placeNodes = nodes.filter(n => n.type === 'place');
  const transNodes = nodes.filter(n => n.type === 'transition');

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of placeNodes) g.setNode(n.id, { width: PLACE_SIZE, height: PLACE_SIZE });
  for (const n of transNodes) g.setNode(n.id, { width: TRANS_W,    height: TRANS_H });
  for (const e of edges) {
    if (e.source && e.target) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const pos = new Map<string, { x: number; y: number }>();
  for (const n of placeNodes) {
    const gn = g.node(n.id);
    if (gn) pos.set(n.id, { x: gn.x - PLACE_SIZE / 2, y: gn.y - PLACE_SIZE / 2 });
  }
  for (const n of transNodes) {
    const gn = g.node(n.id);
    if (gn) pos.set(n.id, { x: gn.x - TRANS_W / 2, y: gn.y - TRANS_H / 2 });
  }

  const laidOutNodes = nodes.map(n => {
    const p = pos.get(n.id);
    return p ? { ...n, position: p } : n;
  });

  const laidOutEdges = edges.map(e => {
    const srcPos = pos.get(e.source);
    const tgtPos = pos.get(e.target);
    if (!srcPos || !tgtPos) return e;

    const srcType = nodes.find(n => n.id === e.source)?.type ?? 'place';
    const tgtType = nodes.find(n => n.id === e.target)?.type ?? 'place';
    const { sourceHandle, targetHandle } = assignHandles(srcPos, tgtPos, srcType, tgtType);

    return { ...e, sourceHandle, targetHandle };
  });

  return { nodes: laidOutNodes, edges: laidOutEdges };
}
