import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LogStreamStatus } from '../../utils/api/titanApi';
import type { LogLine } from './useLogStream';

interface Props {
  lines: LogLine[];
  status: LogStreamStatus;
  onClear: () => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<LogStreamStatus, { text: string; color: string }> = {
  open: { text: 'Live', color: '#22c55e' },
  connecting: { text: 'Connecting...', color: '#f59e0b' },
  closed: { text: 'Disconnected', color: '#ef4444' },
};

const LEVEL_COLOR: Record<string, string> = {
  INFO: '#d4d4d4',
  WARN: '#fbbf24',
  ERROR: '#f87171',
};

const SOURCE_COLOR: Record<string, string> = {
  core: '#60a5fa',
  api: '#a78bfa',
  server: '#9ca3af',
};

const headerBtn: React.CSSProperties = {
  fontSize: 12, padding: '3px 10px', borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.25)', background: 'transparent',
  color: '#e5e5e5', cursor: 'pointer',
};

const MIN_HEIGHT = 120;
const TOOLBAR_HEIGHT = 48;
const HEIGHT_KEY = 'titan-log-panel-height';

// Between MIN_HEIGHT and the space below the app toolbar
function clampHeight(height: number): number {
  return Math.min(Math.max(height, MIN_HEIGHT), Math.max(MIN_HEIGHT, window.innerHeight - TOOLBAR_HEIGHT));
}

// Last height chosen by the user, or 40% of the window
function initialHeight(): number {
  try {
    const saved = Number(localStorage.getItem(HEIGHT_KEY));
    if (saved > 0) return clampHeight(saved);
  } catch {
    // storage unavailable: use the default
  }
  return clampHeight(Math.round(window.innerHeight * 0.4));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/**
 * Drawer docked at the bottom of the window with the backend logs of this tab, live.
 * It sits above the modals, so an analysis can be followed while it runs.
 * Its top edge can be dragged to resize it; the height is remembered in localStorage.
 */
export default function LogPanel({ lines, status, onClear, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const [showCore, setShowCore] = useState(true);
  const [height, setHeight] = useState(initialHeight);
  const [resizing, setResizing] = useState(false);
  const [handleHover, setHandleHover] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const visible = useMemo(() => {
    const text = filter.trim().toLowerCase();
    return lines.filter(l =>
      (showCore || l.source !== 'core') && (!text || l.message.toLowerCase().includes(text)));
  }, [lines, filter, showCore]);

  // Follow new lines unless the user scrolled up to read older ones
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [visible]);

  // Keep the panel inside the window when the window gets smaller
  useEffect(() => {
    const onResize = () => setHeight(h => clampHeight(h));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault(); // no text selection while dragging
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(true);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (resizing) setHeight(clampHeight(window.innerHeight - e.clientY));
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizing) return;
    setResizing(false);
    const final = clampHeight(window.innerHeight - e.clientY);
    setHeight(final);
    try {
      localStorage.setItem(HEIGHT_KEY, String(final));
    } catch {
      // storage unavailable: the height is just not remembered
    }
  }

  const st = STATUS_LABEL[status];

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, height, zIndex: 1100,
      background: '#111', color: '#d4d4d4', display: 'flex', flexDirection: 'column',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.3)', borderTop: '1px solid #333',
      userSelect: resizing ? 'none' : undefined,
    }}>
      {/* Resize handle on the top edge */}
      <div
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onMouseEnter={() => setHandleHover(true)}
        onMouseLeave={() => setHandleHover(false)}
        title="Drag to resize"
        style={{
          position: 'absolute', left: 0, right: 0, top: -4, height: 8, zIndex: 1,
          cursor: 'ns-resize', touchAction: 'none',
          background: resizing || handleHover ? 'rgba(96,165,250,0.6)' : 'transparent',
        }}
      />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px',
        borderBottom: '1px solid #2a2a2a', background: '#1a1a1a', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Logs</span>
        <span style={{ fontSize: 12, color: '#a3a3a3', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
          {st.text}
        </span>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter..."
          style={{
            fontSize: 12, padding: '3px 8px', borderRadius: 4, border: '1px solid #333',
            background: '#0a0a0a', color: '#e5e5e5', width: 180,
          }}
        />
        <label style={{ fontSize: 12, color: '#a3a3a3', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={showCore} onChange={e => setShowCore(e.target.checked)} />
          Core output
        </label>
        <span style={{ fontSize: 12, color: '#737373' }}>
          {visible.length === lines.length ? `${lines.length} lines` : `${visible.length} of ${lines.length} lines`}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={headerBtn} onClick={onClear}>Clear</button>
          <button style={headerBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={e => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        style={{
          flex: 1, overflowY: 'auto', padding: '6px 12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, lineHeight: 1.5,
        }}
      >
        {visible.length === 0 && (
          <div style={{ color: '#737373' }}>
            {lines.length === 0
              ? 'No logs yet. Upload, validate or analyze a model to see what the backend is doing.'
              : 'No lines match the filter.'}
          </div>
        )}
        {visible.map(l => (
          <div key={l.seq + l.timestamp}>
            {l.skipped > 0 && (
              <div style={{ color: '#737373', fontStyle: 'italic' }}>
                ... {l.skipped} lines skipped (the backend printed faster than they could be sent)
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: LEVEL_COLOR[l.level] ?? '#d4d4d4' }}>
              <span style={{ color: '#737373' }}>{formatTime(l.timestamp)}</span>{' '}
              <span style={{ color: SOURCE_COLOR[l.source] ?? '#9ca3af' }}>[{l.source}]</span>{' '}
              {l.level !== 'INFO' && <span style={{ fontWeight: 600 }}>{l.level} </span>}
              {l.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
