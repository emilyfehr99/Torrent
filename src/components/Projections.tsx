import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SortableTable, type SortableRow } from './SortableTable';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { useHubData } from '../context/HubDataContext';

const TRANSITION_KEYS = ['Zone Entries', 'Carry-ins', 'Possession Exits', 'NZ Turnovers'] as const;

export function Projections() {
  const { data } = useHubData();

  const standingsRows: SortableRow[] = useMemo(
    () =>
      PWHL_STANDINGS_2526.map((r) => ({
        pos: r.pos,
        team: r.team,
        gp: r.gp,
        w: r.w,
        otw: r.otw,
        otl: r.otl,
        l: r.l,
        gf: r.gf,
        ga: r.ga,
        gd: r.gd,
        pts: r.pts,
        qualification: r.qualification,
      })),
    [],
  );

  const hubPointsCurve = useMemo(() => {
    const pg = data?.per_game_metrics;
    if (!pg?.length) return [];
    let cum = 0;
    return pg.map((row, i) => {
      const w = Number(row.Win);
      const pts = w === 1 ? 3 : 0;
      cum += pts;
      const opp = String(row.opponent ?? `Game ${i + 1}`);
      const label = opp.length > 10 ? `${opp.slice(0, 8)}…` : opp;
      return {
        game: i + 1,
        label,
        cumulative_pts: cum,
        game_pts: pts,
      };
    });
  }, [data]);

  const transitionAvgRows: SortableRow[] = useMemo(() => {
    const av = data?.averages ?? [];
    const byMetric = new Map(av.map((r) => [String(r.Metric ?? ''), String(r.Average ?? '—')]));
    return TRANSITION_KEYS.map((k) => ({
      metric: k,
      season_avg: byMetric.get(k) ?? '—',
    }));
  }, [data]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Projections & Models</h2>
          <p className="text-pwhl-muted text-sm mt-1">2025–26 league standings (snapshot) · hub uses your tracked CSVs for charts</p>
        </div>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-1">2025–26 PWHL regular season — standings</h3>
        <p className="text-xs text-pwhl-muted mb-4 max-w-3xl">
          Regulation win = 3 pts, OT win = 2, OT loss = 1 (league rules). Table below is a <strong>snapshot</strong> (GP
          varies until each team completes 30 games). Updated to games played <strong>March 22, 2026</strong>.{' '}
          <a
            href="https://www.thepwhl.com/en/stats/standings"
            target="_blank"
            rel="noreferrer"
            className="text-pwhl-blue hover:underline"
          >
            thepwhl.com standings
          </a>{' '}
          ·{' '}
          <a
            href="https://en.wikipedia.org/wiki/2025%E2%80%9326_PWHL_season#Standings"
            target="_blank"
            rel="noreferrer"
            className="text-pwhl-blue hover:underline"
          >
            Wikipedia
          </a>
          . Edit <code className="text-[11px] bg-pwhl-cream px-1 rounded">src/data/pwhlStandings2526.ts</code> to refresh
          numbers. Click any column header to sort.
        </p>
        <SortableTable
          rows={standingsRows}
          initialSort={{ key: 'pos', dir: 'asc' }}
          columns={[
            { key: 'pos', label: 'Pos', align: 'right' },
            { key: 'team', label: 'Team' },
            { key: 'gp', label: 'GP', align: 'right' },
            { key: 'w', label: 'W', align: 'right' },
            { key: 'otw', label: 'OTW', align: 'right' },
            { key: 'otl', label: 'OTL', align: 'right' },
            { key: 'l', label: 'L', align: 'right' },
            { key: 'gf', label: 'GF', align: 'right' },
            { key: 'ga', label: 'GA', align: 'right' },
            { key: 'gd', label: 'GD', align: 'right' },
            { key: 'pts', label: 'Pts', align: 'right' },
            { key: 'qualification', label: 'Notes' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-1">Tracked games — cumulative points (hub)</h3>
          <p className="text-xs text-pwhl-muted mb-4">
            Uses your loaded CSVs: each win adds <strong>3</strong> points (losses 0). OTL/OTW are not split in raw Win; full league
            points are in the standings table above.
            {data?.team_name ? (
              <>
                {' '}
                Team: <span className="font-mono text-pwhl-navy">{data.team_name}</span>.
              </>
            ) : null}
          </p>
          <div className="h-64 w-full">
            {hubPointsCurve.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hubPointsCurve} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D2C4" vertical={false} />
                  <XAxis dataKey="label" stroke="#5C6B89" fontSize={11} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={56} interval={0} />
                  <YAxis stroke="#5C6B89" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D8D2C4', borderRadius: '8px' }} />
                  <Line type="stepAfter" dataKey="cumulative_pts" name="Season pts (sample)" stroke="#1D4F91" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-pwhl-muted py-12 text-center">Load game CSVs in the hub to chart cumulative points from wins.</p>
            )}
          </div>
        </div>

        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-1">Transition pace (per game, hub average)</h3>
          <p className="text-xs text-pwhl-muted mb-4">Season averages from your microstats feed — same engine as Team analytics.</p>
          <SortableTable
            rows={transitionAvgRows}
            initialSort={{ key: 'metric', dir: 'asc' }}
            columns={[
              { key: 'metric', label: 'Metric' },
              { key: 'season_avg', label: 'Season avg (display)', align: 'right' },
            ]}
          />
        </div>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
        <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Roster scenarios (illustrative)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-pwhl-cream rounded-lg border border-pwhl-border">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-pwhl-navy">Scenario A: Aggressive UFA</h4>
              <span className="text-xs font-mono bg-pwhl-success/10 text-pwhl-success px-2 py-1 rounded font-bold">+4.2 xG/60</span>
            </div>
            <p className="text-xs text-pwhl-muted">Sign top transition defensemen; trade futures for established scoring.</p>
          </div>
          <div className="p-4 bg-pwhl-cream rounded-lg border border-pwhl-border">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-pwhl-navy">Scenario B: Draft & develop</h4>
              <span className="text-xs font-mono bg-pwhl-blue/10 text-pwhl-blue px-2 py-1 rounded font-bold">+1.5 xG/60</span>
            </div>
            <p className="text-xs text-pwhl-muted">Retain core, use picks, add depth on value contracts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
