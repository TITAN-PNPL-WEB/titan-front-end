import { useState, useEffect, useMemo } from 'react';
import type { PNSelectedElement, PresenceCondition } from '../../types/petrinet';
import type { Constraint } from '../../types/featuremodel';
import { EMPTY_CONSTRAINT } from '../../types/featuremodel';
import ConstraintBuilder, { constraintToString, type FMFeature } from '../fm/ConstraintBuilder';
import { validatePresenceCondition } from '../../utils/pn/validatePresenceCondition';

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  place:      { bg: '#e8f0fe', color: '#1a73e8' },
  transition: { bg: '#f0f0f0', color: '#1a1a1a' },
  arc:        { bg: '#f5f5f5', color: '#666' },
};

interface Props {
  elements: PNSelectedElement[];
  fmFeatures: FMFeature[];
  presenceConditions: PresenceCondition[];
  initialConstraint?: Constraint;
  onConfirm: (constraint: Constraint) => void;
  onCancel: () => void;
}

export default function PresenceConditionModal({ elements, fmFeatures, presenceConditions, initialConstraint, onConfirm, onCancel }: Props) {
  const [constraint, setConstraint] = useState<Constraint>(initialConstraint ?? EMPTY_CONSTRAINT);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const elementIds = useMemo(() => elements.map(e => e.id), [elements]);

  const validationErrors = useMemo(() => validatePresenceCondition({
    elementIds,
    expression: constraint,
    fmFeatures,
    presenceConditions,
  }), [elementIds, constraint, fmFeatures, presenceConditions]);

  const canConfirm = validationErrors.length === 0;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          width: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          {initialConstraint !== undefined ? 'Edit Presence Condition' : 'Add Presence Condition'}
        </h3>

        {/* Elements list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>Applies to</span>
          {elements.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#b26200', background: '#fffbf2', border: '1px solid #f5a623', borderRadius: 4, padding: '6px 10px' }}>
              No elements selected. Close and select at least one element.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {elements.map(el => {
                const colors = TYPE_COLORS[el.elementType] ?? TYPE_COLORS.arc;
                return (
                  <div key={el.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e0e0e0', borderRadius: 4, padding: '3px 8px', fontSize: 12, background: '#fafafa' }}>
                    <span style={{ background: colors.bg, color: colors.color, borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {el.elementType}
                    </span>
                    <span style={{ fontWeight: 500 }}>{el.label || el.id}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expression builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ConstraintBuilder features={fmFeatures} value={constraint} onChange={setConstraint} />
        </div>

        {/* Expression preview */}
        {constraint.terms.length > 0 && (
          <div style={{ fontSize: 12, color: '#555' }}>
            Expression: <span style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>{constraintToString(constraint, fmFeatures)}</span>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {validationErrors.map(err => (
              <div
                key={err.rule}
                style={{ fontSize: 12, color: '#b26200', background: '#fffbf2', border: '1px solid #f5a623', borderRadius: 4, padding: '5px 10px' }}
              >
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
            onClick={() => onConfirm(constraint)}
            disabled={!canConfirm}
            style={{ padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 4, background: canConfirm ? '#1a1a1a' : '#ccc', color: '#fff', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            {initialConstraint !== undefined ? 'Save' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
