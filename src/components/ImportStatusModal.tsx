import type { ValidationIssue } from '../utils/api/titanApi';

type ImportStatus =
  | { phase: 'validating' }
  | { phase: 'error'; message: string }
  | { phase: 'invalid'; issues: ValidationIssue[] };

interface Props {
  status: ImportStatus;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const boxStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: '28px 32px',
  minWidth: 420, maxWidth: 560, width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  display: 'flex', flexDirection: 'column', gap: 16,
};

const btnPrimary: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 5, border: 'none',
  background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
};

const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 18, height: 18,
      border: '2.5px solid #e0e0e0', borderTopColor: '#1a1a1a',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      verticalAlign: 'middle', marginRight: 8,
    }} />
  );
}

export type { ImportStatus };

export default function ImportStatusModal({ status, onClose }: Props) {
  function renderBody() {
    if (status.phase === 'validating') {
      return (
        <>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Importing files</div>
          <div style={{ color: '#555', fontSize: 13 }}>
            <Spinner />Validating model...
          </div>
        </>
      );
    }

    if (status.phase === 'error') {
      return (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#b91c1c' }}>Import failed</div>
          <div style={{ color: '#7f1d1d', fontSize: 13, background: '#fef2f2', borderRadius: 5, padding: '10px 14px' }}>
            {status.message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={btnPrimary} onClick={onClose}>Close</button>
          </div>
        </>
      );
    }

    // invalid
    return (
      <>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#b91c1c' }}>
          ✗ Import failed — {status.issues.length} validation {status.issues.length === 1 ? 'error' : 'errors'}
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {status.issues.map((iss, i) => (
            <div key={i} style={{
              fontSize: 12, background: '#fef2f2', borderRadius: 4,
              padding: '7px 10px',
              borderLeft: `3px solid ${iss.severity === 'ERROR' ? '#dc2626' : '#f59e0b'}`,
            }}>
              <div style={{ fontWeight: 600, color: iss.severity === 'ERROR' ? '#b91c1c' : '#92400e', marginBottom: 2 }}>
                {iss.severity} — Line {iss.line}, Col {iss.column}
              </div>
              <div style={{ color: '#374151' }}>{iss.message}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Please fix the .vrb file and try again.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnPrimary} onClick={onClose}>Close</button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={overlayStyle}>
        <div style={boxStyle}>
          {renderBody()}
        </div>
      </div>
    </>
  );
}
