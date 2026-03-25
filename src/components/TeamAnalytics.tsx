import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Check, Shield, Users, X, Building2 } from 'lucide-react';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { PWHL_FOCUS_TEAMS } from '../data/pwhlFocusTargets';
import { projectedPoints30, mockSosScore } from '../lib/leagueKpis';
import { useHubData } from '../context/HubDataContext';
import { averageDisplay, formatPctCell } from '../lib/hubUtils';
import { HubDataTable } from './HubDataTable';

const PG_COLS = [
  'date',
  'opponent',
  'final_score',
  'Win',
  'Scoring Chances',
  'Shot Assists',
  'Zone Entries',
  'Carry-in%',
  'Possession Exit %',
  'Entry Scoring Chance %',
  'Shots off Rush',
  'Shots off Forecheck',
  'Forecheck Recoveries',
] as const;

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
  const hubTeam = data?.team_name ?? 'Seattle Torrent';
  const [selectedTeam, setSelectedTeam] = useState(hubTeam);

  useEffect(() => {
    setSelectedTeam(hubTeam);
  }, [hubTeam]);

  const standingRow = PWHL_STANDINGS_2526.find((r) => r.team === selectedTeam);
  const isHubTeam = selectedTeam === hubTeam;
  const isFocusTarget = PWHL_FOCUS_TEAMS.includes(selectedTeam as (typeof PWHL_FOCUS_TEAMS)[number]);

  const pgCols = useMemo(() => {
    const row = data?.per_game_metrics?.[0];
    if (!row) return [] as string[];
    const keys = new Set(Object.keys(row));
    return PG_COLS.filter((c) => keys.has(c)) as string[];
  }, [data]);

  const barData = useMemo(() => {
    if (!data?.per_game_metrics?.length) return [];
    return data.per_game_metrics.map((r, i) => ({
      name: String(r.opponent || `G${i + 1}`).slice(0, 8),
      entries: Number(r['Zone Entries']) || 0,
      chances: Number(r['Scoring Chances']) || 0,
    }));
  }, [data]);

  if (error) {
    return <p className="text-pwhl-accent text-sm">{error}</p>;
  }

  const av = data?.averages ?? [];
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
            One page per PWHL club · full PBP transition stack when the hub team is selected (
            <span className="font-mono text-pwhl-navy">{hubTeam}</span>).
          </p>
        </div>
        {loading && <span className="text-xs font-mono text-pwhl-muted">Updating…</span>}
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-5 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-2">Team</label>
          <select
            className="w-full max-w-md bg-pwhl-cream border border-pwhl-border text-sm rounded-lg px-3 py-2 outline-none focus:border-torrent-teal font-semibold text-pwhl-navy"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            {PWHL_STANDINGS_2526.map((r) => (
              <option key={r.team} value={r.team}>
                {r.team}
                {r.team === hubTeam ? ' (hub)' : ''}
                {PWHL_FOCUS_TEAMS.includes(r.team as (typeof PWHL_FOCUS_TEAMS)[number]) ? ' ★' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-pwhl-muted mt-2">
            ★ = one of five narrative targets. Hub CSVs drive charts only for <strong>{hubTeam}</strong>.
          </p>
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

      {!isHubTeam ? (
        <div className="space-y-4 mb-10">
          <div className="rounded-xl border border-dashed border-pwhl-border bg-white p-6">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="text-pwhl-blue" size={20} />
              <h3 className="font-serif font-bold text-lg text-pwhl-navy">League profile — {selectedTeam}</h3>
              {isFocusTarget ? (
                <span className="text-[10px] font-bold uppercase bg-torrent-teal/15 text-torrent-teal px-2 py-0.5 rounded">Target club</span>
              ) : null}
            </div>
            <p className="text-sm text-pwhl-muted mb-4 leading-relaxed">
              <strong>Possession / share</strong> and <strong>special-teams underlying</strong> (xG on PP/PK) are not yet wired for every opponent —
              they require league shot feeds. <strong>Transition dump vs carry</strong> out of the defensive zone needs team-scoped tracking exports.
            </p>
            <ul className="text-sm text-pwhl-navy space-y-2 list-disc pl-5">
              <li>Standings-based projected finish uses pts pace to 30 GP (see Projections tab for full table).</li>
              <li>For {hubTeam}-specific carry/dump/exit rates, lines, and pairings, switch the team dropdown to the hub club.</li>
              <li>Line / pairing impact charts below are hub-only until multi-team PBP is ingested.</li>
            </ul>
          </div>
        </div>
      ) : null}

      {!isHubTeam ? (
        <p className="text-sm text-pwhl-muted mb-8 border border-pwhl-border rounded-lg p-4 bg-pwhl-cream/80">
          Select <strong>{hubTeam}</strong> above to load transition microstats, per-game tables, and defense extracts from your Python hub.
        </p>
      ) : null}

      {isHubTeam ? (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Entries vs scoring chances by opponent</h3>
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
                  <Bar dataKey="entries" name="Zone entries" fill="#1D4F91" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chances" name="Scoring chances" fill="#00A3AD" radius={[4, 4, 0, 0]} />
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
            {[
              'Exit off Retrieval %',
              'Entry Scoring Chance %',
              'Shots off Rush',
              'Shots off Forecheck',
              'SOGA off NZ Turnovers',
              'NZ Turnovers',
            ].map((m) => (
              <li key={m} className="flex justify-between border-b border-pwhl-border/60 pb-2">
                <span className="text-pwhl-muted">{m}</span>
                <span className="font-mono font-semibold text-pwhl-navy">{averageDisplay(av, m)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6 overflow-x-auto">
        <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Per-game metrics</h3>
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead className="text-[10px] text-pwhl-muted uppercase tracking-wider bg-pwhl-cream border-b border-pwhl-border">
            <tr>
              {pgCols.map((c) => (
                <th key={c} className="px-3 py-2 font-bold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pwhl-border font-mono text-xs">
            {(data?.per_game_metrics ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-pwhl-surface-hover">
                {pgCols.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 text-pwhl-navy whitespace-nowrap max-w-[200px] truncate"
                  >
                    {c === 'Win' ? (
                      <div className="flex justify-center">
                        <WinCell val={row[c]} />
                      </div>
                    ) : (
                      formatPgCell(c, row[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="text-torrent-teal" size={22} />
          <h3 className="font-serif font-bold text-lg text-pwhl-navy">Forward lines &amp; D pairings (season)</h3>
        </div>
        <p className="text-xs text-pwhl-muted mb-4 max-w-3xl">
          From play-by-play order (same roster-based logic as your Line:Pairing scripts). Shown here and under{' '}
          <strong>Reports library</strong>. Use <strong>Rebuild hub</strong> in the sidebar if counts look wrong.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-pwhl-navy mb-2">Forward trios</h4>
            <HubDataTable
              rows={data?.line_combos_season ?? []}
              emptyHint="No line data — start the API on :8787 and click Rebuild hub."
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-pwhl-navy mb-2">Defensive pairs</h4>
            <HubDataTable
              rows={data?.pairings_season ?? []}
              emptyHint="No pairing data — start the API on :8787 and click Rebuild hub."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm overflow-x-auto">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Defense · season totals (player)</h3>
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] text-pwhl-muted uppercase bg-pwhl-cream border-b border-pwhl-border">
              <tr>
                {(data?.defense_season?.[0] ? Object.keys(data.defense_season[0]) : []).map((k) => (
                  <th key={k} className="px-2 py-2 font-bold whitespace-nowrap">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pwhl-border font-mono">
              {(data?.defense_season ?? []).map((row, i) => (
                <tr key={i} className="hover:bg-pwhl-surface-hover">
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-2 py-1.5 text-pwhl-navy whitespace-nowrap">
                      {v ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-2">Defense · single game</h3>
          {data?.defense_by_game?.length ? (
            <>
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
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] text-pwhl-muted uppercase bg-pwhl-cream sticky top-0">
                    <tr>
                      {defGame?.table?.[0]
                        ? Object.keys(defGame.table[0]).map((k) => (
                            <th key={k} className="px-2 py-2 font-bold whitespace-nowrap">
                              {k}
                            </th>
                          ))
                        : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pwhl-border font-mono">
                    {(defGame?.table ?? []).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1.5 text-pwhl-navy whitespace-nowrap">
                            {v ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-pwhl-muted">No per-game defense tables.</p>
          )}

          {data?.win_correlations && data.win_correlations.length > 0 && (
            <>
              <h4 className="font-serif font-bold text-pwhl-navy mt-8 mb-2">Metric ↔ win (Pearson)</h4>
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-pwhl-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-pwhl-cream text-pwhl-muted uppercase">
                    <tr>
                      <th className="text-left px-2 py-2">Metric</th>
                      <th className="text-right px-2 py-2">r</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {data.win_correlations.map((r, i) => (
                      <tr key={i} className="border-t border-pwhl-border">
                        <td className="px-2 py-1">{String(r.Metric)}</td>
                        <td className="px-2 py-1 text-right">{String(r.Correlation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}
