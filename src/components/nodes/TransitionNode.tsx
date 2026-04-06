import { Handle, Position } from '@xyflow/react';
import type { TransitionData } from '../../types/petrinet';

function TransitionNode({ data }: { data: TransitionData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 16,
        height: 60,
        border: '2px solid black',
        background: 'black',
        position: 'relative',
      }}>
       <Handle type="source" position={Position.Left} id="left" style={{ top: 30 }} />
<Handle type="source" position={Position.Right} id="right" style={{ top: 30 }} />
       </div>
      <span style={{ fontSize: 12, marginTop: 4 }}>{data.label}</span>
    </div>
  );
}

export default TransitionNode;