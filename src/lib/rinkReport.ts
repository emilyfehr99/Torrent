import type { HubRow, RinkReport, RinkReportGameRow } from '../types/hub';

export function emptyRinkReport(): RinkReport {
  const z = { dz: 0, nz: 0, oz: 0 };
  const dist = { '0-10': 0, '10-20': 0, '20-30': 0, '30-40': 0, '40+': 0 };
  const lane = { left: 0, center: 0, right: 0, unknown: 0 };
  return {
    shots_for: { total: 0, by_zone_x: { ...z }, by_distance: { ...dist } },
    shots_against: { total: 0, by_zone_x: { ...z }, by_distance: { ...dist } },
    goals_for: { total: 0, by_zone_x: { ...z } },
    goals_against: { total: 0, by_zone_x: { ...z } },
    entries: {
      total: 0,
      carry_ins: 0,
      dump_ins: 0,
      by_lane_carry: { ...lane },
      by_lane_dump: { ...lane },
    },
  };
}

function mergeTwo(a: RinkReport, b: RinkReport): RinkReport {
  const add = (x: number, y: number) => x + y;
  const mz = (p: Record<string, number>, q: Record<string, number>) => {
    const keys = new Set([...Object.keys(p), ...Object.keys(q)]);
    const o: Record<string, number> = {};
    for (const k of keys) o[k] = add(p[k] ?? 0, q[k] ?? 0);
    return o;
  };
  return {
    shots_for: {
      total: add(a.shots_for.total, b.shots_for.total),
      by_zone_x: mz(a.shots_for.by_zone_x, b.shots_for.by_zone_x),
      by_distance: mz(a.shots_for.by_distance, b.shots_for.by_distance),
    },
    shots_against: {
      total: add(a.shots_against.total, b.shots_against.total),
      by_zone_x: mz(a.shots_against.by_zone_x, b.shots_against.by_zone_x),
      by_distance: mz(a.shots_against.by_distance, b.shots_against.by_distance),
    },
    goals_for: {
      total: add(a.goals_for.total, b.goals_for.total),
      by_zone_x: mz(a.goals_for.by_zone_x, b.goals_for.by_zone_x),
    },
    goals_against: {
      total: add(a.goals_against.total, b.goals_against.total),
      by_zone_x: mz(a.goals_against.by_zone_x, b.goals_against.by_zone_x),
    },
    entries: {
      total: add(a.entries.total, b.entries.total),
      carry_ins: add(a.entries.carry_ins, b.entries.carry_ins),
      dump_ins: add(a.entries.dump_ins, b.entries.dump_ins),
      by_lane_carry: mz(a.entries.by_lane_carry, b.entries.by_lane_carry),
      by_lane_dump: mz(a.entries.by_lane_dump, b.entries.by_lane_dump),
    },
  };
}

export function mergeRinkReports(parts: RinkReport[]): RinkReport {
  if (parts.length === 0) return emptyRinkReport();
  return parts.reduce((acc, p) => mergeTwo(acc, p));
}

export function filterGamesByOpponent(
  games: RinkReportGameRow[],
  opponentSub: string,
): RinkReportGameRow[] {
  const q = opponentSub.trim().toLowerCase();
  if (!q) return games;
  return games.filter((g) => String(g.opponent ?? '').toLowerCase().includes(q));
}

/** Strip game metadata and merge rink metrics only. */
export function gameRowsToRinkParts(rows: RinkReportGameRow[]): RinkReport[] {
  return rows.map((row) => {
    const { game_id: _g, opponent: _o, date: _d, ...rink } = row;
    return rink as RinkReport;
  });
}

export function rinkForScope(
  season: RinkReport | undefined,
  byGame: RinkReportGameRow[] | undefined,
  opts: { opponent?: string },
): RinkReport {
  const base = season ?? emptyRinkReport();
  const opp = opts.opponent?.trim();
  if (!opp || !byGame?.length) return base;
  const filtered = filterGamesByOpponent(byGame, opp);
  if (filtered.length === 0) return base;
  return mergeRinkReports(gameRowsToRinkParts(filtered));
}

function pct(n: number, d: number): string {
  if (d <= 0) return '—';
  return `${((100 * n) / d).toFixed(1)}%`;
}

function zoneLine(label: string, z: Record<string, number>): string {
  const dz = z.dz ?? 0;
  const nz = z.nz ?? 0;
  const oz = z.oz ?? 0;
  const t = Math.max(1, dz + nz + oz);
  return `  ${label}: DZ ${dz} (${pct(dz, t)}) / NZ ${nz} (${pct(nz, t)}) / OZ ${oz} (${pct(oz, t)})`;
}

