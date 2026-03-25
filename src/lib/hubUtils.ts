import type { HubRow } from '../types/hub';

/** API may send rate as 0–1 or 0–100; display whole-number percent. */
export function formatPctCell(val: unknown): string {
  if (val == null || val === '') return '—';
  let n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  if (n > 0 && n <= 1) n *= 100;
  return `${Math.round(n)}%`;
}

export function averageDisplay(averages: HubRow[], metric: string): string {
  const row = averages.find((r) => r.Metric === metric);
  const v = row?.Average;
  return v != null && v !== '' ? String(v) : '—';
}

export function numericFromAverage(averages: HubRow[], metric: string): number | null {
  const s = averageDisplay(averages, metric);
  if (s === '—') return null;
  const n = parseFloat(s.replace(/%/g, ''));
  return Number.isFinite(n) ? n : null;
}
