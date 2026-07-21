import type { Node, Edge } from '@xyflow/react';
import type { PresenceCondition, PcExpression } from '../../types/petrinet';
import type { FMFeature } from '../../components/fm/ConstraintBuilder';

function getElementLabel(id: string, nodes: Node[], edges: Edge[]): string {
  const node = nodes.find(n => n.id === id);
  if (node) return node.data.label as string;
  const edge = edges.find(e => e.id === id);
  return (edge?.data?.label as string) ?? id;
}

function serializeExpr(expr: PcExpression, features: FMFeature[]): string {
  if (expr.type === 'feature') {
    return features.find(f => f.id === expr.featureId)?.label ?? expr.featureId;
  }
  if (expr.type === 'not') {
    const inner = serializeExpr(expr.right, features);
    if (expr.right.type === 'binary' || expr.right.type === 'not') {
      return `not (${inner})`;
    }
    return `not ${inner}`;
  }
  const left  = serializeExpr(expr.left, features);
  const right = serializeExpr(expr.right, features);
  const op = expr.op === 'AND' ? 'and' : expr.op === 'OR' ? 'or' : 'implies';
  return `( ${left} ${op} ${right} )`;
}

export function exportVariability(
  pcs: PresenceCondition[],
  pnNodes: Node[],
  pnEdges: Edge[],
  fmFeatures: FMFeature[],
  pnFilename: string,
  fmFilename: string
): string {
  const lines: string[] = [
    `pn "${pnFilename}"`,
    `fm "${fmFilename}"`,
    '',
  ];

  for (const pc of pcs) {
    const elementLabels = pc.elementIds
      .map(id => getElementLabel(id, pnNodes, pnEdges))
      .join(' , ');
    const exprStr = serializeExpr(pc.expression, fmFeatures);
    lines.push(`PC for ${elementLabels} = ${exprStr} ;`);
  }

  return lines.join('\n');
}
