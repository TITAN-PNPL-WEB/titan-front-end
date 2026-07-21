interface Props {
  onExport?: () => void;
}

function Toolbar({ onExport }: Props) {
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
      {onExport && (
        <button
          onClick={onExport}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            padding: '4px 12px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Export Files
        </button>
      )}
    </div>
  );
}

export default Toolbar;