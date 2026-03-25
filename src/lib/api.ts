import type { HubPayload } from '../types/hub';

const base = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';

export async function fetchHub(refresh = false): Promise<HubPayload> {
  const q = refresh ? '?refresh=1' : '';
  const res = await fetch(`${base}/api/hub${q}`);
  if (!res.ok) {
    throw new Error(`Hub API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<HubPayload>;
}

export function excelDownloadUrl(): string {
  return `${base}/api/hub/excel`;
}
