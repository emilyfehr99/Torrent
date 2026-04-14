import type { HubRow } from '../types/hub';

/** API may send rate as 0–1 or 0–100; display formatted percent. */
export function formatPctCell(val: unknown, fractionalDigits = 1): string {
  if (val == null || val === '') return '—';
  let n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  if (n > 0 && n <= 1) n *= 100;
  return `${n.toFixed(fractionalDigits)}%`;
}

export function averageDisplay(averages: HubRow[], metric: string): string {
  const row = averages.find((r) => r.Metric === metric);
  const v = row?.Average;
  if (v == null || v === '') return '—';
  if (metric.includes('%')) return formatPctCell(v, 1);
  const n = Number(String(v).replace(/%/g, ''));
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(1);
}

export function numericFromAverage(averages: HubRow[], metric: string): number | null {
  const s = averageDisplay(averages, metric);
  if (s === '—') return null;
  const n = parseFloat(s.replace(/%/g, ''));
  return Number.isFinite(n) ? n : null;
}
