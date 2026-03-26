import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, UserCircle, RefreshCw, GitCompare, X } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useHubData } from '../context/HubDataContext';
import { useHubSearch } from '../context/SearchContext';
import type { HubRow, VizShot, VizShotGame } from '../types/hub';
import { formatPctCell } from '../lib/hubUtils';
import { SortableTable, type SortableRow } from './SortableTable';
import { ShotHeatmap } from './ShotHeatmap';
import { findSimilarSkaters } from '../lib/playerSimilarity';
import {
  SOURCE_LEAGUES,
  projectPwhlPoints,
  projectPwhleEliteToPwhl,
  type SourceLeagueId,
} from '../lib/pwhlProspectProjection';

function fmtCell(k: string, v: unknown): string {
  if (v == null || v === '') return '—';
  if (k.includes('%')) return formatPctCell(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
  return String(v);
}

/** Hub columns first (subset). */
const HUB_SORT_COLS = [
  'Player',
  'Pos',
  'Offense',
  'Defense',
  'GP',
  'GameScore',
  'xG',
  'Chances',
  'Shots',
  'Zone Entries',
  'Carry-in %',
  'Exits w Poss %',
  'Shots off Rush',
  'Shots Against',
  'xG/60 est',
  'Team shot share %',
  'OZ shift %',
];

function transitionCell(row: HubRow, key: string): string {
  const v = row[key];
  if (v == null || v === '') return '—';
  if (key.includes('%')) return formatPctCell(v);
  return fmtCell(key, v);
}

/** Retrievals w Exit ÷ DZ Retrievals — matches hub logic (clean breakout after DZ recovery). */
function successfulRetrievalPct(row: HubRow): string {
  const dz = Number(row['DZ Retrievals']);
  const rw = Number(row['Retrievals w Exit']);
  if (!Number.isFinite(dz) || dz <= 0) return '—';
  if (!Number.isFinite(rw)) return '—';
  return `${((100 * rw) / dz).toFixed(1)}%`;
}

function entriesLeadingToShotsTotal(row: HubRow): string {
  const c = Number(row['Carries w/ Chances']);
  const d = Number(row['Dump-in Chances']);
  const hasC = Number.isFinite(c);
  const hasD = Number.isFinite(d);
  if (!hasC && !hasD) return '—';
  return String((hasC ? c : 0) + (hasD ? d : 0));
}

function TransitionSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-wider text-torrent-teal mt-5 mb-2 border-b border-pwhl-border pb-1 first:mt-0">
      {children}
    </h4>
  );
}

function hubMetric(row: HubRow | null, key: string): string {
  if (!row) return '—';
  const v = row[key];
  if (v == null || v === '') return '—';
  if (typeof v === 'number') {
    if (key.includes('%')) return formatPctCell(v);
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3)));
  }
  return String(v);
}

/** Avg hub GameScore of most common line / pairing teammates (QoT-style). */
function estimateQotTeammateGs(
  playerName: string,
  lines: HubRow[] | undefined,
  pairings: HubRow[] | undefined,
  gsByPlayer: Map<string, number>,
): string {
  const needle = playerName.trim().toLowerCase();
  const tryUnits = (units: HubRow[] | undefined): string | null => {
    if (!units?.length) return null;
    for (const row of units) {
      const u = String(row.unit ?? '');
      const parts = u.split('·').map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      if (!parts.some((p) => p.toLowerCase() === needle)) continue;
      const mates = parts.filter((p) => p.toLowerCase() !== needle);
      const vals: number[] = [];
      for (const m of mates) {
        const g = gsByPlayer.get(m);
        if (Number.isFinite(g)) vals.push(g as number);
      }
      if (vals.length === 0) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg.toFixed(2);
    }
    return null;
  };
  return tryUnits(lines) ?? tryUnits(pairings) ?? '—';
}

function filterShotsByPlayerName(shots: VizShot[] | undefined, playerNorm: string): VizShot[] {
  if (!shots?.length) return [];
  return shots.filter((s) => String(s.player ?? '').trim().toLowerCase() === playerNorm);
}

function calculatePlayerScores(row: HubRow): { offense: number; defense: number } {
  // Simple weighted score (0-100) based on key microstats.
  // These aren't perfect benchmarks but provide a relative "Torrent Index".
  const gp = Math.max(1, Number(row['GP'] ?? 1));
  const n = (k: string) => Number(row[k] ?? 0) / gp;

  // Offense: Entries, Chances, Assists, Recoveries
  const offRaw =
    n('Forecheck Recoveries') * 1.5 +
    n('Zone Entries') * 1.0 +
    n('Carries w/ Chances') * 2.0 +
    n('Primary Shot Assists') * 2.5 +
    n('Chance Assists') * 2.5;
  const offScore = Math.min(100, Math.round(offRaw * 15)); // Scaling factor

  // Defense: Retrievals, Exits, Denials, (minus) Botched/Failed
  const defRaw =
    n('DZ Retrievals') * 1.5 +
    n('Retrievals w Exit') * 2.0 +
    n('Zone Exits') * 1.0 +
    n('Exits w Possession') * 1.5 -
    n('Botched Retrievals') * 2.0 -
    n('Failed Exits') * 1.5;
  const defScore = Math.max(0, Math.min(100, Math.round(defRaw * 18 + 50))); // Offset and scale

  return { offense: offScore, defense: defScore };
}

