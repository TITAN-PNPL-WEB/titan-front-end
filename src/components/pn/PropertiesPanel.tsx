import type { Node } from '@xyflow/react';
import type { PlaceData, TransitionData } from '../../types/petrinet';

interface PropertiesPanelProps {
  node: Node | null;
  onLabelChange: (id: string, label: string) => void;
  onTokensChange: (id: string, tokens: number) => void;
}

function PropertiesPanel({ node, onLabelChange, onTokensChange }: PropertiesPanelProps) {
  if (!node) return null;

  const data = node.data as unknown as PlaceData | TransitionData;

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      background: 'white',
      padding: 16,
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 200,
    }}>
      <h4 style={{ margin: '0 0 12px 0' }}>
        {node.type === 'place' ? 'Place' : 'Transition'} properties
      </h4>

      {/* Label */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Label</label>
        <input
          value={data.label}
          onChange={(e) => onLabelChange(node.id, e.target.value)}
          style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Tokens — only for places */}
      {node.type === 'place' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tokens</label>
          <input
            type="number"
            min={0}
            value={(data as PlaceData).tokens}
            onChange={(e) => onTokensChange(node.id, parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
          />
        </div>
      )}
    </div>
  );
}

export default PropertiesPanel;