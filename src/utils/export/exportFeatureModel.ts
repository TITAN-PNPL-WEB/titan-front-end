import type { Node, Edge } from '@xyflow/react';
import type { Constraint, ConstraintTerm } from '../../types/featuremodel';

interface FMNodeData {
  label: string;
  abstract?: boolean;
  root?: boolean;
  mandatory?: boolean;
}

function termToXml(term: ConstraintTerm, getLabel: (id: string) => string): string {
  const src = getLabel(term.sourceId);
  if (term.type === 'feature') return `<var>${src}</var>`;
  const tgt = getLabel(term.targetId!);
  if (term.type === 'requires') return `<imp><var>${src}</var><var>${tgt}</var></imp>`;
  return `<not><conj><var>${src}</var><var>${tgt}</var></conj></not>`;
}

function constraintToXml(c: Constraint, getLabel: (id: string) => string): string {
  if (c.terms.length === 0) return '';
  const termXmls = c.terms.map(t => termToXml(t, getLabel));
  if (termXmls.length === 1) return termXmls[0];
  let result = termXmls[0];
  for (let i = 0; i < c.operators.length; i++) {
    const tag = c.operators[i] === '∧' ? 'conj' : 'disj';
    result = `<${tag}>${result}${termXmls[i + 1]}</${tag}>`;
  }
  return result;
}

function serializeNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  getLabel: (id: string) => string,
  level: number
): string[] {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return [];

  const data = node.data as unknown as FMNodeData;
  const isRoot    = data.root === true;
  const mandatory = data.mandatory === true || isRoot;
  const indent    = '\t'.repeat(level);
  const childIndent = '\t'.repeat(level + 1);

  const attrParts: string[] = [];
  if (mandatory) attrParts.push('mandatory="true"');
  if (data.abstract) attrParts.push('abstract="true"');
  attrParts.push(`name="${data.label}"`);
  const attrStr = attrParts.join(' ');

  const childEdges = edges.filter(e => e.source === nodeId);

  if (childEdges.length === 0) {
    return [`${indent}<feature ${attrStr}/>`];
  }

  const hasOr  = childEdges.some(e => (e.data as Record<string, unknown>)?.groupType === 'or');
  const hasXor = childEdges.some(e => (e.data as Record<string, unknown>)?.groupType === 'xor');
  const tag = isRoot ? 'and' : hasOr ? 'or' : hasXor ? 'alt' : 'and';

  const lines: string[] = [];
  lines.push(`${indent}<${tag} ${attrStr}>`);
  lines.push(`${childIndent}<graphics key="collapsed" value="false"/>`);
  for (const ce of childEdges) {
    lines.push(...serializeNode(ce.target, nodes, edges, getLabel, level + 1));
  }
  lines.push(`${indent}</${tag}>`);
  return lines;
}

export function exportFeatureModel(
  nodes: Node[],
  edges: Edge[],
  constraints: Constraint[]
): string {
  const getLabel = (id: string) =>
    ((nodes.find(n => n.id === id)?.data) as FMNodeData | undefined)?.label ?? id;

  const root = nodes.find(n => (n.data as unknown as FMNodeData).root === true);

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<featureModel>',
    '\t<properties>',
    '\t\t<graphics key="showhiddenfeatures" value="true"/>',
    '\t\t<graphics key="legendautolayout" value="true"/>',
    '\t\t<graphics key="showshortnames" value="false"/>',
    '\t\t<graphics key="layout" value="horizontal"/>',
    '\t\t<graphics key="showcollapsedconstraints" value="true"/>',
    '\t\t<graphics key="legendhidden" value="false"/>',
    '\t\t<graphics key="layoutalgorithm" value="1"/>',
    '\t</properties>',
    '\t<struct>',
  ];

  if (root) {
    lines.push(...serializeNode(root.id, nodes, edges, getLabel, 2));
  }

  lines.push('\t</struct>');

  const validConstraints = constraints.filter(c => c.terms.length > 0);
  if (validConstraints.length > 0) {
    lines.push('\t<constraints>');
    for (const c of validConstraints) {
      const xml = constraintToXml(c, getLabel);
      lines.push('\t\t<rule>');
      lines.push(`\t\t\t${xml}`);
      lines.push('\t\t</rule>');
    }
    lines.push('\t</constraints>');
  }

  lines.push('</featureModel>');
  return lines.join('\n');
}