function filterShotGamesForPlayer(games: VizShotGame[] | undefined, playerNorm: string, isGoalie: boolean): VizShotGame[] {
  if (!games?.length) return [];
  return games
    .map((g) => ({
      ...g,
      shots_for: filterShotsByPlayerName(g.shots_for, playerNorm),
      // For goalies, "Against" are all shots by the opponent in that game.
      // For skaters, "Against" are shots where they were on the ice (on_ice field).
      shots_against: isGoalie
        ? (g.shots_against ?? [])
        : (g.shots_against ?? []).filter((s) => {
            const onIce = (s as any).on_ice;
            if (!Array.isArray(onIce)) return false;
            return onIce.some((p: string) => String(p).trim().toLowerCase() === playerNorm);
          }),
    }))
    .filter((g) => (g.shots_for?.length ?? 0) + (g.shots_against?.length ?? 0) > 0);
}

function posBucket(row: HubRow, rosterPos: Map<string, string>): 'F' | 'D' | 'G' {
  const name = String(row.Player ?? '');
  const p = String(row.Pos ?? rosterPos.get(name) ?? '')
    .toUpperCase()
    .trim();
  if (p === 'G' || p.includes('GOAL') || p === 'GK') return 'G';
  if (p === 'D' || p.includes('DEF') || p.includes('LD') || p.includes('RD')) return 'D';
  return 'F';
}

