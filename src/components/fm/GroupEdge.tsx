import { getStraightPath, useStore, type EdgeProps, type ReactFlowState } from '@xyflow/react';

interface GroupEdgeData extends Record<string, unknown> {
  groupType: 'or' | 'xor';
}

export default function GroupEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
}: EdgeProps) {
  const d = data as unknown as GroupEdgeData;
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  const { storeEdges, nodeLookup } = useStore((s: ReactFlowState) => ({
    storeEdges: s.edges,
    nodeLookup: s.nodeLookup,
  }));

  const thisEdge = storeEdges.find(e => e.id === id);

  // Siblings: same source, type=group, same groupType
  const siblings = storeEdges.filter(e =>
    e.source === thisEdge?.source &&
    e.type === 'group' &&
    (e.data as GroupEdgeData)?.groupType === d?.groupType
  );

  const isFirst = siblings.length > 0 && siblings[0].id === id;

  // Only the first sibling edge draws the arc/sector
  let arcEl: React.ReactNode = null;
  if (isFirst && siblings.length >= 2) {
    const targetPoints = siblings.map(s => {
      const node = nodeLookup.get(s.target);
      if (!node) return null;
      const w = node.measured?.width ?? 120;
      const pos = node.internals.positionAbsolute;
      return { x: pos.x + w / 2, y: pos.y };
    }).filter((p): p is { x: number; y: number } => p !== null);

    if (targetPoints.length >= 2) {
      // Angles from the source handle to each child's top-center handle
      const angles = targetPoints.map(p =>
        Math.atan2(p.y - sourceY, p.x - sourceX)
      );
      const minAngle = Math.min(...angles); // rightmost child
      const maxAngle = Math.max(...angles); // leftmost child

      const R = 14;
      const x1 = sourceX + R * Math.cos(minAngle);
      const y1 = sourceY + R * Math.sin(minAngle);
      const x2 = sourceX + R * Math.cos(maxAngle);
      const y2 = sourceY + R * Math.sin(maxAngle);
      const largeArc = maxAngle - minAngle > Math.PI ? 1 : 0;

      if (d?.groupType === 'or') {
        // Filled sector: line to right edge → arc clockwise → close to source
        const sectorPath = `M ${sourceX} ${sourceY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        arcEl = <path d={sectorPath} fill="#333" stroke="#333" strokeWidth={1} />;
      } else {
        // XOR: open arc only (no fill)
        const arcPath = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`;
        arcEl = <path d={arcPath} fill="none" stroke="#333" strokeWidth={1.5} />;
      }
    }
  }

  return (
    <>
      <path d={edgePath} stroke="#555" strokeWidth={1.5} fill="none" markerEnd={markerEnd} />
      {arcEl}
    </>
  );
}
