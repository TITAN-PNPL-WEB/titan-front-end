import type { Node, Edge } from '@xyflow/react';

export function exportPetriNet(nodes: Node[], edges: Edge[]): string {
  const places = nodes.filter(n => n.type === 'place');
  const transitions = nodes.filter(n => n.type === 'transition');

  const placeIds  = new Set(places.map(p => p.id));
  const placeIdx  = new Map(places.map((p, i) => [p.id, i]));
  const transIdx  = new Map(transitions.map((t, i) => [t.id, i]));
  const arcIdx    = new Map(edges.map((a, i) => [a.id, i]));

  function arcType(a: typeof edges[number]): 'PT' | 'TP' {
    return (a.data?.arcType as 'PT' | 'TP') ?? (placeIds.has(a.source) ? 'PT' : 'TP');
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ex:PetriNet xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ex="http://www.petrinets.org/">',
  ];

  for (const place of places) {
    const label = place.data.label as string;
    const tokens = (place.data.tokens as number) ?? 0;
    const outArcs = edges.filter(a => arcType(a) === 'PT' && a.source === place.id);
    const inArcs  = edges.filter(a => arcType(a) === 'TP' && a.target === place.id);

    const attrs: string[] = [`name="${label}"`];
    if (tokens > 0) attrs.push(`marking="${tokens}"`);
    if (outArcs.length) attrs.push(`outputs="${outArcs.map(a => `//@arcs.${arcIdx.get(a.id)}`).join(' ')}"`);
    if (inArcs.length)  attrs.push(`inputs="${inArcs.map(a => `//@arcs.${arcIdx.get(a.id)}`).join(' ')}"`);
    lines.push(`  <places ${attrs.join(' ')}/>`);
  }

  for (const trans of transitions) {
    const label = trans.data.label as string;
    const inArcs  = edges.filter(a => arcType(a) === 'PT' && a.target === trans.id);
    const outArcs = edges.filter(a => arcType(a) === 'TP' && a.source === trans.id);

    const attrs: string[] = [`name="${label}"`];
    if (inArcs.length)  attrs.push(`inputs="${inArcs.map(a => `//@arcs.${arcIdx.get(a.id)}`).join(' ')}"`);
    if (outArcs.length) attrs.push(`outputs="${outArcs.map(a => `//@arcs.${arcIdx.get(a.id)}`).join(' ')}"`);
    lines.push(`  <trans ${attrs.join(' ')}/>`);
  }

  for (const arc of edges) {
    const label = arc.data?.label as string;
    const at    = arcType(arc);

    const inputRef  = at === 'PT'
      ? `//@places.${placeIdx.get(arc.source)}`
      : `//@trans.${transIdx.get(arc.source)}`;
    const outputRef = at === 'PT'
      ? `//@trans.${transIdx.get(arc.target)}`
      : `//@places.${placeIdx.get(arc.target)}`;

    lines.push(`  <arcs xsi:type="ex:${at}Arc" name="${label}" input="${inputRef}" output="${outputRef}"/>`);
  }

  lines.push('</ex:PetriNet>');
  return lines.join('\n');
}
