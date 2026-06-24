import type { Node, Edge } from '@xyflow/react';
import type { PlaceData, TransitionData } from '../../types/petrinet';

interface PropertiesPanelProps {
  node: Node | null;
  edge: Edge | null;
  onLabelChange: (id: string, label: string) => void;
  onEdgeLabelChange: (id: string, label: string) => void;
  onTokensChange: (id: string, tokens: number) => void;
}

function PropertiesPanel({ node, edge, onLabelChange, onEdgeLabelChange, onTokensChange }: PropertiesPanelProps) {
  if (!node && !edge) return null;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    background: 'white',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    minWidth: 200,
  };

  if (edge) {
    const label = (edge.data?.label as string) ?? '';
    return (
      <div style={panelStyle}>
        <h4 style={{ margin: '0 0 12px 0' }}>Arc properties</h4>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Label</label>
          <input
            value={label}
            onChange={e => onEdgeLabelChange(edge.id, e.target.value)}
            style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    );
  }

  const data = node!.data as unknown as PlaceData | TransitionData;

  return (
    <div style={panelStyle}>
      <h4 style={{ margin: '0 0 12px 0' }}>
        {node!.type === 'place' ? 'Place' : 'Transition'} properties
      </h4>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Label</label>
        <input
          value={data.label}
          onChange={e => onLabelChange(node!.id, e.target.value)}
          style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
        />
      </div>

      {node!.type === 'place' && (
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Tokens</label>
          <input
            type="number"
            min={0}
            value={(data as PlaceData).tokens}
            onChange={e => onTokensChange(node!.id, parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box' }}
          />
        </div>
      )}
    </div>
  );
}

export default PropertiesPanel;
