import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Users, Check, X } from 'lucide-react';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { projectedPoints30, mockSosScore } from '../lib/leagueKpis';
import { cn } from '../lib/utils';
import { useHubData } from '../context/HubDataContext';
import { averageDisplay, formatPctCell, numericFromAverage } from '../lib/hubUtils';
import { HubDataTable } from './HubDataTable';

export function TeamAnalytics() {
  const { data, loading, error } = useHubData();
  const [defIdx, setDefIdx] = useState(0);
  const [playerView, setPlayerView] = useState<'offense' | 'defense'>('defense');
  const [posPick, setPosPick] = useState<'ALL' | 'F' | 'D'>('ALL');
  const [perGameSide, setPerGameSide] = useState<'for' | 'against'>('for');
  const hubTeam = data?.team_name ?? 'Seattle Torrent';
  const standingRow = PWHL_STANDINGS_2526.find((r) => r.team === hubTeam);

  const av = data?.averages ?? [];

  const seasonAvgRows = useMemo(() => {
    const hideTeamOnly = new Set(['NZ shift %', 'DZ shift %', 'OZ shift %']);
    return av
      .map((r) => ({
        metric: String((r['Metric'] ?? r['metric'] ?? '') as string),
        value: (() => {
          const metric = String((r['Metric'] ?? r['metric'] ?? '') as string);
          const raw = (r['Average'] ?? r['value'] ?? null) as any;
          if (raw == null || raw === '') return '—';
          if (metric.includes('%')) return formatPctCell(raw, 1);
          const n = Number(String(raw).replace('%', ''));
          if (!Number.isFinite(n)) return String(raw);
          return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(1);
        })(),
      }))
      .filter((r) => r.metric && !hideTeamOnly.has(r.metric));
  }, [av]);

  const fallbackLines = useMemo(() => {
    const players = [...(data?.player_season ?? [])]
      .sort((a, b) => Number(b['Game Score'] ?? 0) - Number(a['Game Score'] ?? 0))
      .map((r) => String(r['Player'] ?? ''))
      .filter(Boolean);
    const out: Record<string, string | number>[] = [];
    for (let i = 0; i + 2 < Math.min(players.length, 9); i += 3) {
      out.push({ unit: `${players[i]} · ${players[i + 1]} · ${players[i + 2]}`, source: 'Estimated from season impact' });
    }
    return out;
  }, [data?.player_season]);

  const fallbackPairs = useMemo(() => {
    const players = [...(data?.player_season ?? [])]
      .sort((a, b) => Number(b['Game Score'] ?? 0) - Number(a['Game Score'] ?? 0))
      .map((r) => String(r['Player'] ?? ''))
      .filter(Boolean);
    const out: Record<string, string | number>[] = [];
    for (let i = 0; i + 1 < Math.min(players.length, 12); i += 2) {
      out.push({ unit: `${players[i]} · ${players[i + 1]}`, source: 'Estimated from season impact' });
    }
    return out;
  }, [data?.player_season]);

  if (error) {
    return <p className="text-pwhl-accent text-sm">{error}</p>;
  }

  const defGame = data?.defense_by_game?.[defIdx];

  const defenseRows = useMemo(() => {
    const rows = [...(data?.defense_season ?? [])];
    const pos = (r: any) => String(r.Pos ?? '').toUpperCase();
    const bucket = (p: string) => (p.includes('D') ? 'D' : 'F');
    if (posPick === 'ALL') return rows;
    return rows.filter((r) => bucket(pos(r)) === posPick);
  }, [data?.defense_season, posPick]);

  const defenseGameRows = useMemo(() => {
    const rows = [...(defGame?.table ?? [])];
    const pos = (r: any) => String(r.Pos ?? '').toUpperCase();
    const bucket = (p: string) => (p.includes('D') ? 'D' : 'F');
    if (posPick === 'ALL') return rows;
    return rows.filter((r) => bucket(pos(r)) === posPick);
  }, [defGame?.table, posPick]);

  const perGameRows = useMemo(() => {
    const rows = data?.per_game_metrics ?? [];
    if (perGameSide === 'for') return rows;
    return rows.map((r) => ({
      date: r.date,
      opponent: r.opponent,
      final_score: r.final_score,
      Win: r.Win,
      Shots: r['Opp Shots'] ?? r['Shots Against'],
      'Shots on goal': r['Opp Shots on goal'],
      Goals: r['Opp Goals'],
      'Zone Entries': r['Opp Zone Entries'],
      'Carry-ins': r['Opp Carry-ins'],
      'Carry-in%': r['Opp Carry-in%'],
      'Possession Exits': r['Opp Possession Exits'],
      'Possession Exit %': r['Opp Possession Exit %'],
      'Forecheck Recoveries': r['Opp Forecheck Recoveries'],
      'NZ Turnovers': r['Opp NZ Turnovers'],
      'Scoring Chances': r['Opp Scoring Chances'],
      'Entry Scoring Chance %': r['Opp Entry Scoring Chance %'],
      'Expected Goals (xG)': r['Opp Expected Goals (xG)'],
      // Keep the “against” breakdown keys as-is (these are already opponent-oriented)
      'SOG off Rush': r['SOGA off Rush'],
      'SOG off FC cycle': r['SOGA off FC cycle'],
      'SOG off NZ Turnovers': r['SOGA off NZ Turnovers'],
    }));
  }, [data?.per_game_metrics, perGameSide]);

  return (
    <div className="animate-in fade-in duration-500">
      <nav className="text-xs font-mono text-pwhl-muted mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-pwhl-navy font-semibold">Home</span>
        <span>/</span>
        <span className="text-torrent-teal font-semibold">Team analytics</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Team analytics</h2>
          <p className="text-pwhl-muted text-sm mt-1">
            Season aggregates, line combinations, and defensive metrics.
          </p>
        </div>
        {loading && <span className="text-xs font-mono text-pwhl-muted">Updating…</span>}
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-5 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-2">Team</label>
          <div className="w-full max-w-md bg-pwhl-cream border border-pwhl-border text-sm rounded-lg px-3 py-2 font-semibold text-pwhl-navy">
            {hubTeam}
          </div>
        </div>
        {standingRow ? (
          <div className="flex flex-wrap gap-4 text-sm font-mono text-pwhl-navy">
            <div className="rounded-lg border border-pwhl-border bg-pwhl-cream px-3 py-2">
              <span className="text-[10px] text-pwhl-muted uppercase block">Pts / GP</span>
              {standingRow.pts} / {standingRow.gp}
            </div>
            <div className="rounded-lg border border-pwhl-border bg-pwhl-cream px-3 py-2">
              <span className="text-[10px] text-pwhl-muted uppercase block">GD</span>
              {standingRow.gd > 0 ? '+' : ''}{standingRow.gd}
            </div>
            <div className="rounded-lg border border-pwhl-border bg-pwhl-cream px-3 py-2">
              <span className="text-[10px] text-pwhl-muted uppercase block">Proj. 30 GP</span>
              {projectedPoints30(standingRow).toFixed(1)} pts
            </div>
            <div className="rounded-lg border border-pwhl-border bg-pwhl-cream px-3 py-2">
              <span className="text-[10px] text-pwhl-muted uppercase block">SoS proxy</span>
              {mockSosScore(standingRow.pos, PWHL_STANDINGS_2526.length)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-torrent-teal" size={22} />
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Season averages (selection)</h3>
          </div>
          <ul className="space-y-3 text-sm">
            {seasonAvgRows.map((m, i) => (
              <li key={i} className="flex justify-between border-b border-pwhl-border/60 pb-2">
                <span className="text-pwhl-muted">{m.metric}</span>
                <span className="font-mono font-semibold text-pwhl-navy">{m.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Per-game metrics</h3>
            <div className="flex gap-1 bg-pwhl-cream p-1 rounded-lg border border-pwhl-border">
              <button
                type="button"
                onClick={() => setPerGameSide('for')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded',
                  perGameSide === 'for' ? 'bg-white shadow-sm text-pwhl-navy' : 'text-pwhl-muted hover:text-pwhl-navy',
                )}
              >
                Seattle (for)
              </button>
              <button
                type="button"
                onClick={() => setPerGameSide('against')}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded',
                  perGameSide === 'against' ? 'bg-white shadow-sm text-pwhl-navy' : 'text-pwhl-muted hover:text-pwhl-navy',
                )}
              >
                Opponent (against)
              </button>
            </div>
          </div>
          <HubDataTable rows={perGameRows} />
        </div>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="text-torrent-teal" size={22} />
          <h3 className="font-serif font-bold text-lg text-pwhl-navy">Forward lines &amp; D pairings (season)</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-pwhl-muted mb-3">Forward trios</h4>
            <HubDataTable
              rows={data?.line_combos_season?.length ? data.line_combos_season : fallbackLines}
              emptyHint="No line-combo data available."
            />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-pwhl-muted mb-3">Defensive pairs</h4>
            <HubDataTable
              rows={data?.pairings_season?.length ? data.pairings_season : fallbackPairs}
              emptyHint="No pairing data available."
            />
          </div>
        </div>
      </div>

      {(data?.defense_season?.length || data?.defense_by_game?.length) ? (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="font-serif font-bold text-lg text-pwhl-navy">Players · season totals</h3>
              <p className="text-xs text-pwhl-muted">Toggle offense/defense views and filter by position bucket.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-pwhl-cream p-1 rounded-lg border border-pwhl-border">
                <button
                  type="button"
                  onClick={() => setPlayerView('offense')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded',
                    playerView === 'offense' ? 'bg-white shadow-sm text-pwhl-navy' : 'text-pwhl-muted hover:text-pwhl-navy',
                  )}
                >
                  Offense
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerView('defense')}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded',
                    playerView === 'defense' ? 'bg-white shadow-sm text-pwhl-navy' : 'text-pwhl-muted hover:text-pwhl-navy',
                  )}
                >
                  Defense
                </button>
              </div>
              <select
                className="bg-pwhl-cream border border-pwhl-border text-xs rounded-lg px-2 py-1 outline-none"
                value={posPick}
                onChange={(e) => setPosPick(e.target.value as any)}
              >
                <option value="ALL">All</option>
                <option value="F">F</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
          <HubDataTable rows={playerView === 'defense' ? defenseRows : (data?.player_season ?? [])} />
        </div>

        {data?.defense_by_game?.length ? (
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-2">Players · single game</h3>
          <select
            className="mb-4 w-full bg-pwhl-cream border border-pwhl-border text-sm rounded-lg px-3 py-2 outline-none focus:border-torrent-teal font-medium"
            value={defIdx}
            onChange={(e) => setDefIdx(Number(e.target.value))}
          >
            {data.defense_by_game.map((g, i) => (
              <option key={i} value={i}>
                {[g.opponent || 'Opponent', g.date].filter(Boolean).join(' · ')}
              </option>
            ))}
          </select>
          <HubDataTable rows={defenseGameRows} />
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
