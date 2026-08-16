const API_BASE = 'https://titan-api-pyts.onrender.com/pnpl';

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
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function validateModel(
  vrbPath: string,
): Promise<{ valid: boolean; issues: ValidationIssue[] }> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vrbPath }),
  });
  if (!res.ok) throw new Error(`Validate failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getAnalyses(): Promise<{ analyses: AnalysisInfo[] }> {
  const res = await fetch(`${API_BASE}/analyses`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vrbPath, name, type }),
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status} ${res.statusText}`);
  return res.json();
}
