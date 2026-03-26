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
      const gf = Number(String(r['final_score'] ?? '0–0').split(/[–-]/)[0]) || 0;
      
      // Use pre-calculated xG from backend if available, fallback to 0
      const xg = Number(r['Expected Goals (xG)'] ?? 0);

      return {
        label: short,
        xg: xg,
        gf: gf,
      };
    });
  }, [data]);

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
        gs: Number(r['GameScore'] ?? 0),
      }))
      .sort((a, b) => b.gs - a.gs)
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
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto space-y-10 pb-12">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pwhl-navy to-torrent-navy p-8 text-pwhl-cream shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-torrent-teal/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-torrent-teal/20 border border-torrent-teal/40 rounded text-[10px] uppercase tracking-widest font-bold">Live Hub</span>
              <span className="text-xs font-mono text-white/60">Updated {data?.generated_at ? new Date(data.generated_at).toLocaleDateString() : '—'}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight mb-2">
              {data?.team_name ?? 'Seattle Torrent'}
            </h1>
            <div className="flex items-center gap-4 text-sm font-mono text-white/80">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-torrent-teal" />
                {data?.n_games ?? '—'} games tracked
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-lg border border-white/10 font-bold text-white">
                {data?.record_wins ?? 0}–{data?.record_losses ?? 0} Record
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">Season Progress</span>
                <div className="text-3xl font-serif font-bold text-torrent-teal truncate">{gamesRemaining} <span className="text-sm font-sans font-normal text-white/50">GP Left</span></div>
             </div>
             <div className="flex gap-2">
               <button
                onClick={() => refresh()}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold hover:bg-white/20 transition-all active:scale-95"
               >
                 <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                 SYNC
               </button>
               <a
                href={excelDownloadUrl()}
                className="flex items-center gap-2 px-4 py-2 bg-torrent-teal text-pwhl-navy rounded-xl text-xs font-bold hover:brightness-110 transition-all active:scale-95"
               >
                 <Download size={14} />
                 EXPORT
               </a>
             </div>
          </div>
        </div>
      </section>

      {/* Main KPI Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          title="Scoring chances"
          value={averageDisplay(av, 'Scoring Chances')}
          trend="+1.2" trendUp={true}
          subtitle="Per game vs opponent"
          icon={Crosshair}
        />
        <StatCard
          title="Carry-in %"
          value={averageDisplay(av, 'Carry-in%')}
          subtitle="Zone entry success"
          icon={Activity}
        />
        <StatCard
          title="DZ Exits"
          value={averageDisplay(av, 'Possession Exit %')}
          subtitle="Clean possession exits"
          icon={Shield}
        />
        <StatCard
          title="Expected goals"
          value={averageDisplay(av, 'Expected Goals (xG)')}
          subtitle="Team iXG per game"
          icon={Crosshair}
        />
      </section>

      {/* Analytics Main Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-pwhl-border rounded-3xl p-8 shadow-sm">
             <div className="flex justify-between items-center mb-8">
               <div>
                 <h2 className="text-2xl font-serif font-black text-pwhl-navy">Offense vs Results</h2>
                 <p className="text-xs text-pwhl-muted font-mono uppercase tracking-widest mt-1">Expected goals (xG) vs actual goals per game</p>
               </div>
             </div>
             <div className="h-80 w-full">
               {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                     <defs>
                       <linearGradient id="colorXg" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#00A3AD" stopOpacity={0.25} />
                         <stop offset="95%" stopColor="#00A3AD" stopOpacity={0} />
                       </linearGradient>
                       <linearGradient id="colorGf" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#1D4F91" stopOpacity={0.15} />
                         <stop offset="95%" stopColor="#1D4F91" stopOpacity={0} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" vertical={false} />
                     <XAxis dataKey="label" stroke="#5C6B89" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                     <YAxis stroke="#5C6B89" fontSize={12} tickLine={false} axisLine={false} />
                     <Tooltip
                       contentStyle={{
                         backgroundColor: '#0A1C3A',
                         borderColor: 'rgba(255,255,255,0.1)',
                         borderRadius: '12px',
                         color: '#FFFFFF',
                       }}
                       itemStyle={{ color: '#00A3AD' }}
                     />
                     <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                     <Area
                       type="monotone"
                       dataKey="xg"
                       name="Expected goals (xG)"
                       stroke="#00A3AD"
                       strokeWidth={3}
                       fillOpacity={1}
                       fill="url(#colorXg)"
                     />
                     <Area
                       type="monotone"
                       dataKey="gf"
                       name="Goals scored"
                       stroke="#1D4F91"
                       strokeWidth={2}
                       fillOpacity={1}
                       fill="url(#colorGf)"
                     />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-pwhl-muted text-sm italic">Gathering game data…</div>
               )}
             </div>
           </div>

           {/* League Insight Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-pwhl-cream/40 border border-pwhl-border rounded-2xl p-6 flex items-start gap-4">
                 <div className="p-3 bg-pwhl-navy rounded-xl text-white">
                    <TrendingUp size={24} />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-pwhl-muted mb-1">League Scoring</h4>
                    <p className="text-sm font-semibold">{topScorerLabel}</p>
                    <p className="text-[10px] text-pwhl-muted mt-1 uppercase">League points leader</p>
                 </div>
              </div>
              <div className="bg-pwhl-surface border border-torrent-teal/40 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                 <div className="p-3 bg-torrent-teal rounded-xl text-pwhl-navy">
                    <Crosshair size={24} />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-pwhl-muted mb-1">Team Leader</h4>
                    <p className="text-sm font-semibold">{teamPointsLeaders[0]?.player ?? '—'} <span className="text-pwhl-muted">({teamPointsLeaders[0]?.gs?.toFixed(1) ?? 0})</span></p>
                    <p className="text-[10px] text-pwhl-muted mt-1 uppercase">Season GameScore Leader (Tracking)</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar Analysis */}
        <aside className="space-y-6">
           {/* Recent Analysis Unified Card */}
           <div className="bg-white border border-pwhl-border rounded-3xl p-6 shadow-sm">
             <h3 className="text-sm font-black uppercase tracking-[0.2em] text-pwhl-navy mb-6 pb-2 border-b border-pwhl-border">TREND REPORT</h3>
             
             <div className="space-y-6">
                <div>
                   <h4 className="text-xs font-bold text-pwhl-muted mb-3 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-pwhl-blue" />
                     Last 5 Game Snapshot
                   </h4>
                   {last5Summary ? (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-pwhl-surface rounded-xl border border-pwhl-border/50">
                           <div className="text-[10px] text-pwhl-muted font-bold mb-1">CHANCES</div>
                           <div className="text-lg font-serif font-black">{last5Summary.scoring}</div>
                        </div>
                        <div className="p-3 bg-pwhl-surface rounded-xl border border-pwhl-border/50">
                           <div className="text-[10px] text-pwhl-muted font-bold mb-1">ENTRIES</div>
                           <div className="text-lg font-serif font-black">{last5Summary.entries}</div>
                        </div>
                        <div className="p-3 bg-pwhl-surface rounded-xl border border-pwhl-border/50">
                           <div className="text-[10px] text-pwhl-muted font-bold mb-1">CARRY %</div>
                           <div className="text-lg font-serif font-black">{last5Summary.carry}</div>
                        </div>
                        <div className="p-3 bg-pwhl-surface rounded-xl border border-pwhl-border/50">
                           <div className="text-[10px] text-pwhl-muted font-bold mb-1">EXITS %</div>
                           <div className="text-lg font-serif font-black">{last5Summary.exits}</div>
                        </div>
                     </div>
                   ) : <p className="text-xs italic text-pwhl-muted">No data.</p>}
                </div>

                <div>
                   <h4 className="text-xs font-bold text-pwhl-muted mb-3 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-torrent-coral" />
                     Anomalies & Red Flags
                   </h4>
                   {redFlags.length ? (
                     <div className="space-y-2">
                        {redFlags.map((f, i) => (
                          <div key={i} className="p-3 bg-torrent-coral/5 border border-torrent-coral/20 rounded-xl flex items-start gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-torrent-coral mt-1.5 shrink-0" />
                             <p className="text-xs font-medium text-pwhl-navy leading-snug">{f}</p>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="p-4 bg-torrent-teal/5 border border-torrent-teal/20 rounded-xl flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-torrent-teal mt-1.5" />
                        <p className="text-xs font-medium text-pwhl-navy">Performance stable: No metrics trending below season averages.</p>
                     </div>
                   )}
                </div>
             </div>
           </div>

           {/* Context Card */}
           <div className="bg-gradient-to-br from-pwhl-surface to-pwhl-cream border border-pwhl-border rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-pwhl-navy mb-3">Data Methodology</h3>
              <p className="text-[11px] leading-relaxed text-pwhl-muted">
                These numbers use the Torrent microstats pipeline. All models utilize zone entries, rush vs cycle shot metrics, retrieval exits, and turnover danger indexing.
              </p>
              <div className="h-px bg-pwhl-border my-4" />
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-pwhl-blue uppercase">
                 <span>Source</span>
                 <span>Microstats v1.4</span>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
