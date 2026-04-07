import type { ToolType } from '../types/petrinet';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
}

const tools: { type: ToolType; icon: string; label: string }[] = [
  { type: 'select', icon: '↖', label: 'Select' },
  { type: 'place', icon: '○', label: 'Place' },
  { type: 'transition', icon: '▬', label: 'Transition' },
];

function Toolbar({ activeTool, onToolChange, onUndo, onRedo, onDelete }: ToolbarProps) {
  return (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: 48,
    background: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
  }}>

    {/* Left — title */}
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

    {/* Center — tools */}
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onToolChange(tool.type)}
          title={tool.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 500,
            background: activeTool === tool.type ? '#ffffff' : 'transparent',
            color: activeTool === tool.type ? '#1a1a1a' : '#999999',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: 14 }}>{tool.icon}</span>
          <span className="toolbar-label">{tool.label}</span>
        </button>
      ))}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

      <button
        onClick={onDelete}
        title="Delete selected"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          fontSize: 12,
          fontWeight: 500,
          background: 'transparent',
          color: '#999999',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14 }}>✕</span>
        <span className="toolbar-label">Delete</span>
      </button>
    </div>

    {/* Right — undo/redo */}
    <div style={{ display: 'flex', gap: 2 }}>
      {[{ label: '↩\uFE0E', action: onUndo, title: 'Undo (Ctrl+Z)' },
        { label: '↪\uFE0E', action: onRedo, title: 'Redo (Ctrl+Shift+Z)' }].map((btn) => (
        <button
          key={btn.title}
          onClick={btn.action}
          title={btn.title}
          style={{
            padding: '5px 10px',
            fontSize: 16,
            background: 'transparent',
            color: '#999999',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>

  </div>
);
}

export default Toolbar;