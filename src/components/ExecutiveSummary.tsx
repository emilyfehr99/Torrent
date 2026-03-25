import React, { useEffect, useState } from 'react';
import { Download, Loader2, Save } from 'lucide-react';
import { buildBrandedPdf } from '../lib/brandedPdf';
import { BrandedReportShell } from './BrandedReportShell';

const STORAGE_KEY = 'torrent_executive_summary_weekly_v1';

const DEFAULT_BODY = `Executive summary — pitch week
• League: PWHL 2025–26; use standings snapshot + hub tracking for Seattle.
• Story: transition game (entries/exits/NZ) as differentiator vs public box-only sites.
• Ask: data partnership + branded analytics layer for staff/coaches.
• Next week: refresh opponent scope reports + player similarity board for targets.`;

export function ExecutiveSummary() {
  const [body, setBody] = useState(DEFAULT_BODY);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { text: string; at: string };
        if (p.text) setBody(p.text);
        if (p.at) setSavedAt(p.at);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = () => {
    const at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: body, at }));
    setSavedAt(at);
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      await buildBrandedPdf({
        title: 'Weekly executive summary',
        subtitle: 'Seattle Torrent — internal',
        body,
        filename: `torrent_executive_summary_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <BrandedReportShell title="One-pager executive summary" subtitle="Update weekly during the pitch period · saved in this browser">
      <div className="p-5 space-y-4">
        <p className="text-xs text-pwhl-muted">
          Draft bullets for investors / hockey ops. Text persists in <code className="text-[11px] bg-pwhl-cream px-1 rounded">localStorage</code> only on this
          machine.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="w-full text-sm border border-pwhl-border rounded-lg px-3 py-2 font-sans text-pwhl-navy bg-white focus:ring-2 focus:ring-torrent-teal/30 focus:border-torrent-teal outline-none"
          placeholder="Weekly bullets…"
        />
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-[11px] font-mono text-pwhl-muted">
            {savedAt ? `Last saved: ${new Date(savedAt).toLocaleString()}` : 'Not saved yet this session'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={persist}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-pwhl-border bg-pwhl-cream text-sm font-semibold text-pwhl-navy hover:bg-pwhl-surface-hover"
            >
              <Save size={16} /> Save locally
            </button>
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => void exportPdf()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-torrent-navy text-torrent-cream text-sm font-semibold hover:opacity-95 disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </BrandedReportShell>
  );
}
