import React, { useEffect, useMemo, useState } from 'react';
import { FileText, PlayCircle, Calendar, Download, Loader2, X } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useHubData } from '../context/HubDataContext';
import { HubDataTable } from './HubDataTable';
import type { HubRow } from '../types/hub';
import { cn } from '../lib/utils';
import { buildBrandedPdf } from '../lib/brandedPdf';
import { TEAM_LOGO_PATH } from '../lib/branding';

const TRANSITION_METRICS = ['Zone Entries', 'Carry-ins', 'Possession Exits', 'Possession Exit %', 'Entry Scoring Chance %'];

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-pwhl-navy/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative bg-pwhl-surface border border-pwhl-border rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 z-10">
        <div className="flex justify-between items-start gap-4 mb-4">
          <h3 className="font-serif font-bold text-lg text-pwhl-navy pr-8">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg hover:bg-pwhl-cream text-pwhl-muted hover:text-pwhl-navy"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PreScoutHub() {
  const { data } = useHubData();
  const games = data?.per_game_metrics ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [timelinesOpen, setTimelinesOpen] = useState(false);
  const [prescoutModal, setPrescoutModal] = useState(false);
  const [prescoutPdfBusy, setPrescoutPdfBusy] = useState(false);
  const [opponentPick, setOpponentPick] = useState('');

  const opponents = useMemo(() => {
    const s = new Set<string>();
    for (const g of games) {
      const o = g.opponent;
      if (o != null && String(o).trim()) s.add(String(o).trim());
    }
    return Array.from(s).sort();
  }, [games]);

  useEffect(() => {
    if (opponents.length && !opponentPick) setOpponentPick(opponents[0]);
  }, [opponents, opponentPick]);

  const selectedRow: HubRow | null =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < games.length ? (games[selectedIdx] as HubRow) : null;

  const timelineChartData = useMemo(() => {
    return games.map((row, i) => {
      const opp = String(row.opponent ?? `G${i + 1}`);
      const short = opp.length > 12 ? `${opp.slice(0, 10)}…` : opp;
      return {
        label: short,
        entries: Number(row['Zone Entries']) || 0,
        exits: Number(row['Possession Exits']) || 0,
        nz_to: Number(row['NZ Turnovers']) || 0,
      };
    });
  }, [games]);

  const prescoutBullets = useMemo(() => {
    const av = data?.averages ?? [];
    const byM = new Map(av.map((r) => [String(r.Metric), String(r.Average)]));
    const lines: string[] = [];
    const target = opponentPick || 'selected opponent';
    lines.push(`Opponent focus: ${target}`);
    for (const m of ['Zone Entries', 'Carry-in%', 'Possession Exit %', 'Scoring Chances']) {
      const v = byM.get(m);
      if (v) lines.push(`${m}: ${v} (season avg)`);
    }
    const seq = data?.sequence_report?.goal_sequences_len3?.slice(0, 3);
    if (seq?.length) {
      lines.push('Common goal chains (season):');
      seq.forEach((s) => lines.push(`  • ${s.sequence ?? ''} (${s.count ?? 0})`));
    }
    return lines;
  }, [data, opponentPick]);

  const exportPrescoutPdf = async () => {
    const team = data?.team_name ?? 'Seattle Torrent';
    setPrescoutPdfBusy(true);
    try {
      await buildBrandedPdf({
        title: `${team} — Pre-scout brief`,
        subtitle: opponentPick ? `Focus: ${opponentPick}` : 'Hub-generated template',
        body: prescoutBullets.join('\n'),
        filename: `torrent_${team.replace(/\s+/g, '_')}_prescout_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } finally {
      setPrescoutPdfBusy(false);
    }
  };

  const hasGames = games.length > 0;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Game Analysis & Pre-Scout Hub</h2>
          <p className="text-pwhl-muted text-sm mt-1">Video placeholders · live numbers from your hub CSVs</p>
        </div>
        <button
          type="button"
          onClick={() => setPrescoutModal(true)}
          className="px-4 py-2 bg-pwhl-blue text-white rounded-lg text-sm font-medium hover:bg-pwhl-blue/90 transition-colors shadow-sm"
        >
          Generate Pre-Scout Report
        </button>
      </div>

      {!hasGames && (
        <div className="mb-6 rounded-lg border border-pwhl-border bg-pwhl-cream/80 px-4 py-3 text-sm text-pwhl-navy">
          No per-game metrics yet. Start the hub API and load game CSVs — then game breakdowns and transition charts fill from{' '}
          <code className="text-xs bg-white px-1 rounded">per_game_metrics</code>.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Scout video (placeholder)</h3>
            <div className="aspect-video bg-pwhl-cream rounded-lg border border-pwhl-border flex items-center justify-center relative overflow-hidden mb-4">
              <PlayCircle size={64} className="text-pwhl-muted opacity-60 z-10" />
              <p className="absolute bottom-3 left-3 right-3 text-xs text-pwhl-muted text-center z-10 bg-white/90 rounded px-2 py-1">
                Link your video library here; metrics below are live from the hub.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-pwhl-cream p-4 rounded-lg border border-pwhl-border">
                <h4 className="font-semibold text-sm text-pwhl-navy mb-2">From hub data</h4>
                <p className="text-xs text-pwhl-muted">
                  Select a game below for transition and scoring-chance context. Opponent labels come from filenames / CSV
                  parsing.
                </p>
              </div>
              <div className="flex-1 bg-pwhl-cream p-4 rounded-lg border border-pwhl-border">
                <h4 className="font-semibold text-sm text-pwhl-navy mb-2">Reports</h4>
                <p className="text-xs text-pwhl-muted">
                  Use <strong>Reports library</strong> for PDF-ready custom briefs and advanced tables.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Game breakdowns (microstats)</h3>
            <div className="space-y-3">
              {games.map((row, i) => {
                const opp = String(row.opponent ?? 'Opponent');
                const dt = String(row.date ?? '');
                const fs = String(row.final_score ?? '');
                const active = selectedIdx === i;
                return (
                  <button
                    key={`${opp}-${i}`}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                      active
                        ? 'bg-pwhl-blue/10 border-pwhl-blue ring-1 ring-pwhl-blue/30'
                        : 'bg-pwhl-cream border-pwhl-border hover:border-pwhl-blue',
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded bg-pwhl-surface border border-pwhl-border flex items-center justify-center text-pwhl-navy font-bold text-xs shrink-0">
                        {data?.team_name?.slice(0, 3).toUpperCase() ?? 'TM'}
                      </div>
                      <span className="text-pwhl-muted text-sm font-bold shrink-0">vs</span>
                      <div className="w-10 h-10 rounded bg-pwhl-surface border border-pwhl-border flex items-center justify-center text-pwhl-navy font-bold text-xs shrink-0">
                        {opp.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="ml-2 min-w-0">
                        <div className="font-semibold text-sm text-pwhl-navy truncate">Game breakdown</div>
                        <div className="text-xs text-pwhl-muted font-mono truncate">
                          {dt || '—'} · {fs || '—'}
                        </div>
                      </div>
                    </div>
                    <FileText size={18} className="text-pwhl-blue shrink-0" />
                  </button>
                );
              })}
              {!games.length ? (
                <p className="text-sm text-pwhl-muted">No games in hub payload.</p>
              ) : null}
            </div>

            {selectedRow ? (
              <div className="mt-6 border border-pwhl-border rounded-lg p-4 bg-pwhl-cream/50">
                <h4 className="text-sm font-bold text-pwhl-navy mb-2">Selected game — key transition metrics</h4>
                <HubDataTable
                  rows={[
                    Object.fromEntries(
                      TRANSITION_METRICS.filter((k) => k in selectedRow).map((k) => [k, selectedRow[k]]),
                    ) as HubRow,
                  ]}
                  emptyHint="No transition columns in this row."
                />
                <p className="text-[11px] text-pwhl-muted mt-3">
                  Full row is in <strong>Team analytics</strong> and Excel export. Win: {String(selectedRow.Win ?? '—')}.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-pwhl-navy mb-4">Pre-Scout Generator</h3>
            <p className="text-sm text-pwhl-muted mb-4">
              Pulls season averages and top goal sequences from the hub for a quick text brief.
            </p>
            <select
              className="w-full bg-pwhl-cream border border-pwhl-border text-sm rounded-lg px-4 py-2 outline-none focus:border-pwhl-blue font-medium mb-4"
              value={opponentPick}
              onChange={(e) => setOpponentPick(e.target.value)}
            >
              {opponents.length === 0 ? <option value="">Add games to list opponents</option> : null}
              {opponents.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPrescoutModal(true)}
              className="w-full py-2 bg-pwhl-surface border border-pwhl-border text-pwhl-navy rounded-lg text-sm font-semibold hover:bg-pwhl-cream transition-colors"
            >
              Generate Template
            </button>
          </div>

          <div className="bg-pwhl-navy text-white rounded-xl p-6 shadow-sm">
            <h3 className="font-serif font-bold text-lg mb-4">Transition Timelines</h3>
            <p className="text-sm text-white/70 mb-4">
              Zone entries, exits, and NZ turnovers by game — same data as your tracked CSVs, one series per metric.
            </p>
            <button
              type="button"
              onClick={() => setTimelinesOpen((v) => !v)}
              className="w-full py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar size={16} /> {timelinesOpen ? 'Hide timelines' : 'View timelines'}
            </button>
            {timelinesOpen && hasGames ? (
              <div className="mt-4 h-56 w-full text-pwhl-navy [&_.recharts-text]:fill-pwhl-cream">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={9} tickLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="rgba(255,255,255,0.6)" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 11 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="entries" name="Zone Entries" stroke="#7dd3fc" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="exits" name="Possession Exits" stroke="#86efac" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="nz_to" name="NZ Turnovers" stroke="#fca5a5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            {timelinesOpen && !hasGames ? (
              <p className="mt-4 text-xs text-white/60">Load games in the hub to plot timelines.</p>
            ) : null}
          </div>
        </div>
      </div>

      {prescoutModal ? (
        <Modal title="Pre-scout template (from hub)" onClose={() => setPrescoutModal(false)}>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-pwhl-border">
            <div className="bg-pwhl-cream rounded-lg px-2 py-1 border border-pwhl-border">
              <img src={TEAM_LOGO_PATH} alt="" className="h-9 w-auto max-w-[88px] object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-torrent-teal">Seattle Torrent</p>
              <p className="text-xs text-pwhl-muted">Branded PDF uses the same colours as this hub.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-pwhl-navy max-h-[50vh] overflow-y-auto pr-1">
            {prescoutBullets.map((line, i) => (
              <p key={i} className={line.startsWith('  •') ? 'font-mono text-xs pl-2' : ''}>
                {line}
              </p>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPrescoutModal(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-pwhl-border bg-white text-pwhl-navy hover:bg-pwhl-cream"
            >
              Close
            </button>
            <button
              type="button"
              disabled={prescoutPdfBusy}
              onClick={() => void exportPrescoutPdf()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-torrent-navy text-torrent-cream hover:opacity-95 disabled:opacity-50"
            >
              {prescoutPdfBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {prescoutPdfBusy ? 'Building…' : 'Download branded PDF'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
