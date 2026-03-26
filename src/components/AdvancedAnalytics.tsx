import React, { useState } from 'react';
import { Download, GitBranch, Layers, Loader2 } from 'lucide-react';
import { useHubData } from '../context/HubDataContext';
import { HubDataTable } from './HubDataTable';
import { BrandedReportShell } from './BrandedReportShell';
import { buildBrandedPdf } from '../lib/brandedPdf';
import { buildAdvancedAnalyticsPdfBody } from '../lib/quickReportBodies';
import { TEAM_LOGO_PATH } from '../lib/branding';
import { formatPctCell } from '../lib/hubUtils';
import { cn } from '../lib/utils';
import type { HubRow, PeriodRecapRow, SequenceReport } from '../types/hub';

function groupedPeriodRows(rows: PeriodRecapRow[], teamName: string): Array<{ period: string; rows: HubRow[] }> {
  const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
  
  return periods.map(p => {
    const pRows = rows.filter(r => r.period === p).map(r => ({
      Metric: r.metric,
      [teamName]: r.metric_is_pct 
        ? formatPctCell(r.team, 1) 
        : (r.team != null ? r.team.toFixed(0) : '—'),
      Opponent: r.metric_is_pct 
        ? formatPctCell(r.opponent, 1) 
        : (r.opponent != null ? r.opponent.toFixed(0) : '—'),
    }));
    return { period: p, rows: pRows };
  });
}

