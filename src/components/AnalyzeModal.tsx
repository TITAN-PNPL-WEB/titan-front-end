import { useEffect, useRef, useState } from 'react';
import {
  uploadFiles,
  validateModel,
  getAnalyses,
  runAnalysis,
  type ValidationIssue,
  type AnalysisInfo,
  type AnalysisResult,
} from '../utils/api/titanApi';

export interface ModelFiles {
  vrb: Blob;
  vrbFilename: string;
  petrinets: Blob;
  petrinetsFilename: string;
  featureModel: Blob;
  featureModelFilename: string;
}

interface Props {
  generateFiles: () => ModelFiles;
  onClose: () => void;
}

type Phase =
  | { kind: 'uploading' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid'; issues: ValidationIssue[] }
  | { kind: 'select'; vrbPath: string; analyses: AnalysisInfo[] }
  | { kind: 'running'; vrbPath: string; analyses: AnalysisInfo[]; analysisName: string }
  | { kind: 'result'; vrbPath: string; analyses: AnalysisInfo[]; result: AnalysisResult };

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

const btnSecondary: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 5,
  border: '1px solid #ccc', background: '#fff',
  color: '#333', cursor: 'pointer', fontSize: 13,
};

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

const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

function groupByType(analyses: AnalysisInfo[]): Record<string, AnalysisInfo[]> {
  const groups: Record<string, AnalysisInfo[]> = {};
  for (const a of analyses) {
    (groups[a.type] ??= []).push(a);
  }
  return groups;
}

const TYPE_LABELS: Record<string, string> = {
  pnpl: 'PNPL Analyses',
  products: 'Product Analyses',
};

export default function AnalyzeModal({ generateFiles, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'uploading' });
  const started = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      let files: ModelFiles;
      try {
        files = generateFiles();
      } catch (err) {
        setPhase({ kind: 'error', message: String(err) });
        return;
      }

      setPhase({ kind: 'uploading' });

      let vrbPath: string;
      try {
        const up = await uploadFiles(
          files.vrb, files.vrbFilename,
          files.petrinets, files.petrinetsFilename,
          files.featureModel, files.featureModelFilename,
        );
        vrbPath = up.vrbPath;
      } catch (err) {
        setPhase({ kind: 'error', message: `Upload error: ${String(err)}` });
        return;
      }

      let valid: boolean;
      let issues: ValidationIssue[];
      try {
        const v = await validateModel(vrbPath);
        valid = v.valid;
        issues = v.issues;
      } catch (err) {
        setPhase({ kind: 'error', message: `Validation error: ${String(err)}` });
        return;
      }

      if (!valid) {
        setPhase({ kind: 'invalid', issues });
        return;
      }

      let analyses: AnalysisInfo[];
      try {
        const r = await getAnalyses();
        analyses = r.analyses;
      } catch (err) {
        setPhase({ kind: 'error', message: `Could not load analyses: ${String(err)}` });
        return;
      }

      setPhase({ kind: 'select', vrbPath, analyses });
    })();
  }, [generateFiles]);

  async function handleSelectAnalysis(vrbPath: string, analyses: AnalysisInfo[], a: AnalysisInfo) {
    setPhase({ kind: 'running', vrbPath, analyses, analysisName: a.name });
    try {
      const result = await runAnalysis(vrbPath, a.name, a.type);
      setPhase({ kind: 'result', vrbPath, analyses, result });
    } catch (err) {
      setPhase({ kind: 'error', message: `Analysis error: ${String(err)}` });
    }
  }

  function renderBody() {
    switch (phase.kind) {
      case 'uploading':
        return (
          <>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Analyzing model</div>
            <div style={{ color: '#555', fontSize: 13 }}>
              <Spinner />Uploading and validating model...
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#b91c1c' }}>Error</div>
            <div style={{ color: '#7f1d1d', fontSize: 13, background: '#fef2f2', borderRadius: 5, padding: '10px 14px' }}>
              {phase.message}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={btnPrimary} onClick={onClose}>Close</button>
            </div>
          </>
        );

      case 'invalid':
        return (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#b91c1c' }}>Validation failed</div>
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {phase.issues.map((iss, i) => (
                <div key={i} style={{
                  fontSize: 12, background: '#fef2f2', borderRadius: 4,
                  padding: '7px 10px', borderLeft: `3px solid ${iss.severity === 'ERROR' ? '#dc2626' : '#f59e0b'}`,
                }}>
                  <span style={{ fontWeight: 600, color: iss.severity === 'ERROR' ? '#b91c1c' : '#92400e' }}>
                    {iss.severity}
                  </span>
                  {' — '}
                  <span style={{ color: '#374151' }}>{iss.message}</span>
                  <span style={{ color: '#9ca3af', marginLeft: 6 }}>line {iss.line}:{iss.column}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={btnPrimary} onClick={onClose}>Close</button>
            </div>
          </>
        );

      case 'select': {
        const groups = groupByType(phase.analyses);
        return (
          <>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              <span style={{ color: '#16a34a', marginRight: 6 }}>✓</span>Model is valid
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>Select an analysis to run:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(groups).map(([type, list]) => (
                <div key={type}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {TYPE_LABELS[type] ?? type}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {list.map(a => (
                      <button
                        key={`${a.name}-${a.type}`}
                        onClick={() => handleSelectAnalysis(phase.vrbPath, phase.analyses, a)}
                        style={{
                          textAlign: 'left', padding: '8px 12px', borderRadius: 5,
                          border: '1px solid #e5e7eb', background: '#f9fafb',
                          cursor: 'pointer', fontSize: 13, color: '#111',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={onClose}>Cancel</button>
            </div>
          </>
        );
      }

      case 'running':
        return (
          <>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Running analysis</div>
            <div style={{ color: '#555', fontSize: 13 }}>
              <Spinner />Running {phase.analysisName}...
            </div>
          </>
        );

      case 'result': {
        const r = phase.result;
        return (
          <>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              <span style={{ color: r.allProducts ? '#16a34a' : '#b91c1c', marginRight: 6 }}>
                {r.allProducts ? '✓' : '✗'}
              </span>
              {r.analysis}
            </div>
            <div style={{
              background: r.allProducts ? '#f0fdf4' : '#fef2f2', borderRadius: 6,
              padding: '12px 16px', fontSize: 13, color: r.allProducts ? '#166534' : '#7f1d1d',
            }}>
              {r.message}
              <div style={{ marginTop: 6, color: '#9ca3af', fontSize: 12 }}>Time: {r.timeMs} ms</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                style={btnSecondary}
                onClick={() => setPhase({ kind: 'select', vrbPath: phase.vrbPath, analyses: phase.analyses })}
              >
                Run another
              </button>
              <button style={btnPrimary} onClick={onClose}>Close</button>
            </div>
          </>
        );
      }
    }
  }

  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={boxStyle}>
          {renderBody()}
        </div>
      </div>
    </>
  );
}
