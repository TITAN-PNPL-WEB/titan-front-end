import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';

interface Props {
  data: { label: string; highlighted: boolean };
}

function PcAnnotationNode({ data }: Props) {
  return (
    <>
      <Handle type="source" position={Position.Top}    id="t" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Left}   id="l" style={{ opacity: 0, width: 1, height: 1 }} />
      <div style={{
        background: data.highlighted ? '#fde68a' : '#fef9c3',
        border: `1.5px solid ${data.highlighted ? '#d97706' : '#ca8a04'}`,
        borderRadius: 4,
        padding: '3px 10px',
        fontSize: 11,
        fontStyle: 'italic',
        color: '#78350f',
        whiteSpace: 'nowrap',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: data.highlighted
          ? '0 0 0 2px #fbbf24'
          : '0 1px 3px rgba(0,0,0,0.15)',
      }}>
        {data.label};
      </div>
    </>
  );
}

export default memo(PcAnnotationNode);