function distLine(label: string, dmap: Record<string, number>, total: number): string {
  const order = ['0-10', '10-20', '20-30', '30-40', '40+'] as const;
  const t = Math.max(1, total);
  const parts = order.map((k) => `${k}: ${pct(dmap[k] ?? 0, t)}`);
  return `  ${label} (dist %): ${parts.join(' · ')}`;
}

function laneLine(label: string, l: Record<string, number>): string {
  const left = l.left ?? 0;
  const center = l.center ?? 0;
  const right = l.right ?? 0;
  const t = Math.max(1, left + center + right);
  return `  ${label}: L ${pct(left, t)} / C ${pct(center, t)} / R ${pct(right, t)}`;
}

const RINK_HEADER = [
  'Zone key (length / pos_x): DZ = defensive zone (x ≤ ~23), NZ = neutral, OZ = offensive (x > ~38).',
  'Distance buckets: for team shots, distance from far goal line (x=100); for shots against, distance toward our net (x=0). Units are tracker length (0–100), not feet.',
].join('\n');

export function formatShotsGoalsBlock(team: string, rink: RinkReport, scopeNote: string): string {
  const sf = rink.shots_for;
  const sa = rink.shots_against;
  const gf = rink.goals_for;
  const ga = rink.goals_against;
  const lines: string[] = [];
  lines.push('SHOTS & GOALS (tracked coordinates)');
  lines.push(`Team: ${team}`);
  lines.push(scopeNote);
  lines.push('');
  lines.push(RINK_HEADER);
  lines.push('');
  lines.push(`Shots for — total ${sf.total}`);
  lines.push(zoneLine('By zone', sf.by_zone_x));
  lines.push(distLine('By distance', sf.by_distance, sf.total));
  lines.push('');
  lines.push(`Shots against — total ${sa.total}`);
  lines.push(zoneLine('By zone', sa.by_zone_x));
  lines.push(distLine('By distance', sa.by_distance, sa.total));
  lines.push('');
  lines.push(`Goals for — total ${gf.total}`);
  lines.push(zoneLine('By zone', gf.by_zone_x));
  lines.push('');
  lines.push(`Goals against — total ${ga.total}`);
  lines.push(zoneLine('By zone', ga.by_zone_x));
  return lines.join('\n');
}

export function formatEntriesBlock(team: string, rink: RinkReport, scopeNote: string): string {
  const en = rink.entries;
  const lines: string[] = [];
  lines.push('ZONE ENTRIES BY LANE (pos_y width at entry event)');
  lines.push(`Team: ${team}`);
  lines.push(scopeNote);
  lines.push('');
  lines.push(
    `Total ${en.total} (carry ${en.carry_ins}, dump ${en.dump_ins}${en.total ? `; carry-in share ${pct(en.carry_ins, en.total)}` : ''})`,
  );
  lines.push(laneLine('Carry-in by lane', en.by_lane_carry));
  lines.push(laneLine('Dump-in by lane', en.by_lane_dump));
  return lines.join('\n');
}

export function formatRinkReportBlock(team: string, rink: RinkReport, scopeNote: string): string {
  return [formatShotsGoalsBlock(team, rink, scopeNote), '', formatEntriesBlock(team, rink, scopeNote)].join('\n');
}

export function findPlayerSeasonRow(rows: HubRow[] | undefined, name: string): HubRow | null {
  const q = name.trim().toLowerCase();
  if (!q || !rows?.length) return null;
  const exact = rows.find((r) => String(r.Player ?? '').toLowerCase() === q);
  if (exact) return exact;
  return rows.find((r) => String(r.Player ?? '').toLowerCase().includes(q)) ?? null;
}

export function formatPlayerSnapshot(row: HubRow | null, name: string): string {
  if (!row) return `Player "${name}": no season row in hub (check roster spelling).`;
  const keys = Object.keys(row).filter((k) => k !== 'Player' && k !== 'Pos');
  const pick = ['GameScore', 'GP', 'Shots', 'Chances', 'Zone Entries', 'Carry-ins', 'Carry-in %', 'Failed Entries', 'Exits w Poss %', 'Shots off Rush', 'Shots off FC Cycle'];
  const lines: string[] = [`Player season snapshot: ${name}`];
  for (const k of pick) {
    if (k in row && row[k] != null && row[k] !== '') lines.push(`  ${k}: ${row[k]}`);
  }
  return lines.join('\n');
}

export function formatAveragesSnapshot(averages: HubRow[] | undefined): string {
  if (!averages?.length) return '';
  const lines: string[] = ['Team per-game metric averages (from hub game files):'];
  for (const r of averages.slice(0, 24)) {
    const m = r.Metric ?? r.metric;
    const a = r.Average ?? r.average;
    if (m != null) lines.push(`  ${m}: ${a ?? '—'}`);
  }
  return lines.join('\n');
}
