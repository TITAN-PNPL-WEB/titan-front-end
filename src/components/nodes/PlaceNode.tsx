import { Handle, Position } from '@xyflow/react';
import type { PlaceData } from '../../types/petrinet';

function PlaceNode({ data }: { data: PlaceData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 50,
        height: 50,
        borderRadius: '50%',
        border: '2px solid black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        position: 'relative',
      }}>
        {data.tokens > 0 && <span style={{ fontSize: 14 }}>{'•'.repeat(data.tokens)}</span>}
       <Handle type="source" position={Position.Left} id="left" style={{ top: 25 }} />
<Handle type="source" position={Position.Right} id="right" style={{ top: 25 }} />
       </div>
      <span style={{ fontSize: 12, marginTop: 4 }}>{data.label}</span>
    </div>
  );
}

export default PlaceNode;