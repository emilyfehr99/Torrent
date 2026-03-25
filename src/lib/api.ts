import type { HubPayload } from '../types/hub';

function normalizeHubApiBase(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

/** Public API origin in production builds, e.g. https://your-api.onrender.com — empty = same origin (local Vite proxy). */
export const HUB_API_BASE = normalizeHubApiBase(import.meta.env.VITE_API_URL);

function hubFetchUrl(apiPath: string): string {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (!HUB_API_BASE) return path;
  return `${HUB_API_BASE}${path}`;
}

async function readErrorSnippet(res: Response): Promise<string> {
  const t = await res.text();
  if (/<!DOCTYPE/i.test(t) || /<html[\s>]/i.test(t)) {
    return 'Received HTML instead of JSON (no hub API at this URL). Set VITE_API_URL to your deployed FastAPI origin.';
  }
  const oneLine = t.replace(/\s+/g, ' ').trim();
  return oneLine.length > 280 ? `${oneLine.slice(0, 280)}…` : oneLine;
}

export async function fetchHub(refresh = false): Promise<HubPayload> {
  const q = refresh ? '?refresh=1' : '';
  const res = await fetch(hubFetchUrl(`/api/hub${q}`));
  if (!res.ok) {
    const detail = await readErrorSnippet(res);
    throw new Error(`Hub API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<HubPayload>;
}

export function excelDownloadUrl(): string {
  return hubFetchUrl('/api/hub/excel');
}

/** Short hint when the site is on GitHub Pages but no API base was baked into the build. */
export function githubPagesApiHint(): string | null {
  if (HUB_API_BASE) return null;
  if (typeof window === 'undefined') return null;
  if (!window.location.hostname.endsWith('github.io')) return null;
  return 'Add a GitHub Actions repository secret VITE_API_URL with your public API URL (no trailing slash), then redeploy. See DEPLOY_API.md in this repo.';
}