function downloadSeasonCsv(rows: HubRow[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (x: unknown) => {
    const s = x == null ? '' : String(x);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function PlayerDatabase() {
  const { data, loading, error, refresh } = useHubData();
  const { query: q, setQuery: setQ } = useHubSearch();
  const season = data?.player_season ?? [];
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [posFilter, setPosFilter] = useState<'all' | 'F' | 'D' | 'G'>('all');
  const [seasonPick, setSeasonPick] = useState<'2526' | '2425' | '2324'>('2526');
  const [cardTab, setCardTab] = useState<
    'overview' | 'transition' | 'pwhle' | 'pwhlproj' | 'heat' | 'flow' | 'similar'
  >('overview');
  const [similarOpen, setSimilarOpen] = useState(false);
  const [projLeagueId, setProjLeagueId] = useState<SourceLeagueId>('ncaa_d1');
  const [projPoints, setProjPoints] = useState('');
  const [projGp, setProjGp] = useState('');
  const [projCustomFactor, setProjCustomFactor] = useState('0.72');
  const [projPwhlGp, setProjPwhlGp] = useState('30');
  const [pwhlePos, setPwhlePos] = useState<'F' | 'D'>('F');
  const [pwhlePpg, setPwhlePpg] = useState('');

  const rosterPos = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of data?.roster ?? []) {
      const p = String((r.player ?? r.Player ?? '') as string);
      if (p) m.set(p, String((r.Pos ?? r.position ?? '—') as string));
    }
    return m;
  }, [data?.roster]);

  const activeSeason = seasonPick === '2526' ? season : [];

  const filtered = useMemo(() => {
    let rows = activeSeason;
    const qq = q.trim().toLowerCase();
    if (qq) rows = rows.filter((r) => String(r.Player ?? '').toLowerCase().includes(qq));
    if (posFilter !== 'all') {
      rows = rows.filter((r) => posBucket(r, rosterPos) === posFilter);
    }
    return rows;
  }, [activeSeason, q, posFilter, rosterPos]);

  useEffect(() => {
    if (!filtered.length) return;
    const names = new Set(filtered.map((r) => String(r.Player ?? '')));
    if (selectedName && names.has(selectedName)) return;
    setSelectedName(String(filtered[0].Player ?? ''));
  }, [filtered, selectedName]);

  const selected = useMemo(
    () => filtered.find((r) => String(r.Player ?? '') === selectedName) ?? null,
    [filtered, selectedName],
  );

  useEffect(() => {
    if (selected?.GP != null && selected.GP !== '') {
      setProjGp(String(selected.GP));
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const b = posBucket(selected, rosterPos);
    if (b === 'D') setPwhlePos('D');
    else if (b === 'F') setPwhlePos('F');
  }, [selected, selectedName, rosterPos]);

  const sortableCols = useMemo(() => {
    if (!activeSeason[0]) return [] as { key: string; label: string }[];
    const keys = new Set(Object.keys(activeSeason[0]));
    const hub = HUB_SORT_COLS.filter((k) => keys.has(k));
    return [...hub].map((k) => ({ key: k, label: k }));
  }, [activeSeason]);

  const sortableRows: SortableRow[] = useMemo(() => {
    return filtered.map((row) => {
      const { offense, defense } = calculatePlayerScores(row);
      const o: SortableRow = { ...row, Offense: offense, Defense: defense };
      return o;
    });
  }, [filtered, sortableCols]);

  const radarData = useMemo(() => {
    if (!selected || !activeSeason.length) return [];
    const keys = ['Chances', 'Shots', 'GameScore', 'Carry-in %', 'Exits w Poss %'];
    const maxv: Record<string, number> = {};
    const samePos = activeSeason.filter((r) => posBucket(r, rosterPos) === posBucket(selected, rosterPos));
    const baseline = samePos.length >= 3 ? samePos : activeSeason;
    keys.forEach((k) => {
      let mx = 0;
      for (const r of baseline) {
        const n = Number(r[k]);
        if (Number.isFinite(n)) mx = Math.max(mx, Math.abs(n));
      }
      maxv[k] = mx || 1;
    });
    return keys.map((k) => {
      const v = Number(selected[k]);
      const full = 100;
      const scaled = Number.isFinite(v) ? Math.min(full, (v / maxv[k]) * full) : 0;
      const label =
        k === 'Chances'
          ? 'Chances'
          : k === 'Shots'
            ? 'Shots'
            : k === 'GameScore'
              ? 'Trk GS'
              : k === 'Carry-in %'
                ? 'Carry-in%'
                : 'Exit poss%';
      return { subject: label, A: scaled, fullMark: full };
    });
  }, [selected, activeSeason, rosterPos]);

  const similar = useMemo(() => {
    if (!selected || !activeSeason.length) return [];
    return findSimilarSkaters(activeSeason as HubRow[], String(selected.Player ?? ''), 5);
  }, [selected, activeSeason]);

  const projLeagueIdResolved: SourceLeagueId =
    projLeagueId === 'pwhle_elite' ? 'ncaa_d1' : projLeagueId;
  const projLeague =
    SOURCE_LEAGUES.find((l) => l.id === projLeagueIdResolved) ??
    SOURCE_LEAGUES.find((l) => l.id === 'ncaa_d1') ??
    SOURCE_LEAGUES[0];
  const projFactor =
    projLeagueIdResolved === 'custom' ? Math.max(0, Number(projCustomFactor) || 0) : projLeague.ppgToPwhlFactor;
  const projResult = useMemo(() => {
    const pts = Number(projPoints);
    const gp = Number(projGp);
    const schedule = Number(projPwhlGp) || 30;
    return projectPwhlPoints({
      points: pts,
      gp,
      ppgToPwhlFactor: projFactor,
      pwhlScheduleGp: schedule,
    });
  }, [projPoints, projGp, projFactor, projPwhlGp]);

  const pwhleResult = useMemo(() => {
    const schedule = Number(projPwhlGp) || 30;
    return projectPwhleEliteToPwhl({
      ppg: Number(pwhlePpg),
      position: pwhlePos,
      pwhlScheduleGp: schedule,
    });
  }, [pwhlePpg, pwhlePos, projPwhlGp]);

  const gameScoreByPlayer = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activeSeason) {
      const n = String(r.Player ?? '').trim();
      if (!n) continue;
      const gs = Number(r.GameScore);
      if (Number.isFinite(gs)) m.set(n, gs);
    }
    return m;
  }, [activeSeason]);

  const qotDisplay = useMemo(() => {
    if (!selected) return '—';
    return estimateQotTeammateGs(
      String(selected.Player ?? ''),
      data?.line_combos_season as HubRow[] | undefined,
      data?.pairings_season as HubRow[] | undefined,
      gameScoreByPlayer,
    );
  }, [selected, data?.line_combos_season, data?.pairings_season, gameScoreByPlayer]);

  const playerHeatGames = useMemo(() => {
    if (!selected) return [] as VizShotGame[];
    const pn = String(selected.Player ?? '')
      .trim()
      .toLowerCase();
    const isG = posBucket(selected, rosterPos) === 'G';
    const fromGames = filterShotGamesForPlayer(data?.viz_shot_games, pn, isG);
    if (fromGames.length > 0) return fromGames;
    return [];
  }, [selected, data?.viz_shot_games, rosterPos]);

  const playerHeatFallback = useMemo(() => {
    if (!selected || playerHeatGames.length > 0) return undefined;
    const pn = String(selected.Player ?? '')
      .trim()
      .toLowerCase();
    const legacy = filterShotsByPlayerName(data?.viz_shots, pn);
    return legacy.length ? legacy : undefined;
  }, [selected, data?.viz_shots, playerHeatGames.length]);

  const otherLeagueOptions = useMemo(() => SOURCE_LEAGUES.filter((l) => l.id !== 'pwhle_elite'), []);

  if (error) {
    return <p className="text-sm text-pwhl-accent">{error}</p>;
  }

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      <nav className="text-xs font-mono text-pwhl-muted mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-pwhl-navy font-semibold">Home</span>
        <span>/</span>
        <span className="text-torrent-teal font-semibold">Player database</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Player database</h2>
          <p className="text-pwhl-muted text-sm mt-1 max-w-2xl">
            Season-to-date microstats tracking and player comparisons.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-pwhl-surface border border-pwhl-border rounded-lg text-sm font-medium hover:bg-pwhl-surface-hover shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="flex items-center bg-pwhl-surface border border-pwhl-border rounded-lg px-3 py-1.5 focus-within:border-pwhl-blue transition-colors">
            <Search size={16} className="text-pwhl-muted mr-2" />
            <input
              type="text"
              placeholder="Search players…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-48 text-pwhl-navy placeholder:text-pwhl-muted"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              downloadSeasonCsv(
                season,
                `${(data?.team_name ?? 'team').replace(/\s+/g, '_')}_player_season_full.csv`,
              )
            }
            disabled={!season.length}
            className="flex items-center gap-2 px-3 py-1.5 bg-pwhl-surface border border-pwhl-border rounded-lg text-sm font-medium hover:bg-pwhl-surface-hover transition-colors shadow-sm disabled:opacity-40"
          >
            <Download size={16} /> Export full CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div>
          <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">Season</label>
          <select
            className="bg-pwhl-cream border border-pwhl-border rounded-lg px-3 py-1.5 text-sm font-medium text-pwhl-navy"
            value={seasonPick}
            onChange={(e) => setSeasonPick(e.target.value as typeof seasonPick)}
          >
            <option value="2526">2025–26 (hub / current)</option>
            <option value="2425" disabled>
              2024–25 (import archive)
            </option>
            <option value="2324" disabled>
              2023–24 (import archive)
            </option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">Position</label>
          <select
            className="bg-pwhl-cream border border-pwhl-border rounded-lg px-3 py-1.5 text-sm font-medium text-pwhl-navy"
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value as typeof posFilter)}
          >
            <option value="all">All skaters + goalies</option>
            <option value="F">Forwards</option>
            <option value="D">Defense</option>
            <option value="G">Goalies</option>
          </select>
        </div>
      </div>

      {!activeSeason.length && !loading ? (
        <p className="text-sm text-pwhl-muted mb-4">
          {seasonPick !== '2526' ? (
            <>Historical season not loaded — select 2025–26 or ingest prior year CSVs into the hub.</>
          ) : (
            <>
              No player rows loaded. Ensure game CSV paths exist on the API machine, restart{' '}
              <code className="bg-pwhl-cream px-1 rounded text-xs">uvicorn</code>, then call{' '}
              <code className="bg-pwhl-cream px-1 rounded text-xs">/api/hub?refresh=1</code>.
            </>
          )}
        </p>
      ) : null}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="lg:w-2/3 bg-pwhl-surface border border-pwhl-border rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[320px]">
          <div className="overflow-x-auto flex-1 p-2">
            {sortableRows.length ? (
              <SortableTable
                rows={sortableRows}
                columns={sortableCols.map((c) => ({
                  key: c.key,
                  label: c.label,
                  align: c.key === 'Player' ? 'left' : 'right',
                }))}
                initialSort={{ key: 'GameScore', dir: 'desc' }}
                emptyHint="No rows."
              />
            ) : (
              <p className="text-sm text-pwhl-muted p-4">No rows for this filter.</p>
            )}
          </div>
        </div>

        <div className="lg:w-[42%] xl:max-w-xl bg-pwhl-surface border border-pwhl-border rounded-xl shadow-sm p-6 flex flex-col overflow-y-auto max-h-[calc(100vh-8rem)]">
          {!selected ? (
            <p className="text-sm text-pwhl-muted">Select a player.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 mb-4 border-b border-pwhl-border pb-3">
                {(
                  [
                    ['overview', 'Overview'],
                    ['transition', 'Transition'],
                    ['heat', 'Shot heat'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCardTab(id)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                      cardTab === id
                        ? 'bg-torrent-navy text-white border-torrent-navy'
                        : 'bg-pwhl-cream text-pwhl-muted border-pwhl-border hover:border-torrent-teal',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 rounded-full bg-pwhl-cream border-2 border-pwhl-border flex items-center justify-center text-pwhl-blue shrink-0">
                    <UserCircle size={40} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-xl text-pwhl-navy truncate">
                      {String(selected.Player ?? '')}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-pwhl-muted font-mono mt-1 flex-wrap">
                      <span className="bg-pwhl-cream px-2 py-0.5 rounded border border-pwhl-border">
                        {(selected.Pos != null && String(selected.Pos) !== ''
                          ? String(selected.Pos)
                          : null) ?? rosterPos.get(String(selected.Player ?? '')) ?? '—'}
                      </span>
                      <span className="bg-pwhl-cream px-2 py-0.5 rounded border border-pwhl-border">
                        GP {fmtCell('GP', selected.GP)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {cardTab === 'overview' ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-pwhl-cream rounded-lg p-3 border border-pwhl-border text-center">
                      <div className="text-[9px] text-pwhl-muted uppercase tracking-wider font-bold mb-1">
                        Offense
                      </div>
                      <div className="text-xl font-mono font-bold text-torrent-teal">
                        {calculatePlayerScores(selected).offense}
                      </div>
                    </div>
                    <div className="bg-pwhl-cream rounded-lg p-3 border border-pwhl-border text-center">
                      <div className="text-[9px] text-pwhl-muted uppercase tracking-wider font-bold mb-1">
                        Defense
                      </div>
                      <div className="text-xl font-mono font-bold text-pwhl-blue">
                        {calculatePlayerScores(selected).defense}
                      </div>
                    </div>
                    <div className="bg-pwhl-cream rounded-lg p-3 border border-pwhl-border text-center">
                      <div className="text-[9px] text-pwhl-muted uppercase tracking-wider font-bold mb-1">
                        Trk GS
                      </div>
                      <div className="text-xl font-mono font-bold text-pwhl-navy">
                        {fmtCell('GameScore', selected.GameScore)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-semibold text-sm text-pwhl-navy mb-1">Radar — vs positional sample (hub)</h4>
                    <p className="text-[10px] text-pwhl-muted mb-2">
                      Baseline = teammates at same position bucket when possible; else full roster.
                    </p>
                    <div className="h-52 w-full bg-pwhl-cream rounded-lg border border-pwhl-border p-2">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                            <PolarGrid stroke="#D8D2C4" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#5C6B89', fontSize: 9 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Player" dataKey="A" stroke="#1D4F91" fill="#1D4F91" fillOpacity={0.35} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-pwhl-navy mb-1">Hub-derived metrics</h4>
                    <p className="text-[10px] text-pwhl-muted mb-2 leading-relaxed">
                      xG from shot location; xG/60 uses ~17 TOI/GP (no minutes column). OZ shift % from
                      shift-start actions (see Zone Deployment.R pattern). QoT = mean hub GameScore of line / pair teammates
                      in detected units.
                    </p>
                    <div className="space-y-2 font-mono text-xs text-pwhl-navy">
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">xG/60 est</span>
                        <span className="text-right font-semibold">{hubMetric(selected, 'xG/60 est')}</span>
                      </div>
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">Shots Against (on-ice)</span>
                        <span className="text-right font-semibold font-mono">
                          {Number(selected['Shots Against'] ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">Team shot share % (iSF proxy)</span>
                        <span className="text-right font-semibold">{hubMetric(selected, 'Team shot share %')}</span>
                      </div>
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">Corsi %</span>
                        <span className="text-right font-semibold">
                          {(() => {
                            const cf =
                              Number(selected['Shots'] ?? 0) +
                              Number(selected['Blocked shots'] ?? 0) +
                              Number(selected['Missed shots'] ?? 0);
                            const teamAttempts = Math.max(
                              1,
                              (data?.per_game_metrics ?? []).reduce((a, r) => a + (Number(r['Shots'] ?? 0) || 0), 0),
                            );
                            const ca = Math.max(0, teamAttempts - cf);
                            const corsiPct = (100 * cf) / Math.max(1, cf + ca);
                            return `${corsiPct.toFixed(1)}%`;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">High-danger chances (slot)</span>
                        <span className="text-right font-semibold">{hubMetric(selected, 'Chances')}</span>
                      </div>
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">OZ shift-start %</span>
                        <span className="text-right font-semibold">{hubMetric(selected, 'OZ shift %')}</span>
                      </div>
                      <div className="flex justify-between border-b border-pwhl-border/50 pb-1 gap-2">
                        <span className="text-pwhl-muted shrink">QOT (quality of teammates, GS)</span>
                        <span className="text-right font-semibold">{qotDisplay}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-pwhl-muted mt-2">
                    Full DZ → exit → entry board lives on the <strong>Transition</strong> tab.
                  </p>
                </>
              ) : null}

              {cardTab === 'transition' && selected ? (
                <div className="text-xs font-mono text-pwhl-navy space-y-0 pr-1">
                  <p className="text-[11px] text-pwhl-muted font-sans mb-3 leading-relaxed">
                    Columns match <span className="font-mono">metrics_players.py</span> season aggregates. “Entries → shot” uses carry/dump
                    windows in the hub (shot within following events). Count metrics below are shown <strong>per GP</strong> with team rank.
                  </p>

                  {(() => {
                    const rankDisplay = (key: string, lowerIsBetter = false): string => {
                      const vals = (activeSeason ?? [])
                        .map((r) => Number(r[key]))
                        .filter((v) => Number.isFinite(v));
                      const sv = Number(selected[key]);
                      if (!Number.isFinite(sv) || vals.length === 0) return '';
                      const sorted = [...vals].sort((a, b) => (lowerIsBetter ? a - b : b - a));
                      const rank = sorted.findIndex((v) => v === sv) + 1;
                      if (rank <= 0) return '';
                      return ` (Team rank #${rank}/${sorted.length})`;
                    };

                    const rowVal = (key: string, isPct = false, lowerIsBetter = false): string => {
                      const gp = Math.max(1, Number(selected['GP'] ?? 1) || 1);
                      let base: string;
                      if (isPct) {
                        base = fmtCell('%', selected[key]);
                      } else {
                        const n = Number(selected[key]);
                        if (Number.isFinite(n)) {
                          base = (n / gp).toFixed(1);
                        } else {
                          base = transitionCell(selected, key);
                        }
                      }
                      return `${base}${rankDisplay(key, lowerIsBetter)}`;
                    };

                    return (
                      <>
                  <TransitionSectionTitle>Workload & deployment</TransitionSectionTitle>
                  {(
                    [
                      ['Transition workload', 'Transition Workload'],
                      ['Transition passes', 'Transition Passes'],
                      ['Transition carries', 'Transition Carries'],
                      ['Puck touches', 'Puck Touches'],
                      ['Deployment (OZ shift-start %)', 'OZ shift %', true],
                      ['Deployment (DZ shift-start %)', 'DZ shift %', true],
                      ['Deployment (NZ shift-start %)', 'NZ shift %', true],
                    ] as const
                  ).map(([label, key, isPct]) => (
                    <div key={label} className="flex justify-between gap-2 border-b border-pwhl-border/50 py-1.5">
                      <span className="text-pwhl-muted shrink font-sans text-[11px]">{label}</span>
                      <span className="font-semibold text-right tabular-nums">
                        {rowVal(key, Boolean(isPct))}
                      </span>
                    </div>
                  ))}

                  <TransitionSectionTitle>DZ retrievals &amp; exits</TransitionSectionTitle>
                  {(
                    [
                      ['DZ retrievals', 'DZ Retrievals'],
                      ['Retrievals w/ exit (→ breakout)', 'Retrievals w Exit'],
                      ['Successful retrieval %', '__SRP__'],
                      ['Zone exits (breakouts)', 'Zone Exits'],
                      ['Exits w/ possession', 'Exits w Possession'],
                      ['Exits w/ possession %', 'Exits w Poss %', true],
                      ['Failed exits', 'Failed Exits'],
                      ['Botched retrievals', 'Botched Retrievals'],
                    ] as const
                  ).map(([label, key, isPct]) => (
                    <div key={label} className="flex justify-between gap-2 border-b border-pwhl-border/50 py-1.5">
                      <span className="text-pwhl-muted shrink font-sans text-[11px]">{label}</span>
                      <span className="font-semibold text-right tabular-nums">
                        {key === '__SRP__'
                          ? successfulRetrievalPct(selected)
                          : rowVal(key, Boolean(isPct), key === 'Botched Retrievals' || key === 'Failed Exits')}
                      </span>
                    </div>
                  ))}

                  <TransitionSectionTitle>Entries &amp; NZ forecheck</TransitionSectionTitle>
                  {(
                    [
                      ['Zone entries', 'Zone Entries'],
                      ['Carry-ins', 'Carry-ins'],
                      ['Carry-in %', 'Carry-in %', true],
                      ['Entries → shot (carry path)', 'Carries w/ Chances'],
                      ['Entries → shot (dump path)', 'Dump-in Chances'],
                      ['Entries → shot (total)', '__ENT_SHOT__'],
                      ['Failed entries', 'Failed Entries'],
                      ['Forecheck recoveries', 'Forecheck Recoveries'],
                    ] as const
                  ).map(([label, key, isPct]) => (
                    <div key={label} className="flex justify-between gap-2 border-b border-pwhl-border/50 py-1.5">
                      <span className="text-pwhl-muted shrink font-sans text-[11px]">{label}</span>
                      <span className="font-semibold text-right tabular-nums">
                        {key === '__ENT_SHOT__'
                          ? entriesLeadingToShotsTotal(selected)
                          : isPct
                            ? rowVal(key, true)
                            : rowVal(key)}
                      </span>
                    </div>
                  ))}

                  <TransitionSectionTitle>Offense / creation (context)</TransitionSectionTitle>
                  {(
                    [
                      ['Shots off rush', 'Shots off Rush'],
                      ['Shots off FC cycle', 'Shots off FC Cycle'],
                      ['NZ shots', 'NZ Shots'],
                      ['DZ shots', 'DZ Shots'],
                      ['Primary shot assists', 'Primary Shot Assists'],
                      ['Chance assists', 'Chance Assists'],
                    ] as const
                  ).map(([label, key]) => (
                    <div key={label} className="flex justify-between gap-2 border-b border-pwhl-border/50 py-1.5">
                      <span className="text-pwhl-muted shrink font-sans text-[11px]">{label}</span>
                      <span className="font-semibold text-right tabular-nums">{rowVal(key)}</span>
                    </div>
                  ))}
                      </>
                    );
                  })()}
                </div>
              ) : null}

              {cardTab === 'pwhle' && selected ? (
                <div className="space-y-4 text-sm">
                  <p className="text-[11px] text-pwhl-muted leading-relaxed">
                    <strong>PWHLe → PWHL</strong> — enter this player&apos;s <strong>PPG in PWHLe</strong> (or equivalent elite junior
                    league) and their <strong>position</strong>. Uses base translation 0.55 × F/D adjustment; calibrate with your own
                    call-up history.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">Position</label>
                    <div className="flex gap-2">
                      {(['F', 'D'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPwhlePos(p)}
                          className={cn(
                            'text-xs font-semibold px-4 py-2 rounded-lg border transition-colors',
                            pwhlePos === p
                              ? 'bg-torrent-navy text-white border-torrent-navy'
                              : 'bg-pwhl-cream text-pwhl-muted border-pwhl-border hover:border-torrent-teal',
                          )}
                        >
                          {p === 'F' ? 'Forward' : 'Defense'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-pwhl-muted mt-1">
                      Default follows roster / hub position when you change players.
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">PPG in PWHLe league</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 1.15"
                      value={pwhlePpg}
                      onChange={(e) => setPwhlePpg(e.target.value)}
                      className="w-full border border-pwhl-border rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">PWHL schedule GP</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={projPwhlGp}
                      onChange={(e) => setProjPwhlGp(e.target.value)}
                      className="w-full max-w-[120px] border border-pwhl-border rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="rounded-xl border-2 border-torrent-teal/40 bg-torrent-teal/5 p-4">
                    <p className="text-[10px] font-bold uppercase text-torrent-teal mb-2">Projection</p>
                    <div className="space-y-1 font-mono text-sm text-pwhl-navy">
                      <div className="flex justify-between">
                        <span className="text-pwhl-muted">Combined factor</span>
                        <span>{pwhleResult.combinedFactor > 0 ? pwhleResult.combinedFactor.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pwhl-muted">Est. PWHL PPG</span>
                        <span>{pwhleResult.pwhlPpg > 0 ? pwhleResult.pwhlPpg.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-pwhl-border">
                        <span>Proj. points ({projPwhlGp || 30} GP)</span>
                        <span className="text-torrent-teal">
                          {pwhleResult.projectedPointsPwhlSeason > 0
                            ? pwhleResult.projectedPointsPwhlSeason.toFixed(1)
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-pwhl-muted">
                    Player: <span className="font-semibold text-pwhl-navy">{String(selected.Player)}</span>
                  </p>
                </div>
              ) : null}

              {cardTab === 'pwhlproj' && selected ? (
                <div className="space-y-4 text-sm">
                  <p className="text-[11px] text-pwhl-muted leading-relaxed">
                    <strong>PWHL projection</strong> — translate a prospect&apos;s points pace from <em>other</em> leagues (NCAA, U
                    Sports, etc.) into an illustrative PWHL season total. Use the <strong>PWHLe</strong> tab for elite junior PPG +
                    position. Multipliers are defaults only.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">Source league</label>
                    <select
                      className="w-full bg-pwhl-cream border border-pwhl-border rounded-lg px-3 py-2 text-sm text-pwhl-navy"
                      value={projLeagueId === 'pwhle_elite' ? 'ncaa_d1' : projLeagueId}
                      onChange={(e) => setProjLeagueId(e.target.value as SourceLeagueId)}
                    >
                      {otherLeagueOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-pwhl-muted mt-1">{projLeague.blurb}</p>
                  </div>
                  {projLeagueIdResolved === 'custom' ? (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">
                        Custom PPG → PWHL multiplier
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="2"
                        value={projCustomFactor}
                        onChange={(e) => setProjCustomFactor(e.target.value)}
                        className="w-full border border-pwhl-border rounded-lg px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] font-mono text-pwhl-navy bg-pwhl-cream/80 rounded-lg px-3 py-2 border border-pwhl-border">
                      Factor: <strong>{projFactor.toFixed(3)}</strong> × source PPG → est. PWHL PPG
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">Points (source)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 28"
                        value={projPoints}
                        onChange={(e) => setProjPoints(e.target.value)}
                        className="w-full border border-pwhl-border rounded-lg px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">GP (source)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 34"
                        value={projGp}
                        onChange={(e) => setProjGp(e.target.value)}
                        className="w-full border border-pwhl-border rounded-lg px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pwhl-muted block mb-1">PWHL schedule GP</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={projPwhlGp}
                      onChange={(e) => setProjPwhlGp(e.target.value)}
                      className="w-full max-w-[120px] border border-pwhl-border rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="rounded-xl border-2 border-torrent-teal/40 bg-torrent-teal/5 p-4">
                    <p className="text-[10px] font-bold uppercase text-torrent-teal mb-2">Projection</p>
                    <div className="space-y-1 font-mono text-sm text-pwhl-navy">
                      <div className="flex justify-between">
                        <span className="text-pwhl-muted">Source PPG</span>
                        <span>{projResult.sourcePpg > 0 ? projResult.sourcePpg.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pwhl-muted">Est. PWHL PPG</span>
                        <span>{projResult.pwhlPpg > 0 ? projResult.pwhlPpg.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-pwhl-border">
                        <span>Proj. points ({projPwhlGp || 30} GP)</span>
                        <span className="text-torrent-teal">
                          {projResult.projectedPointsPwhlSeason > 0
                            ? projResult.projectedPointsPwhlSeason.toFixed(1)
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-pwhl-muted">
                    Player: <span className="font-semibold text-pwhl-navy">{String(selected.Player)}</span> — hub GP prefilled when
                    available; enter prospect points from college/junior/international boxscores.
                  </p>
                </div>
              ) : null}

              {cardTab === 'heat' && selected ? (
                <div className="text-sm text-pwhl-navy space-y-3">
                  {false && posBucket(selected, rosterPos) === 'G' ? (
                    <p className="text-xs text-pwhl-muted">Shot location heat is for skaters.</p>
                  ) : playerHeatGames.length === 0 && !playerHeatFallback ? (
                    <p className="text-xs text-pwhl-muted leading-relaxed">
                      No shots tied to this player in <span className="font-mono">viz_shots</span> /{' '}
                      <span className="font-mono">viz_shot_games</span>. Refresh the hub after ingesting games with shooter names on
                      shot rows. Team-wide maps: <strong>Reports library</strong>.
                    </p>
                  ) : (
                    <ShotHeatmap
                      games={playerHeatGames}
                      nGames={data?.n_games ?? 0}
                      fallbackShotsFor={playerHeatFallback}
                      initialPerspective={posBucket(selected, rosterPos) === 'G' ? 'against' : 'for'}
                    />
                  )}
                </div>
              ) : null}

              {cardTab === 'flow' ? (
                <div className="text-sm text-pwhl-muted space-y-4">
                  <p>Transition flow (DZ → NZ → OZ) diagram — export SVG once player-level event chains are exposed.</p>
                  <svg viewBox="0 0 320 120" className="w-full max-w-sm mx-auto text-pwhl-navy">
                    <rect x="8" y="40" width="72" height="40" rx="6" fill="#EAE6DD" stroke="#D8D2C4" />
                    <text x="44" y="64" textAnchor="middle" className="fill-current text-[10px] font-bold">
                      DZ exit
                    </text>
                    <path d="M85 60 H115" stroke="#00A3AD" strokeWidth="2" markerEnd="url(#arr)" />
                    <rect x="120" y="40" width="72" height="40" rx="6" fill="#EAE6DD" stroke="#D8D2C4" />
                    <text x="156" y="64" textAnchor="middle" className="fill-current text-[10px] font-bold">
                      NZ
                    </text>
                    <path d="M197 60 H227" stroke="#00A3AD" strokeWidth="2" />
                    <rect x="232" y="40" width="72" height="40" rx="6" fill="#EAE6DD" stroke="#D8D2C4" />
                    <text x="268" y="64" textAnchor="middle" className="fill-current text-[10px] font-bold">
                      Entry
                    </text>
                    <defs>
                      <marker id="arr" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#00A3AD" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              ) : null}

              {cardTab === 'similar' ? (
                <div className="space-y-3">
                  <p className="text-xs text-pwhl-muted">
                    Euclidean distance on normalized hub numeric columns — &quot;Toronto&apos;s version of this Seattle
                    forward&quot; once both teams are in the same player fact table.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSimilarOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-torrent-teal/15 text-torrent-teal border border-torrent-teal/40 text-sm font-semibold"
                  >
                    <GitCompare size={16} /> Find similar skaters
                  </button>
                  <ul className="text-xs font-mono space-y-1 text-pwhl-navy">
                    {similar.map((s) => (
                      <li key={s.player}>
                        {s.player} <span className="text-pwhl-muted">· Δ {s.distance.toFixed(3)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {similarOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
          <button type="button" className="absolute inset-0 bg-pwhl-navy/50" aria-label="Close" onClick={() => setSimilarOpen(false)} />
          <div className="relative bg-white border border-pwhl-border rounded-xl shadow-xl max-w-md w-full p-6 z-10">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-serif font-bold text-lg text-pwhl-navy">Similar skaters (hub)</h3>
              <button type="button" onClick={() => setSimilarOpen(false)} className="text-pwhl-muted hover:text-pwhl-navy">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-pwhl-muted mb-3">
              Closest profiles by normalized GameScore, chances, entries, and transition rates in the current export.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-pwhl-navy">
              {similar.map((s) => (
                <li key={s.player}>
                  {s.player}{' '}
                  <span className="text-pwhl-muted font-mono text-xs">distance {s.distance.toFixed(3)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
