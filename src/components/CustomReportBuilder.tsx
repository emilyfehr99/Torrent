import React, { useMemo, useState } from 'react';
import { ClipboardList, Download, Loader2 } from 'lucide-react';
import { useHubData } from '../context/HubDataContext';
import {
  findPlayerSeasonRow,
  formatAveragesSnapshot,
  formatEntriesBlock,
  formatPlayerSnapshot,
  formatShotsGoalsBlock,
  rinkForScope,
} from '../lib/rinkReport';
import { buildBrandedPdf } from '../lib/brandedPdf';
import { HubDataTable } from './HubDataTable';
import { BrandedReportShell } from './BrandedReportShell';
import { ShotHeatmap } from './ShotHeatmap';

type Focus = 'opponent' | 'player' | 'timeframe';

const SECTIONS = [
  { id: 'lines', label: 'Line & pair impact' },
  { id: 'shots', label: 'Shot map / heat' },
  { id: 'transition', label: 'Transition / entries & exits' },
  { id: 'special', label: 'Special teams snapshot' },
] as const;

export function CustomReportBuilder() {
  const { data } = useHubData();
  const [focus, setFocus] = useState<Focus>('opponent');
  const [opponent, setOpponent] = useState('');
  const [player, setPlayer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sections, setSections] = useState<Record<(typeof SECTIONS)[number]['id'], boolean>>({
    lines: true,
    shots: true,
    transition: true,
    special: false,
  });
  const [built, setBuilt] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('Custom microstats report');
  const [pdfExporting, setPdfExporting] = useState(false);

  const playerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of data?.player_season ?? []) {
      const n = String(r.Player ?? '').trim();
      if (n) names.add(n);
    }
    for (const r of data?.roster ?? []) {
      const n = String(r.player ?? '').trim();
      if (n) names.add(n);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [data?.player_season, data?.roster]);

  const opponentHints = useMemo(() => {
    const s = new Set<string>();
    for (const row of data?.per_game_metrics ?? []) {
      const o = String(row.opponent ?? '').trim();
      if (o) s.add(o);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [data?.per_game_metrics]);

  const compileReport = () => {
    const team = data?.team_name ?? 'Team';
    const nGames = data?.n_games;
    const rec = data
      ? `${data.record_wins ?? '—'}–${data.record_losses ?? '—'}`
      : '—';
    const focusLabel =
      focus === 'opponent' ? 'Opponent scout' : focus === 'player' ? 'Player profile' : 'Time window';

    const title = `${team} — ${focusLabel}`;
    setReportTitle(title);

    const rink = rinkForScope(data?.rink_report, data?.rink_report_by_game, {
      opponent: focus === 'opponent' ? opponent : '',
    });
    const scopeNote =
      focus === 'opponent' && opponent.trim()
        ? `Scope: games where opponent matches "${opponent.trim()}" (rink metrics aggregated for those games only).`
        : `Scope: full loaded season (${data?.n_games ?? 0} games).`;

    const out: string[] = [];
    out.push(`Microstats report · ${team}`);
    out.push(`Focus: ${focusLabel} · Games: ${nGames != null ? nGames : '—'} · Record: ${rec}`);
    out.push('');
    out.push('Scope');
    out.push(`• Focus: ${focusLabel}`);
    if (focus === 'opponent') {
      out.push(`• Opponent filter: ${opponent.trim() || '(none — using full season rink totals)'}`);
    }
    if (focus === 'player') {
      out.push(`• Player: ${player.trim() || '(not specified)'}`);
    }
    if (fromDate || toDate) {
      out.push(`• Timeframe note: ${fromDate || '…'} → ${toDate || '…'} (date filtering for rink tables requires consistent game dates in hub; opponent filter is applied when set).`);
    } else {
      out.push('• Timeframe: all loaded games.');
    }
    out.push('');
    out.push('Included sections');
    for (const s of SECTIONS) {
      out.push(sections[s.id] ? `[x] ${s.label}` : `[ ] ${s.label}`);
    }
    out.push('');
    out.push('Report details');
    out.push('');

    if (sections.shots) {
      out.push(formatShotsGoalsBlock(team, rink, scopeNote));
      out.push('');
      const n = data?.viz_shots?.length ?? 0;
      const ng = data?.viz_shot_games?.length ?? 0;
      out.push(`Shot plot dataset: ${n} total points across ${ng || nGames || 0} games.`);
      out.push('');
    }
    if (sections.transition) {
      out.push(formatEntriesBlock(team, rink, scopeNote));
      out.push('');
    }

    if (focus === 'player' && player.trim()) {
      const prow = findPlayerSeasonRow(data?.player_season, player.trim());
      out.push(formatPlayerSnapshot(prow, player.trim()));
      out.push('');
    }

    if (sections.lines) {
      const nLines = data?.line_combos_season?.length ?? 0;
      const nPairs = data?.pairings_season?.length ?? 0;
      out.push(
        `Line & pair impact (PBP-order segments): ${nLines} forward trios and ${nPairs} defensive pairs in hub season tables.`,
      );
      out.push('');
    }

    const av = formatAveragesSnapshot(data?.averages);
    if (av) {
      out.push(av);
      out.push('');
    }

    if (sections.special) {
      out.push(
        'Special teams: PP/PK process columns are included in per-game exports when present in your tracking files; cross-check Team averages and game logs.',
      );
      out.push('');
    }

    out.push(`Generated: ${new Date().toLocaleString()}`);

    setBuilt(out.join('\n'));
  };

  const downloadPdf = async () => {
    if (!built) return;
    const safe = (data?.team_name ?? 'team').replace(/\s+/g, '_');
    setPdfExporting(true);
    try {
      await buildBrandedPdf({
        title: reportTitle,
        subtitle: data?.team_name ? `${data.team_name} · internal` : undefined,
        body: built,
        filename: `torrent_${safe}_custom_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div id="custom-report" className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm mb-8 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-pwhl-cream border border-pwhl-border flex items-center justify-center text-pwhl-blue shrink-0">
            <ClipboardList size={20} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Custom report</h3>
            <p className="text-xs text-pwhl-muted mt-1 max-w-2xl">
              Configure opponent, player, or date range, then generate a printable brief. PDF export uses the
              same text as the preview below.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-2">
              Report focus
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['opponent', 'Opponent'],
                  ['player', 'Player'],
                  ['timeframe', 'Timeframe'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFocus(id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    focus === id
                      ? 'bg-pwhl-navy text-white border-pwhl-navy'
                      : 'bg-pwhl-cream text-pwhl-muted border-pwhl-border hover:border-torrent-teal'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {focus === 'opponent' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-1">
                Opponent
              </label>
              <input
                type="text"
                list="opponent-hints-cr"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. Toronto, Minnesota"
                className="w-full text-sm border border-pwhl-border rounded-lg px-3 py-2 bg-white text-pwhl-navy"
              />
              <datalist id="opponent-hints-cr">
                {opponentHints.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </div>
          )}

          {focus === 'player' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-1">
                Player
              </label>
              <input
                type="text"
                list="player-hints-cr"
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                placeholder="Name from roster / player season"
                className="w-full text-sm border border-pwhl-border rounded-lg px-3 py-2 bg-white text-pwhl-navy"
              />
              <datalist id="player-hints-cr">
                {playerOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-1">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-sm border border-pwhl-border rounded-lg px-3 py-2 bg-white text-pwhl-navy"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-1">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-sm border border-pwhl-border rounded-lg px-3 py-2 bg-white text-pwhl-navy"
              />
            </div>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-2">
            Include sections
          </span>
          <div className="space-y-2">
            {SECTIONS.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 text-sm text-pwhl-navy cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={sections[s.id]}
                  onChange={(e) => setSections((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                  className="rounded border-pwhl-border text-pwhl-navy focus:ring-torrent-teal"
                />
                {s.label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={compileReport}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-pwhl-navy text-white hover:opacity-95"
            >
              Build report
            </button>
            <button
              type="button"
              disabled={!built || pdfExporting}
              onClick={() => void downloadPdf()}
              className="text-sm font-semibold px-4 py-2 rounded-lg border border-pwhl-border bg-white text-pwhl-navy hover:bg-pwhl-cream disabled:opacity-40 inline-flex items-center gap-2"
            >
              {pdfExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfExporting ? 'Building PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {built ? (
        <div className="mt-6">
          <p className="text-[10px] font-mono text-pwhl-muted mb-2">Preview — matches branded PDF export</p>
          <BrandedReportShell
            title={reportTitle}
            subtitle={data?.team_name ? `${data.team_name} · internal` : 'Microstats hub'}
          >
            <div className="p-5">
              <div
                className="text-sm text-pwhl-navy leading-relaxed whitespace-pre-wrap font-sans max-h-[28rem] overflow-y-auto pr-1"
                style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
              >
                {built}
              </div>
              <div className="mt-4 pt-3 border-t border-pwhl-border">
                <p className="text-[11px] text-pwhl-muted">
                  Hub tables (lines / pairs) for reference — full export is in the Excel workbook.
                </p>
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-2">Rink shot plot &amp; heatmap</p>
                  <ShotHeatmap
                    games={data?.viz_shot_games ?? []}
                    nGames={data?.n_games ?? 0}
                    fallbackShotsFor={(data?.viz_shot_games?.length ?? 0) === 0 ? data?.viz_shots : undefined}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-1">Forward trios (sample)</p>
                    <HubDataTable
                      rows={(data?.line_combos_season ?? []).slice(0, 6)}
                      emptyHint="No line combos in hub."
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-pwhl-muted mb-1">D pairs (sample)</p>
                    <HubDataTable
                      rows={(data?.pairings_season ?? []).slice(0, 6)}
                      emptyHint="No pairings in hub."
                    />
                  </div>
                </div>
              </div>
            </div>
          </BrandedReportShell>
        </div>
      ) : null}
    </div>
  );
}
