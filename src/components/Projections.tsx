import React, { useMemo } from 'react';
import { SortableTable, type SortableRow } from './SortableTable';
import { PWHL_STANDINGS_2526 } from '../data/pwhlStandings2526';
import { useHubData } from '../context/HubDataContext';
import { Info, RefreshCw, Target } from 'lucide-react';

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

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Player Next-Season Forecasts (2026–27)</h3>
            <p className="text-xs text-pwhl-muted mt-1">Based on regressed Game Score + xG (standard 0.3 factor)</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-pwhl-blue bg-pwhl-blue/5 px-2 py-1 rounded border border-pwhl-blue/20">
            <Info size={12} />
            REGRESSION MODELS ACTIVE
          </div>
        </div>
        
        <SortableTable
          rows={(data?.player_season || []).slice(0, 15).map((p: any) => ({
            Player: p.Player,
            Archetype: p.Archetype,
            'Curr GS': p.GameScore,
            'Proj GS': p['Proj GameScore'] ?? p.GameScore,
            'Curr xG/60': p['xG/60 est'] || 0,
            'Proj xG/60': p['Proj xG/60'] || 0,
            'Future Value': p['Proj Value'] || 0
          }))}
          initialSort={{ key: 'Future Value', dir: 'desc' }}
          columns={[
            { key: 'Player', label: 'Player' },
            { key: 'Archetype', label: 'Archetype' },
            { key: 'Curr GS', label: '25-26 GS', align: 'right' },
            { key: 'Proj GS', label: '26-27 PROJ', align: 'right' },
            { key: 'Curr xG/60', label: '25-26 xG/60', align: 'right' },
            { key: 'Proj xG/60', label: '26-27 PROJ xG', align: 'right' },
            { key: 'Future Value', label: 'Value Index', align: 'right' }
          ]}
        />
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
        <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Model Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-pwhl-cream rounded-lg border border-pwhl-border">
            <h4 className="font-semibold text-sm text-pwhl-navy mb-2 flex items-center gap-2">
              <RefreshCw size={14} className="text-pwhl-blue" />
              Regression Logic
            </h4>
            <p className="text-xs text-pwhl-muted leading-relaxed">
              We apply a 30% regression towards the league mean for both Game Score and xG/60. This removes noise from shooting benders or luck-skewed samples, providing a more reliable foundation for off-season roster planning.
            </p>
          </div>
          <div className="p-4 bg-pwhl-cream rounded-lg border border-pwhl-border">
            <h4 className="font-semibold text-sm text-pwhl-navy mb-2 flex items-center gap-2">
              <Target size={14} className="text-torrent-teal" />
              Archetype Sensitivity
            </h4>
            <p className="text-xs text-pwhl-muted leading-relaxed">
              The "Future Value Index" incorporates the regressed scoring power alongside the player's core Archetype traits (e.g., Shutdown D metrics provide defensive floor, Snipers provide offensive ceiling).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
