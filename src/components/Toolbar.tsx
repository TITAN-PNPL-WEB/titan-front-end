function Toolbar() {
  return (
    <div style={{
      zIndex: 20,
      height: 48,
      background: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      flexShrink: 0,
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
    </div>
  );
}

export default Toolbar;