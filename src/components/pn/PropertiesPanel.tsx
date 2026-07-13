import type { Node, Edge } from '@xyflow/react';
import type { PlaceData, TransitionData, PresenceCondition } from '../../types/petrinet';
import type { FMFeature } from '../fm/ConstraintBuilder';
import { pcExpressionToString } from '../../utils/pn/pcExpression';

interface PropertiesPanelProps {
  node: Node | null;
  edge: Edge | null;
  onLabelChange: (id: string, label: string) => void;
  onEdgeLabelChange: (id: string, label: string) => void;
  onTokensChange: (id: string, tokens: number) => void;
  presenceConditions: PresenceCondition[];
  fmFeatures: FMFeature[];
  allPnNodes: Node[];
  allPnEdges: Edge[];
  onEditPC: (pcId: string) => void;
  onRemovePC: (pcId: string) => void;
}

function PropertiesPanel({
  node, edge,
  onLabelChange, onEdgeLabelChange, onTokensChange,
  presenceConditions, fmFeatures, allPnNodes, allPnEdges,
  onEditPC, onRemovePC,
}: PropertiesPanelProps) {
  if (!node && !edge) return null;

  const selectedId = node?.id ?? edge?.id ?? '';
  const pc = presenceConditions.find(p => p.elementIds.includes(selectedId)) ?? null;

  const otherElementLabels = pc
    ? pc.elementIds
        .filter(id => id !== selectedId)
        .map(id => {
          const n = allPnNodes.find(n => n.id === id);
          if (n) return (n.data.label as string) ?? id;
          const e = allPnEdges.find(e => e.id === id);
          return (e?.data?.label as string) ?? id;
        })
    : [];

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
    maxWidth: 260,
  };

  const pcSection = (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 6 }}>
        Presence Condition
      </div>
      {pc ? (
        <>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#1a1a1a', marginBottom: 4, wordBreak: 'break-word' }}>
            {pcExpressionToString(pc.expression, fmFeatures)}
          </div>
          {otherElementLabels.length > 0 && (
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
              Shared with: {otherElementLabels.join(', ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onEditPC(pc.id)}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, border: '1px solid #1a73e8', background: '#e8f0fe', color: '#1a73e8', cursor: 'pointer' }}
            >
              Edit
            </button>
            <button
              onClick={() => onRemovePC(pc.id)}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, border: '1px solid #f5a623', background: '#fffbf2', color: '#b26200', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>None assigned</div>
      )}
    </div>
  );

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
        {pcSection}
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
        <div style={{ marginBottom: 0 }}>
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

      {pcSection}
    </div>
  );
}

export default PropertiesPanel;
