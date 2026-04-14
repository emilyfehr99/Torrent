import React, { useMemo } from 'react';
import { Gauge, Info, Sparkles } from 'lucide-react';
import type { ScoutingProfile as ScoutingProfileType } from '../types/hub';

interface Props {
  playerName: string;
  profile?: ScoutingProfileType;
}

const METRIC_LABELS: Record<string, string> = {
  GameScore: 'Game Score',
  'xG/60': 'Expected goals',
  'Primary Shot Assists/60': 'Primary shot assists',
  'Controlled Entries/60': 'Entry control',
  'Controlled Exits/60': 'Exit control',
  'Forecheck Recoveries/60': 'Forecheck recoveries',
  'Retrievals leading to Exits/60': 'Retrieval → exit',
};

function tier(pctl: number): { label: string; cls: string; bar: string } {
  if (pctl >= 90) return { label: 'Elite', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500' };
  if (pctl >= 75) return { label: 'High', cls: 'bg-blue-100 text-blue-800 border-blue-200', bar: 'bg-blue-500' };
  if (pctl >= 50) return { label: 'Average', cls: 'bg-amber-100 text-amber-900 border-amber-200', bar: 'bg-amber-500' };
  return { label: 'Developing', cls: 'bg-rose-100 text-rose-900 border-rose-200', bar: 'bg-rose-500' };
}

export function ScoutingProfile({ playerName, profile }: Props) {
  const percentileData = useMemo(() => {
    if (!profile?.percentiles) return [];
    return Object.entries(profile.percentiles)
      .map(([key, value]) => ({ key, name: METRIC_LABELS[key] || key, value: Number(value) }))
      .filter((r) => Number.isFinite(r.value))
      .sort((a, b) => b.value - a.value);
  }, [profile]);

  if (!profile) {
    return (
      <div className="p-6 text-center bg-pwhl-surface border border-pwhl-border rounded-xl">
        <p className="text-pwhl-muted">No scouting profile available for {playerName}.</p>
      </div>
    );
  }

  const overall = Number(profile.percentiles?.GameScore ?? 50);
  const overallTier = tier(Number.isFinite(overall) ? overall : 50);
  const strengths = percentileData.slice(0, 3);
  const gaps = [...percentileData].reverse().slice(0, 2);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white border border-pwhl-border rounded-2xl p-5 shadow-sm overflow-x-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold text-pwhl-muted">Scouting profile</div>
            <div className="mt-1 text-xl font-serif font-black text-pwhl-navy truncate">{playerName}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-pwhl-muted">
              <Info size={14} />
              <span>Percentiles are computed within this hub export (team-derived).</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-widest font-bold text-pwhl-muted">Overall</div>
            <div className="mt-1 inline-flex items-center gap-2">
              <span className="text-2xl font-mono font-black text-pwhl-navy">
                {Number.isFinite(overall) ? overall.toFixed(1) : '—'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${overallTier.cls}`}>
                {overallTier.label}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:flex-wrap gap-4 overflow-x-hidden">
          <div className="flex-1 min-w-0 lg:min-w-[420px]">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={16} className="text-torrent-teal" />
              <h4 className="text-xs font-black uppercase tracking-widest text-pwhl-navy">Percentiles</h4>
            </div>
            <div className="space-y-2">
              {percentileData.map((m) => {
                const t = tier(m.value);
                return (
                  <div
                    key={m.key}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 items-center min-w-0"
                  >
                    <div className="min-w-0 text-[11px] font-semibold text-pwhl-navy truncate">{m.name}</div>
                    <div className="min-w-0">
                      <div className="relative h-5 rounded-full bg-pwhl-cream border border-pwhl-border overflow-hidden">
                        <div
                          className={`h-full ${t.bar}`}
                          style={{ width: `${Math.max(0, Math.min(100, m.value))}%` }}
                        />
                        <div className="absolute inset-0 z-10 flex items-center justify-end pr-1.5 pointer-events-none">
                          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] leading-none font-mono font-black tabular-nums text-white drop-shadow">
                            {m.value.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!percentileData.length ? (
                <div className="text-xs text-pwhl-muted italic">No percentile metrics available.</div>
              ) : null}
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-4 min-w-0 w-full overflow-hidden lg:basis-80 lg:max-w-80 lg:shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-pwhl-blue" />
              <h4 className="text-xs font-black uppercase tracking-widest text-pwhl-navy">Quick read</h4>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-1">Strengths</div>
                {strengths.length ? (
                  <ul className="space-y-1 text-pwhl-navy">
                    {strengths.map((s) => (
                      <li key={s.key} className="flex justify-between gap-2 min-w-0">
                        <span className="truncate min-w-0">{s.name}</span>
                        <span className="font-mono font-bold">{s.value.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-pwhl-muted italic">—</div>
                )}
              </div>
              <div className="h-px bg-pwhl-border" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted mb-1">Development areas</div>
                {gaps.length ? (
                  <ul className="space-y-1 text-pwhl-navy">
                    {gaps.map((s) => (
                      <li key={s.key} className="flex justify-between gap-2 min-w-0">
                        <span className="truncate min-w-0">{s.name}</span>
                        <span className="font-mono font-bold">{s.value.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-pwhl-muted italic">—</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
