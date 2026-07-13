import { useState, useEffect, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { PNSelectedElement, PcExpression, PresenceCondition } from '../../types/petrinet';
import type { FMFeature } from '../fm/ConstraintBuilder';
import { validatePresenceCondition } from '../../utils/pn/validatePresenceCondition';
import { pcExpressionToString } from '../../utils/pn/pcExpression';
import PcExpressionBuilder, { type PcDraft, toComplete } from './PcExpressionBuilder';

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  place:      { bg: '#e8f0fe', color: '#1a73e8' },
  transition: { bg: '#f0f0f0', color: '#1a1a1a' },
  arc:        { bg: '#f5f5f5', color: '#666' },
};

interface Props {
  elements: PNSelectedElement[];
  allPnNodes?: Node[];
  allPnEdges?: Edge[];
  fmFeatures: FMFeature[];
  presenceConditions: PresenceCondition[];
  initialExpression?: PcExpression;
  editingId?: string;
  onConfirm: (expression: PcExpression | null, elements: PNSelectedElement[]) => void;
  onCancel: () => void;
}

export default function PresenceConditionModal({
  elements, allPnNodes, allPnEdges, fmFeatures, presenceConditions,
  initialExpression, editingId, onConfirm, onCancel,
}: Props) {
  const [draft, setDraft] = useState<PcDraft | null>(initialExpression ?? null);
  const [localElements, setLocalElements] = useState<PNSelectedElement[]>(elements);

  const isEditing = initialExpression !== undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const expression = useMemo(() => toComplete(draft), [draft]);
  const elementIds = useMemo(() => localElements.map(e => e.id), [localElements]);
  const elementLabels = useMemo(
    () => Object.fromEntries(localElements.map(e => [e.id, e.label || e.id])),
    [localElements]
  );

  const validationErrors = useMemo(() => validatePresenceCondition({
    elementIds,
    expression,
    fmFeatures,
    presenceConditions,
    editingId,
    elementLabels,
  }), [elementIds, expression, fmFeatures, presenceConditions, editingId, elementLabels]);

  // Elements available to add in edit mode
  const availableToAdd = useMemo<PNSelectedElement[]>(() => {
    if (!isEditing) return [];
    const localIds = new Set(localElements.map(e => e.id));
    const occupiedIds = new Set<string>();
    presenceConditions.forEach(pc => {
      if (pc.id !== editingId) pc.elementIds.forEach(id => occupiedIds.add(id));
    });
    return [
      ...(allPnNodes ?? []).map(n => ({
        id: n.id,
        elementType: n.type as 'place' | 'transition',
        label: (n.data?.label as string) ?? n.id,
      })),
      ...(allPnEdges ?? []).map(e => ({
        id: e.id,
        elementType: 'arc' as const,
        label: (e.data?.label as string) ?? e.id,
      })),
    ].filter(el => !localIds.has(el.id) && !occupiedIds.has(el.id));
  }, [isEditing, localElements, allPnNodes, allPnEdges, presenceConditions, editingId]);

  const canConfirm = validationErrors.length === 0;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 8, padding: 24, width: 520,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 18,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          {isEditing ? 'Edit Presence Condition' : 'Add Presence Condition'}
        </h3>

        {/* Elements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>Applies to</span>
          {localElements.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#b26200', background: '#fffbf2', border: '1px solid #f5a623', borderRadius: 4, padding: '6px 10px' }}>
              No elements selected. Add at least one element.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {localElements.map(el => {
                const colors = TYPE_COLORS[el.elementType] ?? TYPE_COLORS.arc;
                return (
                  <div key={el.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e0e0e0', borderRadius: 4, padding: '3px 8px', fontSize: 12, background: '#fafafa' }}>
                    <span style={{ background: colors.bg, color: colors.color, borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {el.elementType}
                    </span>
                    <span style={{ fontWeight: 500 }}>{el.label || el.id}</span>
                    {isEditing && (
                      <button
                        onClick={() => setLocalElements(prev => prev.filter(e => e.id !== el.id))}
                        style={{ marginLeft: 2, padding: '0 2px', fontSize: 11, border: 'none', background: 'transparent', color: '#999', cursor: 'pointer', fontWeight: 700 }}
                      >×</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isEditing && availableToAdd.length > 0 && (
            <select
              value=""
              onChange={e => {
                const el = availableToAdd.find(a => a.id === e.target.value);
                if (el) setLocalElements(prev => [...prev, el]);
              }}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', color: '#333', background: '#fff', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              <option value="">+ Add element…</option>
              {availableToAdd.map(el => (
                <option key={el.id} value={el.id}>[{el.elementType}] {el.label || el.id}</option>
              ))}
            </select>
          )}
        </div>

        {/* Expression builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>Boolean expression</span>
          <PcExpressionBuilder value={draft} onChange={setDraft} features={fmFeatures} />
        </div>

        {/* Expression preview */}
        {expression !== null && (
          <div style={{ fontSize: 12, color: '#555' }}>
            Preview: <span style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>{pcExpressionToString(expression, fmFeatures)}</span>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {validationErrors.map(err => (
              <div key={err.rule} style={{ fontSize: 12, color: '#b26200', background: '#fffbf2', border: '1px solid #f5a623', borderRadius: 4, padding: '5px 10px' }}>
                {err.message}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ padding: '6px 16px', fontSize: 13, border: '1px solid #999', borderRadius: 4, background: '#f5f5f5', color: '#333', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(expression, localElements)}
            disabled={!canConfirm}
            style={{ padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 4, background: canConfirm ? '#1a1a1a' : '#ccc', color: '#fff', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            {isEditing ? 'Save' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
