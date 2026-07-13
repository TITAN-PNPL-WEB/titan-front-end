import { useState } from 'react';
import type { Constraint, ConstraintOperator, ConstraintTerm } from '../../types/featuremodel';
import { EMPTY_CONSTRAINT } from '../../types/featuremodel';

export interface FMFeature { id: string; label: string; }

interface Props {
  features: FMFeature[];
  value: Constraint;
  onChange: (c: Constraint) => void;
  allowExcludes?: boolean;
}

function termLabel(term: ConstraintTerm, features: FMFeature[]): string {
  const src = features.find(f => f.id === term.sourceId)?.label ?? term.sourceId;
  const tgt = features.find(f => f.id === term.targetId)?.label ?? '';
  if (term.type === 'feature') return src;
  if (term.type === 'requires') return `${src} ⇒ ${tgt}`;
  return `${src} excludes ${tgt}`;
}

export function constraintToString(c: Constraint, features: FMFeature[]): string {
  if (c.terms.length === 0) return '';
  return c.terms.map((t, i) => {
    const label = termLabel(t, features);
    const wrapped = c.terms.length > 1 ? `(${label})` : label;
    return i === 0 ? wrapped : ` ${c.operators[i - 1]} ${wrapped}`;
  }).join('');
}

export default function ConstraintBuilder({ features, value, onChange, allowExcludes = true }: Props) {
  const [addingTerm, setAddingTerm] = useState(false);
  const [termType, setTermType] = useState<'feature' | 'requires' | 'excludes'>('feature');
  const [termSource, setTermSource] = useState('');
  const [termTarget, setTermTarget] = useState('');
  const [pendingOperator, setPendingOperator] = useState<ConstraintOperator>('∧');

  const addTerm = () => {
    if (!termSource) return;
    if ((termType === 'requires' || termType === 'excludes') && !termTarget) return;
    if (termSource === termTarget) {
      alert('Source and target must be different');
      return;
    }
    const newTerm: ConstraintTerm = {
      id: `t${Date.now()}`,
      type: termType,
      sourceId: termSource,
      targetId: termTarget || undefined,
    };
    onChange({
      terms: [...value.terms, newTerm],
      operators: value.terms.length > 0 ? [...value.operators, pendingOperator] : value.operators,
    });
    setAddingTerm(false);
    setTermSource('');
    setTermTarget('');
  };

  const noFeatures = features.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

      {/* Current expression preview */}
      {value.terms.length > 0 && (
        <div style={{
          padding: '5px 10px', background: '#f5f5f5', borderRadius: 4,
          fontSize: 12, fontFamily: 'monospace', color: '#333',
        }}>
          {constraintToString(value, features)}
        </div>
      )}

      {/* Add term form */}
      {addingTerm ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {value.terms.length > 0 && (
            <select value={pendingOperator} onChange={e => setPendingOperator(e.target.value as ConstraintOperator)} style={{ fontSize: 12 }}>
              <option value="∧">AND (∧)</option>
              <option value="∨">OR (∨)</option>
            </select>
          )}
          <select value={termType} onChange={e => setTermType(e.target.value as 'feature' | 'requires' | 'excludes')} style={{ fontSize: 12 }}>
            <option value="feature">Feature</option>
            <option value="requires">Requires (⇒)</option>
            {allowExcludes && <option value="excludes">Excludes</option>}
          </select>
          <select value={termSource} onChange={e => setTermSource(e.target.value)} style={{ fontSize: 12 }}>
            <option value="">Select feature</option>
            {features.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          {(termType === 'requires' || termType === 'excludes') && (
            <select value={termTarget} onChange={e => setTermTarget(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Select feature B</option>
              {features.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          )}
          <button onClick={addTerm} style={{ fontSize: 12 }}>Add</button>
          <button onClick={() => { setAddingTerm(false); setTermSource(''); setTermTarget(''); }} style={{ fontSize: 12 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {noFeatures ? (
            <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
              No features available in the Feature Model.
            </span>
          ) : (
            <button onClick={() => setAddingTerm(true)} style={{ fontSize: 12 }}>
              + Add term
            </button>
          )}
          {value.terms.length > 0 && (
            <button onClick={() => onChange(EMPTY_CONSTRAINT)} style={{ fontSize: 12, color: '#888' }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
