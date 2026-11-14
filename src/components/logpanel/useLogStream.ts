import { useCallback, useEffect, useRef, useState } from 'react';
import { openLogStream, type LogEvent, type LogStreamStatus } from '../../utils/api/titanApi';

/** A received line. skipped > 0 when the server dropped that many lines just before it. */
export interface LogLine extends LogEvent {
  skipped: number;
}

const MAX_LINES = 5000;
const FLUSH_MS = 150;

/**
 * Keeps the stream of this tab open while the app is mounted, so lines are collected even
 * with the panel closed. Incoming lines are batched to re-render at most every FLUSH_MS:
 * a products analysis can print thousands of lines per second.
 * errorCount is the number of ERROR lines received since the app started (Clear does not reset it).
 */
export function useLogStream() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<LogStreamStatus>('connecting');
  const [errorCount, setErrorCount] = useState(0);
  const pending = useRef<LogLine[]>([]);
  const lastSeq = useRef(0);

  useEffect(() => {
    const close = openLogStream(event => {
      // A seq lower than the last one means the server restarted and the session started over
      const skipped = event.seq > lastSeq.current + 1 && lastSeq.current > 0 ? event.seq - lastSeq.current - 1 : 0;
      lastSeq.current = event.seq;
      pending.current.push({ ...event, skipped });
    }, setStatus);

    const timer = setInterval(() => {
      if (pending.current.length === 0) return;
      const batch = pending.current;
      pending.current = [];
      setLines(prev => {
        const next = prev.concat(batch);
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
      const errors = batch.filter(l => l.level === 'ERROR').length;
      if (errors > 0) setErrorCount(n => n + errors);
    }, FLUSH_MS);

    return () => {
      close();
      clearInterval(timer);
    };
  }, []);

  const clear = useCallback(() => {
    pending.current = [];
    setLines([]);
  }, []);

  return { lines, status, errorCount, clear };
}
