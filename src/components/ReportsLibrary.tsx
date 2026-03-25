import React, { useState } from 'react';
import { Activity, Download, FileText, Loader2, Map, RefreshCw, Users } from 'lucide-react';
import { useHubData } from '../context/HubDataContext';
import { buildBrandedPdf } from '../lib/brandedPdf';
import { buildQuickReportBody, type QuickReportVariant } from '../lib/quickReportBodies';
import { HubDataTable } from './HubDataTable';
import { PassingNetwork } from './PassingNetwork';
import { ShotHeatmap } from './ShotHeatmap';
import { CustomReportBuilder } from './CustomReportBuilder';
import { AdvancedAnalytics } from './AdvancedAnalytics';

const QUICK_REPORTS: {
  id: QuickReportVariant;
  title: string;
  blurb: string;
  type: string;
  date: string;
}[] = [
  {
    id: 'toronto-blueprint',
    title: 'Toronto opponent blueprint',
    blurb: 'Rink shots/goals/entries scoped vs Toronto.',
    type: 'Branded PDF',
    date: 'Quick export',
  },
  {
    id: 'transition-defense',
    title: 'Transition & defense profile',
    blurb: 'Team defense totals + season aggregates.',
    type: 'Branded PDF',
    date: 'Quick export',
  },
  {
    id: 'midseason',
    title: 'Mid-season team review',
    blurb: 'Record, averages, period & sequence snapshot.',
    type: 'Branded PDF',
    date: 'Quick export',
  },
];

export function ReportsLibrary() {
  const { data, loading, error, refresh } = useHubData();
  const [quickBusy, setQuickBusy] = useState<QuickReportVariant | null>(null);
  const shots = data?.viz_shots ?? [];
  const shotGames = data?.viz_shot_games ?? [];
  const edges = data?.viz_pass_edges ?? [];
  const lines = data?.line_combos_season ?? [];
  const pairs = data?.pairings_season ?? [];

  const runQuickReport = async (variant: QuickReportVariant) => {
    setQuickBusy(variant);
    try {
      const { title, subtitle, body, filename } = buildQuickReportBody(variant, data);
      await buildBrandedPdf({ title, subtitle, body, filename });
    } catch (e) {
      console.error(e);
    } finally {
      setQuickBusy(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Visualizations & Reports</h2>
          <p className="text-pwhl-muted text-sm mt-1">
            Shot map, lines &amp; pairings (PBP-order trios / D duos), and pass links — see{' '}
            <code className="text-[11px] bg-pwhl-cream px-1 rounded">config.py</code> for R report paths.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-pwhl-surface border border-pwhl-border rounded-lg text-sm font-medium hover:bg-pwhl-surface-hover shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-pwhl-accent mb-4">{error}</p> : null}

      <CustomReportBuilder />

      <AdvancedAnalytics />

      <div className="mb-6">
        <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-1">Quick exports</h3>
        <p className="text-xs text-pwhl-muted max-w-2xl mb-4">
          One-click PDFs with Seattle Torrent logo and colours. Data comes from the loaded hub (same as Custom report).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {QUICK_REPORTS.map((report) => {
            const busy = quickBusy === report.id;
            return (
              <div
                key={report.id}
                className="bg-pwhl-surface border border-pwhl-border border-l-4 border-l-torrent-teal rounded-xl p-5 shadow-sm flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-torrent-teal/15 to-pwhl-blue/10 border border-pwhl-border flex items-center justify-center text-pwhl-blue shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-pwhl-navy mb-1 leading-snug">{report.title}</h3>
                    <p className="text-xs text-pwhl-muted mb-2">{report.blurb}</p>
                    <div className="flex justify-between items-center text-xs text-pwhl-muted font-mono">
                      <span>{report.type}</span>
                      <span>{report.date}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || loading}
                  onClick={() => void runQuickReport(report.id)}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-torrent-navy text-torrent-cream text-sm font-semibold hover:opacity-95 disabled:opacity-45 transition-opacity"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {busy ? 'Building…' : 'Download PDF'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <h3 className="font-serif font-bold text-xl text-pwhl-navy mb-4">Visualization Gallery</h3>
      <p className="text-sm text-pwhl-muted mb-6">
        {data?.team_name ?? 'Team'} · {shots.length.toLocaleString()} shots for (season) · {shotGames.length}{' '}
        games in map · {edges.length} pass pairs (aggregated)
      </p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Users size={20} className="text-pwhl-blue" />
            <h4 className="font-semibold text-pwhl-navy">Forward lines &amp; D pairings (season)</h4>
          </div>
          <p className="text-xs text-pwhl-muted mb-4 max-w-3xl">
            Trios and pairs are detected from play-by-play order using roster forwards / defenders (same
            idea as your Line:Pairing Efficiency R scripts). Segments tally SOG and goals for / against while
            those units appear. Excel export adds <strong>Line_Combos</strong> and <strong>D_Pairings</strong> sheets.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-bold text-pwhl-navy mb-2">Forward trios</h5>
              <HubDataTable rows={lines} emptyHint="No line combos — run API + Rebuild hub." />
            </div>
            <div>
              <h5 className="text-sm font-bold text-pwhl-navy mb-2">Defensive pairs</h5>
              <HubDataTable rows={pairs} emptyHint="No D pairs — run API + Rebuild hub." />
            </div>
          </div>
        </div>

        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Map size={20} className="text-pwhl-blue" />
            <h4 className="font-semibold text-pwhl-navy">Shot map & heatmap</h4>
          </div>
          {shots.length > 0 || shotGames.length > 0 ? (
            <ShotHeatmap
              games={shotGames}
              nGames={data?.n_games ?? shotGames.length}
              fallbackShotsFor={shotGames.length === 0 ? shots : undefined}
            />
          ) : (
            <div className="aspect-video bg-pwhl-cream rounded-lg border border-pwhl-border flex items-center justify-center text-pwhl-muted text-sm">
              {loading ? 'Loading shots…' : 'No shot coordinates in hub (check API / games).'}
            </div>
          )}
        </div>
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-pwhl-blue" />
            <h4 className="font-semibold text-pwhl-navy">Passing network</h4>
          </div>
          {edges.length > 0 ? (
            <PassingNetwork edges={edges} />
          ) : (
            <div className="aspect-video bg-pwhl-cream rounded-lg border border-pwhl-border flex items-center justify-center text-pwhl-muted text-sm">
              {loading ? 'Loading pass graph…' : 'No pass edges extracted yet.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
