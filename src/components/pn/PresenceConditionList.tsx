import type { Node, Edge } from '@xyflow/react';
import type { PresenceCondition } from '../../types/petrinet';
import { constraintToString, type FMFeature } from '../fm/ConstraintBuilder';

interface Props {
  presenceConditions: PresenceCondition[];
  fmFeatures: FMFeature[];
  allPnNodes: Node[];
  allPnEdges: Edge[];
  highlightedPcId: string | null;
  onHighlight: (pcId: string | null) => void;
  onEdit: (pcId: string) => void;
  onRemove: (pcId: string) => void;
}

export default function PresenceConditionList({
  presenceConditions, fmFeatures, allPnNodes, allPnEdges,
  highlightedPcId, onHighlight, onEdit, onRemove,
}: Props) {
  if (presenceConditions.length === 0) return null;

  function getLabel(id: string): string {
    const node = allPnNodes.find(n => n.id === id);
    if (node) return (node.data.label as string) ?? id;
    const edge = allPnEdges.find(e => e.id === id);
    return (edge?.data?.label as string) ?? id;
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
      left: 10,
      zIndex: 10,
      background: 'white',
      padding: 12,
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: 240,
      maxWidth: 340,
      maxHeight: 220,
      overflowY: 'auto',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 8 }}>
        Presence Conditions ({presenceConditions.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {presenceConditions.map((pc, i) => {
          const isHighlighted = highlightedPcId === pc.id;
          const expression = constraintToString(pc.expression, fmFeatures);
          const elementLabels = pc.elementIds.map(getLabel).join(', ');
          return (
            <div
              key={pc.id}
              onClick={() => onHighlight(isHighlighted ? null : pc.id)}
              style={{
                cursor: 'pointer',
                borderRadius: 4,
                padding: '5px 8px',
                background: isHighlighted ? '#fff8e1' : '#fafafa',
                border: isHighlighted ? '1px solid #f5a623' : '1px solid #e0e0e0',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: '#6d28d9' }}>PC{i + 1}:</span>
                  {' '}
                  <span style={{ fontFamily: 'monospace', color: '#1a1a1a', wordBreak: 'break-all' }}>
                    {expression}
                  </span>
                  <div style={{ color: '#555', marginTop: 2 }}>→ {elementLabels}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, paddingTop: 1 }}>
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(pc.id); }}
                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: '1px solid #1a73e8', background: '#e8f0fe', color: '#1a73e8', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(pc.id); }}
                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: '1px solid #f5a623', background: '#fffbf2', color: '#b26200', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