function SeqBlock({
  title,
  rows,
  keySeq,
}: {
  title: string;
  rows: { sequence?: string; preceding_action?: string; count?: number }[] | undefined;
  keySeq: 'sequence' | 'preceding_action';
}) {
  if (!rows?.length) {
    return <p className="text-xs text-pwhl-muted">{title}: no rows (need `half` + goals in PBP).</p>;
  }
  return (
    <div className="overflow-x-auto border border-pwhl-border rounded-lg">
      <table className="w-full text-xs font-mono text-left">
        <thead className="bg-pwhl-cream text-[10px] uppercase text-pwhl-muted">
          <tr>
            <th className="px-2 py-2 font-bold">{keySeq === 'sequence' ? 'Sequence' : 'Action'}</th>
            <th className="px-2 py-2 font-bold text-right w-20">Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pwhl-border text-pwhl-navy">
          {rows.slice(0, 3).map((r, i) => (
            <tr key={i} className="hover:bg-pwhl-surface-hover">
              <td className="px-2 py-1.5 max-w-[min(100vw,42rem)] whitespace-normal break-words">
                {keySeq === 'sequence' ? r.sequence : r.preceding_action}
              </td>
              <td className="px-2 py-1.5 text-right font-mono">{r.count ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdvancedAnalytics() {
  const { data } = useHubData();
  const [pdfBusy, setPdfBusy] = useState(false);
  const period = data?.period_recap_avg ?? [];
  const seq: SequenceReport | undefined = data?.sequence_report;
  const hasPeriod = period.length > 0;
  const hasSeq =
    seq &&
    (seq.goal_sequences_len2?.length ||
      seq.goal_sequences_len3?.length ||
      seq.goal_sequences_len3_for_team?.length ||
      seq.preceding_goal_all?.length ||
      seq.preceding_goal_for_team?.length);

  const exportPdf = async () => {
    if (!data) return;
    const team = data.team_name ?? 'Seattle Torrent';
    setPdfBusy(true);
    try {
      await buildBrandedPdf({
        title: `${team} — Advanced analytics export`,
        subtitle: 'Period recap · goal sequences',
        body: buildAdvancedAnalyticsPdfBody(data),
        filename: `torrent_${team.replace(/\s+/g, '_')}_advanced_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  if (!hasPeriod && !hasSeq) {
    return (
      <div className="rounded-xl border border-pwhl-border overflow-hidden mb-8 shadow-sm">
        <div className="bg-gradient-to-r from-torrent-teal to-pwhl-navy px-4 py-3 flex items-center gap-3">
          <div className="bg-white/95 rounded-lg px-2 py-1 border border-white/50">
            <img src={TEAM_LOGO_PATH} alt="" className="h-8 w-auto max-w-[88px] object-contain" />
          </div>
          <h3 className="font-serif font-bold text-lg text-white">Advanced analytics</h3>
        </div>
        <div className="bg-pwhl-surface p-6">
          <p className="text-sm text-pwhl-muted">
            Period recap and sequence tables appear after the API includes <code className="text-[11px] bg-pwhl-cream px-1 rounded">period_recap_avg</code> and{' '}
            <code className="text-[11px] bg-pwhl-cream px-1 rounded">sequence_report</code>. Rebuild the hub (
            <code className="text-[11px] bg-pwhl-cream px-1 rounded">hub_schema_version</code> ≥ 4) and refresh. CSVs must include a{' '}
            <code className="text-[11px] bg-pwhl-cream px-1 rounded">half</code> column for period splits.
          </p>
        </div>
      </div>
    );
  }

  const [seqTab, setSeqTab] = useState<'len3' | 'len2' | 'preceding'>('len3');

  return (
    <BrandedReportShell
      title="Advanced analytics"
      subtitle={`${data?.team_name ?? 'Team'} · period & sequence layers`}
      headerRight={
        <button
          type="button"
          disabled={pdfBusy}
          onClick={() => void exportPdf()}
          className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          PDF export
        </button>
      }
    >
      <div className="p-5 space-y-8">
        <p className="text-xs text-pwhl-muted max-w-3xl">
          Same logic as your <strong>Period by Period Recap</strong> and <strong>What leads to</strong> R scripts — computed in the Python hub. PDF includes tables below.
        </p>

        {hasPeriod ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={18} className="text-pwhl-blue" />
              <h4 className="font-semibold text-pwhl-navy">Period-by-period averages (team vs opponent)</h4>
            </div>
            <p className="text-[11px] text-pwhl-muted mb-3">
              Core microstats averaged across loaded games, sliced by <code className="bg-pwhl-cream px-1 rounded">half</code> (periods 1–3). Percent metrics shown as
              whole-number percents.
            </p>
            <div className="overflow-x-auto border border-pwhl-border max-h-[32rem] overflow-y-auto rounded-lg shadow-sm">
              <table className="w-full text-left font-serif text-sm">
                <tbody className="bg-white">
                  {groupedPeriodRows(period, data?.team_name ?? 'Team').map((group, groupIdx) => (
                    <React.Fragment key={group.period}>
                      {/* Period row group header with branding */}
                      <tr>
                        <td 
                          className="px-4 py-2 font-bold text-torrent-teal border-y border-pwhl-border bg-pwhl-surface/50 font-serif text-base"
                        >
                          {group.period}
                        </td>
                        <td className="px-4 py-2 border-y border-pwhl-border bg-pwhl-surface/50 text-center">
                          <img src={TEAM_LOGO_PATH} alt="Torrent" className="h-6 w-auto inline-block" />
                        </td>
                        <td className="px-4 py-2 border-y border-pwhl-border bg-pwhl-surface/50 text-center">
                          <img src="/pwhl_logo.jpg" alt="PWHL" className="h-6 w-auto inline-block" />
                        </td>
                      </tr>
                      {/* Metric rows for this period */}
                      {group.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-pwhl-surface-hover border-b border-pwhl-border last:border-b-0 text-pwhl-navy">
                          <td className="px-4 py-2 font-medium">{row.Metric}</td>
                          <td className="px-4 py-2 text-center font-mono">{row[data?.team_name ?? 'Team']}</td>
                          <td className="px-4 py-2 text-center font-mono">{row['Opponent']}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {hasSeq ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={18} className="text-pwhl-blue" />
              <h4 className="font-semibold text-pwhl-navy">What leads to goals (sequences)</h4>
            </div>
            
            <div className="flex gap-1 bg-pwhl-surface p-1 rounded-lg border border-pwhl-border w-fit mb-4">
              {[
                { id: 'len3', label: '3-Action Chains' },
                { id: 'len2', label: '2-Action Chains' },
                { id: 'preceding', label: 'Preceding Actions' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSeqTab(t.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all',
                    seqTab === t.id
                      ? 'bg-torrent-navy text-white shadow-sm'
                      : 'text-pwhl-muted hover:text-pwhl-navy hover:bg-pwhl-cream'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {seqTab === 'len3' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <div>
                  <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-2">Top 3-action chains (all teams)</p>
                  <SeqBlock title="Len-3" rows={seq?.goal_sequences_len3} keySeq="sequence" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-2">
                    Top 3-action chains ({data?.team_name ?? 'team'} only)
                  </p>
                  <SeqBlock title="Len-3 team" rows={seq?.goal_sequences_len3_for_team} keySeq="sequence" />
                </div>
              </div>
            )}

            {seqTab === 'len2' && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-2">Top 2-action chains ending in Goals</p>
                <SeqBlock title="Len-2" rows={seq?.goal_sequences_len2} keySeq="sequence" />
              </div>
            )}

            {seqTab === 'preceding' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <div>
                  <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-2">Action immediately before Goals (all)</p>
                  <SeqBlock title="Preceding" rows={seq?.preceding_goal_all} keySeq="preceding_action" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-2">
                    Action immediately before Goals ({data?.team_name ?? 'team'})
                  </p>
                  <SeqBlock title="Preceding team" rows={seq?.preceding_goal_for_team} keySeq="preceding_action" />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </BrandedReportShell>
  );
}
