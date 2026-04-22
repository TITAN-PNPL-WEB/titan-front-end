import type { ToolType } from '../../types/petrinet';

interface PetriNetToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  isEmpty: boolean;
}

const tools: { type: ToolType; icon: string; label: string }[] = [
  { type: 'select', icon: '↖', label: 'Select' },
  { type: 'place', icon: '○', label: 'Place' },
  { type: 'transition', icon: '▬', label: 'Transition' },
];

export default function PetriNetToolbar({ activeTool, onToolChange, onUndo, onRedo, onDelete, isEmpty }: PetriNetToolbarProps) {
  return (
    <div className="fm-toolbar" style={{
      display: 'flex', gap: 6, padding: '6px 12px',
      borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0,
      alignItems: 'center',
    }}>
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onToolChange(tool.type)}
          disabled={tool.type === 'select' && isEmpty}
          style={{
            background: activeTool === tool.type ? '#1a1a1a' : '#fff',
            color: activeTool === tool.type ? '#fff' : '#333',
          }}
        >
          {tool.icon} {tool.label}
        </button>
      ))}

      <div style={{ width: 1, background: '#ddd', height: 20, margin: '0 4px' }} />

      <button onClick={onDelete} disabled={isEmpty}>✕ Delete</button>

      <div style={{ width: 1, background: '#ddd', height: 20, margin: '0 4px' }} />

      <button onClick={onUndo}>Undo</button>
      <button onClick={onRedo}>Redo</button>
    </div>
  );
}