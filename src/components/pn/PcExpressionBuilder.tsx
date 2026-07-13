import type { PcExpression } from '../../types/petrinet';
import type { FMFeature } from '../fm/ConstraintBuilder';

// PcDraft extends PcExpression to allow null children while building the tree
export type PcDraft =
  | { type: 'feature'; featureId: string }
  | { type: 'not'; right: PcDraft | null }
  | { type: 'binary'; op: 'AND' | 'OR' | 'IMPLIES'; left: PcDraft | null; right: PcDraft | null }

// Converts a draft to a complete expression; returns null if any node is missing
export function toComplete(d: PcDraft | null): PcExpression | null {
  if (!d) return null;
  if (d.type === 'feature') return d.featureId ? { type: 'feature', featureId: d.featureId } : null;
  if (d.type === 'not') {
    const right = toComplete(d.right);
    return right ? { type: 'not', right } : null;
  }
  const left = toComplete(d.left);
  const right = toComplete(d.right);
  return left && right ? { type: 'binary', op: d.op, left, right } : null;
}

const OP_COLORS: Record<string, { bg: string; text: string }> = {
  feature: { bg: '#1a73e8', text: '#fff' },
  not:     { bg: '#e65100', text: '#fff' },
  AND:     { bg: '#2e7d32', text: '#fff' },
  OR:      { bg: '#6a1b9a', text: '#fff' },
  IMPLIES: { bg: '#795548', text: '#fff' },
};

function Badge({ label }: { label: string }) {
  const color = OP_COLORS[label] ?? { bg: '#555', text: '#fff' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      background: color.bg, color: color.text, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

const btnSm: React.CSSProperties = {
  fontSize: 11, padding: '1px 6px', borderRadius: 3,
  border: '1px solid #ccc', background: '#fafafa', color: '#555',
  cursor: 'pointer', flexShrink: 0,
};

function WrapSelect({ current, onChange }: {
  current: PcDraft;
  onChange: (d: PcDraft) => void;
}) {
  return (
    <select
      value=""
      title="Wrap this expression inside another"
      onChange={e => {
        const v = e.target.value;
        if (!v) return;
        if (v === 'not') { onChange({ type: 'not', right: current }); return; }
        onChange({ type: 'binary', op: v as 'AND' | 'OR' | 'IMPLIES', left: current, right: null });
      }}
      style={{ fontSize: 11, padding: '1px 4px', cursor: 'pointer', color: '#555' }}
    >
      <option value="">Wrap…</option>
      <option value="not">NOT ( this )</option>
      <option value="AND">this AND …</option>
      <option value="OR">this OR …</option>
      <option value="IMPLIES">this IMPLIES …</option>
    </select>
  );
}

function NodePicker({ onChange, features }: {
  onChange: (d: PcDraft) => void;
  features: FMFeature[];
}) {
  const options: Array<{ label: string; make: () => PcDraft }> = [
    { label: 'Feature',  make: () => ({ type: 'feature', featureId: features[0]?.id ?? '' }) },
    { label: 'NOT',      make: () => ({ type: 'not', right: null }) },
    { label: 'AND',      make: () => ({ type: 'binary', op: 'AND', left: null, right: null }) },
    { label: 'OR',       make: () => ({ type: 'binary', op: 'OR', left: null, right: null }) },
    { label: 'IMPLIES',  make: () => ({ type: 'binary', op: 'IMPLIES', left: null, right: null }) },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#aaa' }}>+</span>
      {options.map(({ label, make }) => (
        <button key={label} onClick={() => onChange(make())} style={btnSm}>{label}</button>
      ))}
    </div>
  );
}

const treeIndent: React.CSSProperties = {
  marginLeft: 12, paddingLeft: 10, borderLeft: '2px solid #e8e8e8', marginTop: 4,
};

function ExpressionNode({ value, onChange, features }: {
  value: PcDraft | null;
  onChange: (d: PcDraft | null) => void;
  features: FMFeature[];
}) {
  if (value === null) {
    if (features.length === 0) {
      return <span style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>No FM features available.</span>;
    }
    return <NodePicker onChange={onChange} features={features} />;
  }

  if (value.type === 'feature') {
    return (
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge label="FEATURE" />
        <select
          value={value.featureId}
          onChange={e => onChange({ type: 'feature', featureId: e.target.value })}
          style={{ fontSize: 12 }}
        >
          {features.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <WrapSelect current={value} onChange={d => onChange(d)} />
        <button onClick={() => onChange(null)} style={btnSm} title="Remove">×</button>
      </div>
    );
  }

  if (value.type === 'not') {
    const child = value.right;
    return (
      <div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <Badge label="NOT" />
          <WrapSelect current={value} onChange={d => onChange(d)} />
          {child !== null && (
            <button onClick={() => onChange(child)} style={btnSm} title="Remove NOT, keep child">
              Unwrap
            </button>
          )}
          <button onClick={() => onChange(null)} style={btnSm} title="Remove">×</button>
        </div>
        <div style={treeIndent}>
          <ExpressionNode
            value={value.right}
            onChange={right => onChange({ type: 'not', right })}
            features={features}
          />
        </div>
      </div>
    );
  }

  // binary
  const { op, left, right } = value;
  return (
    <div>
      {/* Header — controls for the whole binary node */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
        <select
          value={op}
          onChange={e => onChange({ type: 'binary', op: e.target.value as 'AND' | 'OR' | 'IMPLIES', left, right })}
          style={{
            fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            background: OP_COLORS[op]?.bg, color: OP_COLORS[op]?.text,
            border: 'none', cursor: 'pointer',
          }}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
          <option value="IMPLIES">IMPLIES</option>
        </select>
        <WrapSelect current={value} onChange={d => onChange(d)} />
        <button onClick={() => onChange(null)} style={btnSm} title="Remove">×</button>
      </div>
      <div style={treeIndent}>
        <ExpressionNode
          value={left}
          onChange={l => onChange({ type: 'binary', op, left: l, right: value.right })}
          features={features}
        />
      </div>
      <div style={treeIndent}>
        <ExpressionNode
          value={right}
          onChange={r => onChange({ type: 'binary', op, left: value.left, right: r })}
          features={features}
        />
      </div>
    </div>
  );
}

interface Props {
  value: PcDraft | null;
  onChange: (d: PcDraft | null) => void;
  features: FMFeature[];
}

export default function PcExpressionBuilder({ value, onChange, features }: Props) {
  return (
    <div style={{
      background: '#f9f9f9', borderRadius: 6, padding: 12,
      border: '1px solid #e8e8e8', fontSize: 12,
    }}>
      <ExpressionNode value={value} onChange={onChange} features={features} />
    </div>
  );
}
