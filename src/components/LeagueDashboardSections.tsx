import React, { useMemo } from 'react';
import { AlertTriangle, Globe2, Target } from 'lucide-react';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { PWHL_FOCUS_TEAMS } from '../data/pwhlFocusTargets';
import { leagueAggregates, mockSosScore, projectedPoints30 } from '../lib/leagueKpis';
import { computeOffSeasonFlags } from '../lib/offSeasonHeuristics';
import type { HubPayload } from '../types/hub';
import { TEAM_LOGO_PATH } from '../lib/branding';

export function LeagueBreadcrumb() {
  return (
    <nav className="text-xs font-mono text-pwhl-muted mb-4 flex items-center gap-2 flex-wrap">
      <span className="text-pwhl-navy font-semibold">Home</span>
      <span aria-hidden>/</span>
      <span className="text-torrent-teal font-semibold">League overview</span>
      <span aria-hidden>/</span>
      <span>Dashboard</span>
    </nav>
  );
}

export function LeagueKpiStrip() {
  const agg = useMemo(() => leagueAggregates(PWHL_STANDINGS_2526), []);
  const standings = PWHL_STANDINGS_2526;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-xl text-pwhl-navy">League quick-hit KPIs</h3>
          <p className="text-xs text-pwhl-muted mt-1 max-w-3xl">
            Board-level view from <strong>2025–26 standings snapshot</strong> (GF/GA/GD as league outcome proxies).{' '}
            <strong>xG differential</strong>, <strong>score-adjusted Corsi%</strong>, and <strong>ST underlying</strong> require a league
            shot-quality feed — shown as <span className="font-mono">N/A</span> until wired; your hub still provides transition truth for Seattle.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-pwhl-muted">
          <Globe2 size={14} className="text-torrent-teal" /> PWHL · {standings.length} teams
        </div>
      </div>

      {agg ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-pwhl-border bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-pwhl-muted tracking-wider">League GF / GA</p>
            <p className="text-2xl font-mono font-bold text-pwhl-navy mt-1">
              {agg.totalGoalsFor} / {agg.totalGoalsAgainst}
            </p>
            <p className="text-[11px] text-pwhl-muted mt-1">All teams · to date</p>
          </div>
          <div className="rounded-xl border border-pwhl-border bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-pwhl-muted tracking-wider">League GD</p>
            <p className="text-2xl font-mono font-bold text-torrent-teal mt-1">{agg.leagueGoalDiff > 0 ? '+' : ''}{agg.leagueGoalDiff}</p>
            <p className="text-[11px] text-pwhl-muted mt-1">Proxy for balance</p>
          </div>
          <div className="rounded-xl border border-pwhl-border bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-pwhl-muted tracking-wider">xG diff (league)</p>
            <p className="text-2xl font-mono font-bold text-pwhl-muted mt-1">N/A</p>
            <p className="text-[11px] text-pwhl-muted mt-1">Feed not connected</p>
          </div>
          <div className="rounded-xl border border-pwhl-border bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-pwhl-muted tracking-wider">Adj. Corsi% (league)</p>
            <p className="text-2xl font-mono font-bold text-pwhl-muted mt-1">N/A</p>
            <p className="text-[11px] text-pwhl-muted mt-1">Score & venue adj.</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-pwhl-border bg-pwhl-cream/50 overflow-x-auto">
        <table className="w-full text-xs font-mono text-left min-w-[720px]">
          <thead className="text-[10px] uppercase text-pwhl-muted bg-pwhl-cream border-b border-pwhl-border">
            <tr>
              <th className="px-3 py-2 font-bold">Team</th>
              <th className="px-3 py-2 font-bold text-right">Pts</th>
              <th className="px-3 py-2 font-bold text-right">GD</th>
              <th className="px-3 py-2 font-bold text-right">Proj. 30 GP</th>
              <th className="px-3 py-2 font-bold text-right">SoS proxy</th>
              <th className="px-3 py-2 font-bold text-right">ST xGF% (league)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pwhl-border text-pwhl-navy">
            {standings.map((r) => (
              <tr key={r.team} className="hover:bg-white/80">
                <td className="px-3 py-2 font-sans font-semibold">{r.team}</td>
                <td className="px-3 py-2 text-right">{r.pts}</td>
                <td className="px-3 py-2 text-right">{r.gd > 0 ? '+' : ''}{r.gd}</td>
                <td className="px-3 py-2 text-right">{projectedPoints30(r).toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-pwhl-muted">{mockSosScore(r.pos, standings.length)}</td>
                <td className="px-3 py-2 text-right text-pwhl-muted">N/A</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-pwhl-muted px-3 py-2 border-t border-pwhl-border">
          Proj. finish = current pts/GP × 30. SoS proxy is rank-based placeholder until schedule strength is imported.
        </p>
      </div>
    </div>
  );
}

export function TargetTeamDeepDiveCards({ hub }: { hub: HubPayload | null | undefined }) {
  const byTeam = useMemo(() => new Map(PWHL_STANDINGS_2526.map((r) => [r.team, r])), []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Target size={20} className="text-torrent-teal" />
        <h3 className="font-serif font-bold text-lg text-pwhl-navy">Target teams (5) — quick board</h3>
      </div>
      <p className="text-xs text-pwhl-muted mb-4 max-w-3xl">
        Deeper <strong>transition / line-pairing</strong> microstats appear when the hub team matches; other clubs show standings + narrative until
        multi-team tracking is connected.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PWHL_FOCUS_TEAMS.map((name) => {
          const row = byTeam.get(name);
          const isHub = hub?.team_name === name;
          return (
            <div
              key={name}
              className={`rounded-xl border p-4 shadow-sm ${
                isHub ? 'border-torrent-teal bg-torrent-teal/5 border-2' : 'border-pwhl-border bg-pwhl-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isHub ? (
                    <img src={TEAM_LOGO_PATH} alt="" className="h-8 w-auto object-contain shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-pwhl-cream border border-pwhl-border shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-pwhl-navy truncate">{name}</p>
                    {row ? (
                      <p className="text-[11px] font-mono text-pwhl-muted">
                        {row.pts} pts · GD {row.gd > 0 ? '+' : ''}
                        {row.gd} · #{row.pos}
                      </p>
                    ) : null}
                  </div>
                </div>
                {isHub ? (
                  <span className="text-[10px] font-bold uppercase text-torrent-teal shrink-0">Hub data</span>
                ) : (
                  <span className="text-[10px] font-bold uppercase text-pwhl-muted shrink-0">League</span>
                )}
              </div>
              <ul className="text-[11px] text-pwhl-muted space-y-1 mt-2">
                <li>• xG share / Corsi: N/A (league feed)</li>
                <li>• ST underlying: N/A</li>
                <li>
                  • Transition: {isHub && hub?.n_games ? `${hub.n_games} g tracked in hub` : 'Open Team analytics for hub team'}
                </li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OffSeasonPrioritiesWidget() {
  const flags = useMemo(() => computeOffSeasonFlags(PWHL_STANDINGS_2526), []);

  return (
    <div className="mb-8 rounded-xl border border-torrent-coral/30 bg-gradient-to-br from-pwhl-cream to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="text-torrent-coral" size={22} />
        <h3 className="font-serif font-bold text-lg text-pwhl-navy">Off-season priorities (auto-flags)</h3>
      </div>
      <p className="text-xs text-pwhl-muted mb-4 max-w-3xl">
        Heuristics from <strong>standings + goals</strong>. When team-level NZ transition rates exist in the API, these strings will merge with your
        metrics (e.g. &quot;Vancouver needs neutral-zone transition players&quot;).
      </p>
      <div className="space-y-3">
        {flags.length === 0 ? (
          <p className="text-sm text-pwhl-muted">No flags — tighten rules or refresh standings.</p>
        ) : (
          flags.map((f, i) => (
            <div key={i} className="rounded-lg border border-pwhl-border bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase text-pwhl-muted">{f.team}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    f.severity === 'high' ? 'bg-torrent-coral/15 text-torrent-coral' : 'bg-pwhl-border/60 text-pwhl-muted'
                  }`}
                >
                  {f.severity}
                </span>
              </div>
              <p className="font-semibold text-sm text-pwhl-navy">{f.headline}</p>
              <p className="text-xs text-pwhl-muted mt-1 leading-relaxed">{f.detail}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
