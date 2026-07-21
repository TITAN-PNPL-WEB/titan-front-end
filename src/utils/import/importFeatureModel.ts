import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import dagre from 'dagre';
import type { Constraint, ConstraintTerm, FeatureData } from '../../types/featuremodel';

const NODE_WIDTH  = 120;
const NODE_HEIGHT = 40;

function applyDagreLayout(nodes: Node<FeatureData>[], edges: Edge[]): Node<FeatureData>[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 } };
  });
}

let counter = 0;
function genId() { return `f-imp-${counter++}`; }

function parseStructEl(
  el: Element,
  parentId: string | null,
  parentTag: string | null,
  nodes: Node<FeatureData>[],
  edges: Edge[]
): void {
  const tag = el.tagName.toLowerCase();
  if (!['and', 'or', 'alt', 'feature'].includes(tag)) return;

  const id      = genId();
  const isRoot  = parentId === null;
  const label   = el.getAttribute('name') ?? 'Feature';
  const abstract_ = el.getAttribute('abstract') === 'true';
  const mandatory = el.getAttribute('mandatory') === 'true';

  nodes.push({
    id,
    type: 'feature',
    position: { x: 0, y: 0 },
    data: { label, abstract: abstract_, root: isRoot, mandatory: isRoot ? undefined : (mandatory || undefined) },
  });

  if (parentId !== null) {
    const isGroupEdge = parentTag === 'or' || parentTag === 'alt';
    const groupType   = parentTag === 'or' ? 'or' : parentTag === 'alt' ? 'xor' : undefined;
    const edge: Edge = {
      id:       `fe-imp-${id}`,
      source:   parentId,
      target:   id,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#555' },
      style:    { stroke: '#555', strokeWidth: 1.5 },
      ...(isGroupEdge ? { type: 'group', data: { groupType } } : {}),
    };
    edges.push(edge);
  }

  for (const child of Array.from(el.children)) {
    if (child.tagName.toLowerCase() === 'graphics') continue;
    parseStructEl(child, id, tag, nodes, edges);
  }
}

function parseConstraintEl(
  el: Element,
  idByLabel: Map<string, string>
): { terms: ConstraintTerm[]; operators: ('∧' | '∨')[] } | null {
  const tag = el.tagName.toLowerCase();

  if (tag === 'var') {
    const label = el.textContent?.trim() ?? '';
    const id    = idByLabel.get(label);
    if (!id) return null;
    return { terms: [{ id: `ct-${Math.random()}`, type: 'feature', sourceId: id }], operators: [] };
  }

  if (tag === 'imp') {
    const vars   = Array.from(el.getElementsByTagName('var'));
    const srcId  = idByLabel.get(vars[0]?.textContent?.trim() ?? '');
    const tgtId  = idByLabel.get(vars[1]?.textContent?.trim() ?? '');
    if (!srcId || !tgtId) return null;
    return { terms: [{ id: `ct-${Math.random()}`, type: 'requires', sourceId: srcId, targetId: tgtId }], operators: [] };
  }

  if (tag === 'not') {
    const child = el.children[0];
    if (child?.tagName.toLowerCase() === 'conj') {
      const vars  = Array.from(child.getElementsByTagName('var'));
      const srcId = idByLabel.get(vars[0]?.textContent?.trim() ?? '');
      const tgtId = idByLabel.get(vars[1]?.textContent?.trim() ?? '');
      if (!srcId || !tgtId) return null;
      return { terms: [{ id: `ct-${Math.random()}`, type: 'excludes', sourceId: srcId, targetId: tgtId }], operators: [] };
    }
    return null;
  }

  if (tag === 'conj' || tag === 'disj') {
    const ch = Array.from(el.children);
    if (ch.length !== 2) return null;
    const left  = parseConstraintEl(ch[0], idByLabel);
    const right = parseConstraintEl(ch[1], idByLabel);
    if (!left || !right) return null;
    const op: '∧' | '∨' = tag === 'conj' ? '∧' : '∨';
    return {
      terms:     [...left.terms,     ...right.terms],
      operators: [...left.operators,  op, ...right.operators],
    };
  }

  return null;
}

export interface FMImportResult {
  nodes: Node<FeatureData>[];
  edges: Edge[];
  constraints: Constraint[];
}

export function importFeatureModel(xml: string): FMImportResult {
  counter = 0;
  const doc  = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  const structEl = root.querySelector('struct');
  const nodes: Node<FeatureData>[] = [];
  const edges: Edge[] = [];

  if (structEl) {
    for (const child of Array.from(structEl.children)) {
      parseStructEl(child, null, null, nodes, edges);
      break; // only one root
    }
  }

  const laidNodes = applyDagreLayout(nodes, edges);

  const idByLabel = new Map(nodes.map(n => [n.data.label, n.id]));
  const constraints: Constraint[] = [];

  const ruleEls = Array.from(root.querySelectorAll('constraints > rule'));
  for (const rule of ruleEls) {
    const child = rule.children[0];
    if (!child) continue;
    const parsed = parseConstraintEl(child, idByLabel);
    if (parsed && parsed.terms.length > 0) {
      constraints.push({ terms: parsed.terms, operators: parsed.operators });
    }
  }

  return { nodes: laidNodes, edges, constraints };
}
