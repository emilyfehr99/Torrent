import type { HubRow } from '../types/hub';

const SKIP = new Set(['Player', 'Pos', 'player', 'Team']);

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Shared numeric keys across rows (min coverage 50%). */
function numericKeys(rows: HubRow[]): string[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).filter((k) => !SKIP.has(k));
  const ok: string[] = [];
  const minCov = Math.max(3, Math.floor(rows.length * 0.5));
  for (const k of keys) {
    let c = 0;
    for (const r of rows) {
      if (num(r[k]) != null) c++;
    }
    if (c >= minCov) ok.push(k);
  }
  return ok.slice(0, 24);
}

function normalize(rows: HubRow[], keys: string[]): Map<string, number[]> {
  const stats: Record<string, { min: number; max: number }> = {};
  for (const k of keys) {
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      const v = num(r[k]);
      if (v == null) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    if (!Number.isFinite(min) || min === max) stats[k] = { min: 0, max: 1 };
    else stats[k] = { min, max };
  }
  const vecs = new Map<string, number[]>();
  for (const r of rows) {
    const name = String(r.Player ?? r.player ?? '').trim();
    if (!name) continue;
    const vec = keys.map((k) => {
      const v = num(r[k]);
      if (v == null) return 0;
      const { min, max } = stats[k];
      if (max === min) return 0;
      return (v - min) / (max - min);
    });
    vecs.set(name, vec);
  }
  return vecs;
}

function dist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function findSimilarSkaters(rows: HubRow[], playerName: string, topN = 5): { player: string; distance: number }[] {
  const keys = numericKeys(rows);
  if (keys.length < 3) return [];
  const vecs = normalize(rows, keys);
  const target = vecs.get(playerName.trim());
  if (!target) return [];
  const out: { player: string; distance: number }[] = [];
  for (const [name, vec] of vecs) {
    if (name.toLowerCase() === playerName.trim().toLowerCase()) continue;
    out.push({ player: name, distance: dist(target, vec) });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out.slice(0, topN);
}
