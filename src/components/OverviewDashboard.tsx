import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Crosshair, RefreshCw, TrendingUp, Shield, Download } from 'lucide-react';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
} from 'recharts';
import { StatCard } from './StatCard';
import { useHubData } from '../context/HubDataContext';
import { averageDisplay } from '../lib/hubUtils';
import { excelDownloadUrl, githubPagesApiHint, HUB_API_BASE } from '../lib/api';
import { fetchPwhlStandings, fetchPwhlTopScorers } from '../lib/pwhlApi';
import { PWHL_STANDINGS_2526, type PwhlStandingRow } from '../data/pwhlStandings2526';

export function OverviewDashboard() {
  const { data, loading, error, refresh } = useHubData();
  const [standings, setStandings] = useState<PwhlStandingRow[]>(PWHL_STANDINGS_2526);
  const [topScorerLabel, setTopScorerLabel] = useState<string>('—');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const live = await fetchPwhlStandings();
        if (alive && live.standings?.length) setStandings(live.standings);
      } catch {
        // keep snapshot
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const top = await fetchPwhlTopScorers();
        const first = top.players?.[0];
        if (alive && first) setTopScorerLabel(`${first.player} (${first.points})`);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const meanEntries = useMemo(() => {
    if (!data?.per_game_metrics?.length) return 0;
    const s = data.per_game_metrics.reduce((a, r) => a + (Number(r['Zone Entries']) || 0), 0);
    return s / data.per_game_metrics.length;
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.per_game_metrics?.length) return [];
    return data.per_game_metrics.map((r, i) => {
      const opp = String(r.opponent || `Game ${i + 1}`);
      const short = opp.length > 14 ? `${opp.slice(0, 12)}…` : opp;
      return {
        label: short,
        scoring: Number(r['Scoring Chances']) || 0,
        entries: Number(r['Zone Entries']) || 0,
        league_entries: meanEntries,
      };
    });
  }, [data, meanEntries]);

  if (error) {
    const pagesHint = githubPagesApiHint();
    return (
      <div className="rounded-xl border border-pwhl-accent/40 bg-pwhl-surface p-8 text-pwhl-navy">
        <h2 className="font-serif text-2xl font-bold text-pwhl-accent mb-2">Could not load microstats</h2>
        <p className="text-sm text-pwhl-muted mb-4 font-mono break-words">{error}</p>
        {pagesHint ? (
          <div className="mb-4 rounded-lg border border-torrent-teal/40 bg-torrent-teal/5 px-4 py-3 text-sm text-pwhl-navy">
            <p className="font-semibold text-torrent-teal mb-1">GitHub Pages</p>
            <p className="text-pwhl-muted">{pagesHint}</p>
            <a
              className="mt-2 inline-block text-sm font-semibold text-pwhl-blue underline"
              href="https://github.com/emilyfehr99/Torrent/blob/main/DEPLOY_API.md"
            >
              Open DEPLOY_API.md (API + CORS)
            </a>
          </div>
        ) : null}
        {HUB_API_BASE ? (
          <p className="text-sm text-pwhl-muted mb-2">
            API base in this build:{' '}
            <code className="bg-pwhl-cream px-1 rounded text-pwhl-navy">{HUB_API_BASE}</code>
          </p>
        ) : null}
        <p className="text-sm mb-4">
          <strong>Local dev:</strong> run the FastAPI hub from <code className="bg-pwhl-cream px-1 rounded">hub_python</code> (Vite
          proxies <code className="bg-pwhl-cream px-1 rounded">/api</code> to port 8787).
        </p>
        <pre className="bg-pwhl-navy text-pwhl-cream p-4 rounded-lg text-xs overflow-x-auto">
          uvicorn api_server:app --host 127.0.0.1 --port 8787
        </pre>
        <button
          type="button"
          onClick={() => refresh()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pwhl-blue px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const av = data?.averages ?? [];
  const seattleRow = standings.find((r) => r.team === (data?.team_name ?? 'Seattle Torrent'));
  const gamesRemaining = seattleRow ? Math.max(0, 30 - seattleRow.gp) : '—';
  const sosProxy = seattleRow ? standings.length - seattleRow.pos + 1 : '—';
  const teamPointsLeaders = useMemo(() => {
    const rows = [...(data?.player_season ?? [])];
    return rows
      .map((r) => ({
        player: String(r['Player'] ?? ''),
        points: Number(r['Goals'] ?? 0) + Number(r['Assists'] ?? 0),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [data?.player_season]);
  const last5 = useMemo(() => {
    const rows = [...(data?.per_game_metrics ?? [])];
    rows.sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
    return rows.slice(-5);
  }, [data?.per_game_metrics]);
  const last5Summary = useMemo(() => {
    if (!last5.length) return null;
    const avg = (key: string) => last5.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) / last5.length;
    return {
      scoring: avg('Scoring Chances').toFixed(1),
      entries: avg('Zone Entries').toFixed(1),
      carry: `${avg('Carry-in%').toFixed(1)}%`,
      exits: `${avg('Possession Exit %').toFixed(1)}%`,
    };
  }, [last5]);
  const seasonAverageMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of av) {
      const k = String((r['Metric'] ?? r['metric'] ?? '') as string);
      const raw = String((r['Average'] ?? r['value'] ?? '') as string).replace('%', '');
      const n = Number(raw);
      if (k && Number.isFinite(n)) m.set(k, n);
    }
    return m;
  }, [av]);
  const redFlags = useMemo(() => {
    const flags: string[] = [];
    if (!last5Summary) return flags;
    const checks: Array<[string, number, string]> = [
      ['Scoring Chances', Number(last5Summary.scoring), 'Scoring chances trending below season average'],
      ['Zone Entries', Number(last5Summary.entries), 'Zone entries trending below season average'],
      ['Carry-in%', parseFloat(last5Summary.carry), 'Carry-in rate trending below season average'],
      ['Possession Exit %', parseFloat(last5Summary.exits), 'Possession exits trending below season average'],
    ];
    for (const [metric, current, label] of checks) {
      const seasonAvg = seasonAverageMap.get(metric);
      if (seasonAvg != null && Number.isFinite(current) && current < seasonAvg) flags.push(label);
    }
    return flags;
  }, [last5Summary, seasonAverageMap]);

  return (
    <div className="animate-in fade-in duration-500">
      {loading && !data && (
        <div className="mb-6 rounded-lg border border-pwhl-border bg-pwhl-surface px-4 py-3 text-sm text-pwhl-muted flex items-center gap-2">
          <RefreshCw className="animate-spin" size={16} /> Loading tracking data…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard title="Games remaining" value={String(gamesRemaining)} subtitle="To 30 GP season" icon={Activity} />
        <StatCard title="SoS proxy" value={String(sosProxy)} subtitle="Rank-based difficulty" icon={Shield} />
        <StatCard title="PWHL points leader" value={topScorerLabel} subtitle="Live player leaderboard" icon={TrendingUp} />
        <StatCard title="Seattle points leader" value={teamPointsLeaders[0] ? `${teamPointsLeaders[0].player} (${teamPointsLeaders[0].points})` : '—'} subtitle="Goals + assists" icon={Crosshair} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-3">Last 5 games (most relevant)</h3>
          {last5Summary ? (
            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
              <div>Scoring chances: <strong>{last5Summary.scoring}</strong></div>
              <div>Zone entries: <strong>{last5Summary.entries}</strong></div>
              <div>Carry-in %: <strong>{last5Summary.carry}</strong></div>
              <div>Possession exit %: <strong>{last5Summary.exits}</strong></div>
            </div>
          ) : (
            <p className="text-sm text-pwhl-muted">No recent game rows available.</p>
          )}
        </div>
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-3">NY red flag metrics</h3>
          {redFlags.length ? (
            <ul className="text-sm text-pwhl-navy space-y-2 list-disc pl-5">
              {redFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-pwhl-muted">No high-severity red flags triggered right now.</p>
          )}
        </div>
      </div>

      <div className="border-t border-pwhl-border pt-10 mt-10">
        <h2 className="text-2xl font-serif font-bold text-pwhl-navy mb-1">Your hub team — tracking dashboard</h2>
        <p className="text-xs text-pwhl-muted mb-6 max-w-3xl">
          Microstats from <strong>your</strong> CSV pipeline (Game Score, entries, exits, lines/pairs). League-wide public models (xG, Corsi) are
          surfaced in the league table above when feeds are connected.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-pwhl-navy">{data?.team_name ?? 'Seattle Torrent'}</h3>
          <p className="text-pwhl-muted text-sm mt-1">
            Microstats from tracked games · {data?.n_games ?? '—'} games
            {data && (
              <>
                {' '}
                · Record{' '}
                <span className="font-mono font-semibold text-pwhl-blue">
                  {data.record_wins}–{data.record_losses}
                </span>{' '}
                (where score parsed from filenames)
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-pwhl-surface border border-pwhl-border rounded-lg text-sm font-medium hover:bg-pwhl-surface-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh data
          </button>
          <a
            href={excelDownloadUrl()}
            className="flex items-center gap-2 px-4 py-2 bg-torrent-navy text-torrent-cream border border-torrent-navy rounded-lg text-sm font-medium hover:opacity-95 transition-colors shadow-sm"
          >
            <Download size={16} /> Excel export
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Scoring chances / game"
          value={averageDisplay(av, 'Scoring Chances')}
          subtitle="Avg slot-adjusted chances (tracked)"
          icon={Crosshair}
        />
        <StatCard
          title="Carry-in %"
          value={averageDisplay(av, 'Carry-in%')}
          subtitle="Carries ÷ all entries"
          icon={Activity}
        />
        <StatCard
          title="Possession exit %"
          value={averageDisplay(av, 'Possession Exit %')}
          subtitle="DZ exits with puck"
          icon={TrendingUp}
        />
        <StatCard
          title="Forecheck recoveries"
          value={averageDisplay(av, 'Forecheck Recoveries')}
          subtitle="Per game average"
          icon={Shield}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-serif font-bold text-lg text-pwhl-navy">Scoring chances & entries by game</h3>
              <p className="text-xs text-pwhl-muted">Live from microstats pipeline</p>
            </div>
          </div>
          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorSc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00B5C9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00B5C9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D2C4" vertical={false} />
                  <XAxis dataKey="label" stroke="#5C6B89" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#5C6B89" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D8D2C4',
                      borderRadius: '8px',
                      color: '#0A1C3A',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="scoring"
                    name="Scoring chances"
                    stroke="#00A3AD"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSc)"
                  />
                  <Line
                    type="monotone"
                    dataKey="entries"
                    name="Zone entries"
                    stroke="#1D4F91"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="league_entries"
                    name="Avg entries (season)"
                    stroke="#5C6B89"
                    strokeWidth={1}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-pwhl-muted text-sm">No chart data yet.</div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-b from-torrent-deep to-pwhl-navy border border-pwhl-border rounded-xl p-6 shadow-sm text-pwhl-cream flex flex-col">
          <h3 className="font-serif font-bold text-lg mb-2">Torrent microstats</h3>
          <p className="text-xs text-white/75 mb-4 leading-relaxed">
            These numbers use the same definitions as your Python hub: zone entries, rush vs cycle shots on goal,
            retrieval exits, NZ turnover danger, and defensive transition events.
          </p>
          <div className="mt-auto text-[11px] font-mono text-white/60">
            {data?.generated_at
              ? `Built: ${new Date(data.generated_at).toLocaleString()}`
              : 'Awaiting first build'}
          </div>
        </div>
      </div>
    </div>
  );
}
