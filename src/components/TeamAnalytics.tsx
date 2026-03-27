import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Users, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { projectedPoints30, mockSosScore } from '../lib/leagueKpis';
import { useHubData } from '../context/HubDataContext';
import { averageDisplay, formatPctCell, numericFromAverage } from '../lib/hubUtils';
import { HubDataTable } from './HubDataTable';

function fmtCell(k: string, v: unknown): string {
  if (v == null || v === '') return '—';
  if (k.includes('%')) return formatPctCell(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(1)));
  return String(v);
}

export function TeamAnalytics() {
  const { data, loading, error } = useHubData();
  const [defIdx, setDefIdx] = useState(0);
  const hubTeam = data?.team_name ?? 'Seattle Torrent';
  const standingRow = PWHL_STANDINGS_2526.find((r) => r.team === hubTeam);

  const av = data?.averages ?? [];

  const efficiencyScores = useMemo(() => {
    const players = data?.player_season ?? [];
    if (!players.length) return { offense: 0, defense: 0 };
    
    // Average the pre-calculated player scores for a Team Index
    const offSum = players.reduce((acc, p) => acc + (Number(p['Offense Score']) || 0), 0);
    const defSum = players.reduce((acc, p) => acc + (Number(p['Defense Score']) || 0), 0);
    const count = players.length;

    return { 
      offense: Math.round(offSum / count), 
      defense: Math.round(defSum / count) 
    };
  }, [data?.player_season]);

  const seasonAvgRows = useMemo(() => {
    const hideTeamOnly = new Set(['NZ shift %', 'DZ shift %', 'OZ shift %']);
    return av
      .map((r) => ({
        metric: String((r['Metric'] ?? r['metric'] ?? '') as string),
        value: String((r['Average'] ?? r['value'] ?? '—') as string),
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
            Team performance index and season averages.
          </p>
        </div>
        {loading && <span className="text-xs font-mono text-pwhl-muted">Updating…</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-2">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm flex items-center gap-6">
          <div className="w-20 h-20 rounded-full border-4 border-torrent-teal/20 flex items-center justify-center relative">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-pwhl-cream" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="289" strokeDashoffset={289 * (1 - efficiencyScores.offense / 100)} className="text-torrent-teal transition-all duration-1000" />
            </svg>
            <span className="text-2xl font-serif font-bold text-pwhl-navy">{efficiencyScores.offense}</span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Offense Score</h3>
            <p className="text-[11px] text-pwhl-muted max-w-[14rem]">Weighted team average of individual player offensive metrics (Entries, Recoveries, Chances).</p>
          </div>
        </div>

        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm flex items-center gap-6 text-right sm:text-left">
          <div className="w-20 h-20 rounded-full border-4 border-pwhl-blue/20 flex items-center justify-center relative order-last sm:order-first">
            <svg className="absolute inset-x-0 inset-y-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-pwhl-cream" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="289" strokeDashoffset={289 * (1 - efficiencyScores.defense / 100)} className="text-pwhl-blue transition-all duration-1000" />
            </svg>
            <span className="text-2xl font-serif font-bold text-pwhl-navy">{efficiencyScores.defense}</span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Defense Score</h3>
            <p className="text-[11px] text-pwhl-muted max-w-[14rem]">Weighted team average of individual player defensive metrics (Retrievals, Denials, Exits).</p>
          </div>
        </div>
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
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Per-game metrics</h3>
          <HubDataTable rows={data?.per_game_metrics ?? []} />
        </div>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="text-torrent-teal" size={22} />
          <h3 className="font-serif font-bold text-xl text-pwhl-navy">Elite Tactical leaderboards</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Offense Leaders', key: 'Offense Score', color: 'text-torrent-teal' },
            { label: 'Defense Leaders', key: 'Defense Score', color: 'text-pwhl-blue' },
            { label: 'PK Denial Specialists', key: 'PK Denials', color: 'text-pwhl-accent' },
            { label: 'Blueline Activation', key: 'Blueline Activation', color: 'text-pwhl-navy' },
          ].map((lb) => {
            const sorted = [...(data?.player_season ?? [])]
              .sort((a, b) => Number(b[lb.key] ?? 0) - Number(a[lb.key] ?? 0))
              .slice(0, 5);
            return (
              <div key={lb.label} className="bg-pwhl-cream/50 border border-pwhl-border rounded-lg p-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-pwhl-muted mb-3 border-b border-pwhl-border pb-1">
                  {lb.label}
                </h4>
                <ul className="space-y-2">
                  {sorted.map((p, i) => (
                    <li key={i} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-pwhl-navy truncate pr-2">{p.Player}</span>
                      <span className={cn("font-mono font-bold shrink-0", lb.color)}>
                        {fmtCell(lb.key, p[lb.key])}
                      </span>
                    </li>
                  ))}
                  {!sorted.length && <li className="text-[10px] text-pwhl-muted italic">No data</li>}
                </ul>
              </div>
            );
          })}
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
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Defense · season totals (player)</h3>
          <HubDataTable rows={data?.defense_season ?? []} />
        </div>

        {data?.defense_by_game?.length ? (
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-2">Defense · single game</h3>
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
          <HubDataTable rows={defGame?.table ?? []} />
        </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
