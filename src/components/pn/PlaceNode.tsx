import { Handle, Position } from '@xyflow/react';
import type { PlaceData } from '../../types/petrinet';

// 8 evenly spaced handles around the circle border.
// Angles in degrees, starting from top (north) going clockwise.
const RADIUS = 25;
const CENTER = 25;
const HANDLE_ANGLES = [
  { id: 'n', deg: -90, position: Position.Top },
  { id: 'ne', deg: -45, position: Position.Top },
  { id: 'e', deg: 0, position: Position.Right },
  { id: 'se', deg: 45, position: Position.Bottom },
  { id: 's', deg: 90, position: Position.Bottom },
  { id: 'sw', deg: 135, position: Position.Bottom },
  { id: 'w', deg: 180, position: Position.Left },
  { id: 'nw', deg: -135, position: Position.Top },
];

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

        {HANDLE_ANGLES.map(({ id, deg, position }) => {
          const rad = (deg * Math.PI) / 180;
          const x = CENTER + RADIUS * Math.cos(rad);
          const y = CENTER + RADIUS * Math.sin(rad);
          return (
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
          );
        })}
      </div>
      <span style={{ fontSize: 12, marginTop: 4 }}>{data.label}</span>
    </div>
  );
}

export default PlaceNode;