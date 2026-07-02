import { Handle, Position } from '@xyflow/react';
import type { TransitionData } from '../../types/petrinet';

const HANDLES = [
  { id: 'n',  x: 8,  y: 0,  position: Position.Top    },
  { id: 'ne', x: 16, y: 0,  position: Position.Top    },
  { id: 'e',  x: 16, y: 30, position: Position.Right  },
  { id: 'se', x: 16, y: 60, position: Position.Bottom },
  { id: 's',  x: 8,  y: 60, position: Position.Bottom },
  { id: 'sw', x: 0,  y: 60, position: Position.Bottom },
  { id: 'w',  x: 0,  y: 30, position: Position.Left   },
  { id: 'nw', x: 0,  y: 0,  position: Position.Top    },
];

function TransitionNode({ data, selected }: { data: TransitionData & { pcLabel?: string }; selected: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 16,
        height: 60,
        border: selected ? '2.5px solid #1a73e8' : '2px solid black',
        background: 'black',
        position: 'relative',
      }}>
        {HANDLES.map(({ id, x, y, position }) => (
          <Handle
            key={id}
            type="source"
            position={position}
            id={id}
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              width: 4,
              height: 4,
              background: '#555',
              border: 'none',
              opacity: 0,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, marginTop: 4 }}>{data.label}</span>
      {data.pcLabel && (
        <span style={{
          fontSize: 9, marginTop: 2, fontStyle: 'italic',
          color: '#6d28d9', background: '#ede9fe',
          borderRadius: 3, padding: '1px 4px', maxWidth: 80,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          [{data.pcLabel}]
        </span>
      )}
    </div>
  );
}

export default TransitionNode;