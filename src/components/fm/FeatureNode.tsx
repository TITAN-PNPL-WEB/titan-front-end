import { useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface FeatureData extends Record<string, unknown> {
  label: string;
  abstract: boolean;
  root: boolean;
  mandatory?: boolean;
}

export default function FeatureNode({ data, selected, id }: NodeProps) {
  const d = data as unknown as FeatureData;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(d.label);

  const onDoubleClick = useCallback(() => {
    setEditing(true);
  }, []);

  const onBlur = useCallback(() => {
    setEditing(false);
    // Notify React Flow of the data change
    const event = new CustomEvent('feature-label-change', { detail: { id, label: value } });
    window.dispatchEvent(event);
  }, [id, value]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setEditing(false);
      const event = new CustomEvent('feature-label-change', { detail: { id, label: value } });
      window.dispatchEvent(event);
    }
  }, [id, value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {!d.root && (
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          border: '2px solid #555',
          background: d.mandatory ? '#555' : 'white',
          marginBottom: 4,
        }} />
      )}

      <div
        onDoubleClick={onDoubleClick}
        style={{
          padding: '6px 16px',
          borderRadius: 4,
          border: `2px solid ${selected ? '#555' : '#9b7fd4'}`,
          background: d.abstract ? '#e8d5f5' : '#c5cff5',
          fontSize: 13,
          fontWeight: 500,
          minWidth: 80,
          textAlign: 'center',
          cursor: 'default',
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            style={{
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: 80,
              textAlign: 'center',
            }}
          />
        ) : (
          d.label
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}