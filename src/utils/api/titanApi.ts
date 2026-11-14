// Set by VITE_API_BASE: .env.production points the deployed build to Render; npm run dev uses the local API
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/pnpl';


export interface ValidationIssue {
  severity: string;
  message: string;
  line: number;
  column: number;
}

export interface AnalysisInfo {
  name: string;
  type: 'pnpl' | 'products';
}

export interface AnalysisResult {
  analysis: string;
  allProducts: boolean;
  timeMs: number;
  message: string;
}

/** One log line streamed by GET /logs/{sessionId}. */
export interface LogEvent {
  seq: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  source: 'core' | 'api' | 'server';
  message: string;
}

export type LogStreamStatus = 'connecting' | 'open' | 'closed';

const LOG_SESSION_KEY = 'titan-log-session';

// One id per browser tab, kept across reloads. Every request sends it, and the API streams
// back only the logs of the requests that carry it.
export const LOG_SESSION_ID: string = (() => {
  try {
    const saved = sessionStorage.getItem(LOG_SESSION_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    sessionStorage.setItem(LOG_SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
})();

const SESSION_HEADER = { 'X-Log-Session': LOG_SESSION_ID };

/**
 * Opens the live log stream of this tab. The browser reconnects by itself and only receives the
 * lines it missed. Returns a function that closes the stream.
 */
export function openLogStream(
  onEvent: (event: LogEvent) => void,
  onStatus: (status: LogStreamStatus) => void,
): () => void {
  const source = new EventSource(`${API_BASE}/logs/${LOG_SESSION_ID}`);
  onStatus('connecting');
  source.onopen = () => onStatus('open');
  source.onerror = () => onStatus(source.readyState === EventSource.CLOSED ? 'closed' : 'connecting');
  source.addEventListener('log', e => onEvent(JSON.parse((e as MessageEvent<string>).data)));
  return () => source.close();
}

export async function uploadFiles(
  vrb: Blob,
  vrbFilename: string,
  petrinets: Blob,
  petrinetsFilename: string,
  featureModel: Blob,
  featureModelFilename: string,
): Promise<{ vrbPath: string; message: string }> {
  const form = new FormData();
  form.append('vrb', vrb, vrbFilename);
  form.append('petrinets', petrinets, petrinetsFilename);
  form.append('featureModel', featureModel, featureModelFilename);
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers: SESSION_HEADER, body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function validateModel(
  vrbPath: string,
): Promise<{ valid: boolean; issues: ValidationIssue[] }> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...SESSION_HEADER },
    body: JSON.stringify({ vrbPath }),
  });
  if (!res.ok) throw new Error(`Validate failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getAnalyses(): Promise<{ analyses: AnalysisInfo[] }> {
  const res = await fetch(`${API_BASE}/analyses`, { headers: SESSION_HEADER });
  if (!res.ok) throw new Error(`Get analyses failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function runAnalysis(
  vrbPath: string,
  name: string,
  type: string,
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...SESSION_HEADER },
    body: JSON.stringify({ vrbPath, name, type }),
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status} ${res.statusText}`);
  return res.json();
}
