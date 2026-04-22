import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

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
  style,
  data,
}: EdgeProps) {
  const d = data as unknown as GroupEdgeData;
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  // Triangle at the source end
  const filled = d?.groupType === 'or';
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
  const size = 12;
  const tx = sourceX + Math.cos(angle) * size;
  const ty = sourceY + Math.sin(angle) * size;
  const lx = sourceX + Math.cos(angle + Math.PI / 2) * (size / 2);
  const ly = sourceY + Math.sin(angle + Math.PI / 2) * (size / 2);
  const rx = sourceX + Math.cos(angle - Math.PI / 2) * (size / 2);
  const ry = sourceY + Math.sin(angle - Math.PI / 2) * (size / 2);
  const triangle = `M ${lx} ${ly} L ${tx} ${ty} L ${rx} ${ry} Z`;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <path
        d={triangle}
        fill={filled ? '#333' : 'white'}
        stroke="#333"
        strokeWidth={1.5}
      />
    </>
  );
}