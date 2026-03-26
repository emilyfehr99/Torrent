import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Check, Shield, Users, X, Building2 } from 'lucide-react';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { projectedPoints30, mockSosScore } from '../lib/leagueKpis';
import { useHubData } from '../context/HubDataContext';
import { averageDisplay, formatPctCell } from '../lib/hubUtils';
import { HubDataTable } from './HubDataTable';

function formatPgCell(col: string, val: unknown): string {
  if (val == null || val === '') return '—';
  if (col.includes('%')) return formatPctCell(val);
  const n = Number(val);
  if (Number.isFinite(n) && !['opponent', 'date', 'final_score'].includes(col)) {
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  }
  return String(val);
}

function WinCell({ val }: { val: unknown }) {
  if (val === '' || val === null || val === undefined) {
    return <span className="text-pwhl-muted">—</span>;
  }
  const w = Number(val);
  if (Number.isFinite(w)) {
    if (w >= 1) {
      return <Check className="inline text-emerald-600" size={18} strokeWidth={2.5} aria-label="Win" />;
    }
    if (w <= 0) {
      return <X className="inline text-red-600/80" size={18} strokeWidth={2.5} aria-label="Loss" />;
    }
  }
  return <span>{String(val)}</span>;
}

export function TeamAnalytics() {
  const { data, loading, error } = useHubData();
  const [defIdx, setDefIdx] = useState(0);
  const [unitSearch, setUnitSearch] = useState('');
  const hubTeam = data?.team_name ?? 'Seattle Torrent';
  const standingRow = PWHL_STANDINGS_2526.find((r) => r.team === hubTeam);

  const pgCols = useMemo(() => {
    const rows = data?.per_game_metrics ?? [];
    if (!rows.length) return [] as string[];
    const preferred = ['date', 'opponent', 'result', 'Goals For', 'Goals Against'];
    const union = new Set<string>();
    for (const r of rows) Object.keys(r).forEach((k) => union.add(k));
    const hideTeamOnly = new Set(['NZ shift %', 'DZ shift %', 'OZ shift %']);
    const rest = [...union]
      .filter((k) => !preferred.includes(k) && !hideTeamOnly.has(k))
      .sort((a, b) => a.localeCompare(b));
    return [...preferred.filter((k) => union.has(k)), ...rest];
  }, [data?.per_game_metrics]);

  const barData = useMemo(() => {
    if (!data?.per_game_metrics?.length) return [];
    
    return data.per_game_metrics.map((r, i) => {
      const opp = String(r.opponent || `G${i + 1}`);
      const gf = Number(String(r['final_score'] ?? '0–0').split(/[–-]/)[0]) || 0;
      const xg = Number(r['Expected Goals (xG)'] ?? 0);

      return {
        name: opp.slice(0, 8),
        xg: xg,
        gf: gf,
      };
    });
  }, [data]);

  if (error) {
    return <p className="text-pwhl-accent text-sm">{error}</p>;
  }

  const av = data?.averages ?? [];
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
            Team-only view from Seattle hub exports.
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
          <p className="text-[11px] text-pwhl-muted mt-2">Only Seattle data is loaded in this build.</p>
        </div>
        {standingRow ? (
          <div className="flex flex-wrap gap-4 text-sm font-mono text-pwhl-navy">
            <div className="rounded-lg border border-pwhl-border bg-pwhl-cream px-3 py-2">
              <span className="text-[10px] text-pwhl-muted uppercase block">Pts / GP</span>
              {standingRow.pts} / {standingRow.gp}
            </div>
            <div className="rounded-lg border border-pwhl-border bg-pwhl-cream px-3 py-2">
              <span className="text-[10px] text-pwhl-muted uppercase block">GD</span>
              {standingRow.gd > 0 ? '+' : ''}
              {standingRow.gd}
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
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Offense vs Results (xG vs Actual)</h3>
          <div className="h-64 w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D2C4" vertical={false} />
                  <XAxis dataKey="name" stroke="#5C6B89" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5C6B89" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: '#F4F1EA' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D8D2C4',
                      borderRadius: '8px',
                      color: '#0A1C3A',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="xg" name="Expected Goals (xG)" fill="#00A3AD" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gf" name="Goals Scored" fill="#1D4F91" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-pwhl-muted text-sm">No games loaded.</div>
            )}
          </div>
        </div>

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
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Per-game metrics</h3>
        <HubDataTable rows={data?.per_game_metrics ?? []} />
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="text-torrent-teal" size={22} />
          <h3 className="font-serif font-bold text-lg text-pwhl-navy">Forward lines &amp; D pairings (season)</h3>
        </div>
        <p className="text-xs text-pwhl-muted mb-4 max-w-3xl">
          From play-by-play order (same roster-based logic as your Line:Pairing scripts).
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {data?.win_correlations && data.win_correlations.length > 0 && (
            <div className="mt-8">
              <h4 className="font-serif font-bold text-pwhl-navy mb-2">Metric ↔ win (Pearson)</h4>
              <HubDataTable rows={data.win_correlations} />
            </div>
          )}
        </div>
        ) : null}
      </div>
      ) : null}
      </>
    </div>
  );
}
