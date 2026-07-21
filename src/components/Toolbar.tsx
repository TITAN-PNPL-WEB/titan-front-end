import { useRef } from 'react';

interface Props {
  onExport?: () => void;
  exportDisabled?: boolean;
  onImport?: (files: File[]) => void;
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 12px',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
};

function Toolbar({ onExport, exportDisabled, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      zIndex: 20,
      height: 48,
      background: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      flexShrink: 0,
      gap: 12,
    }}>
      <span style={{
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.9,
      }}>
        TITAN
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {onImport && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".petrinets,.xml,.vrb"
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) onImport(files);
                e.target.value = '';
              }}
            />
            <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>
              Import Files
            </button>
          </>
        )}
        {onExport && (
          <button
            onClick={onExport}
            disabled={exportDisabled}
            style={{ ...btnStyle, opacity: exportDisabled ? 0.4 : 1, cursor: exportDisabled ? 'not-allowed' : 'pointer' }}
          >
            Export Files
          </button>
        )}
      </div>
    </div>
  );
}

export default Toolbar;