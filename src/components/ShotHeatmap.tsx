import React, { useMemo, useState } from 'react';
import { Download, Loader2, Eye } from 'lucide-react';
import type { VizShot, VizShotGame } from '../types/hub';
import { buildBrandedPdf } from '../lib/brandedPdf';

export type ShotPoint = { x?: number | null; y?: number | null; player?: string | null };

const Y_MAX = 42.5;
const NX = 40;
const NY = 18;
const SHOT_PAD = 30;
const SHOT_W = 2000;
const SHOT_H = 850;
const VB_W = 1400;
const VB_H = 900;
const DEFAULT_RINK_IMAGE = `${import.meta.env.BASE_URL}overlays/half_rink.png`;
const DEFAULT_CALIBRATION = {
  xOffsetPx: 139,
  yOffsetPx: -251,
  scale: 1.64,
  rotationDeg: 0,
  flipX: false,
  flipY: true,
  opacity: 0.8,
};

function heatFill(t: number): string {
  if (t <= 0) return 'rgba(227, 238, 245, 0.15)';
  if (t < 0.2) return 'rgba(0, 179, 201, 0.18)';
  if (t < 0.45) return 'rgba(0, 163, 173, 0.42)';
  if (t < 0.7) return 'rgba(29, 79, 145, 0.55)';
  return 'rgba(10, 28, 58, 0.78)';
}

type ViewMode = 'both' | 'heat' | 'shots';
type Perspective = 'for' | 'against';

function toFiniteXY(s: ShotPoint): { x: number; y: number } | null {
  if (s.x == null || s.y == null) return null;
  const x = Number(s.x);
  const y = Number(s.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return pts.join(' ');
}

function toShotImageXY(x: number, y: number): { x: number; y: number } {
  const ix = SHOT_PAD + (x / 100) * (SHOT_W - SHOT_PAD * 2);
  const iy = SHOT_PAD + (y / Y_MAX) * (SHOT_H - SHOT_PAD * 2);
  return { x: ix, y: iy };
}

function shotsForGame(g: VizShotGame, p: Perspective): ShotPoint[] {
  return p === 'for' ? (g.shots_for ?? []) : (g.shots_against ?? []);
}

export function ShotHeatmap({
  games,
  nGames = 0,
  fallbackShotsFor,
  initialPerspective = 'for',
}: {
  games: VizShotGame[];
  nGames?: number;
  fallbackShotsFor?: VizShot[];
  initialPerspective?: Perspective;
}) {
  const [mode, setMode] = useState<ViewMode>('both');
  const [perspective, setPerspective] = useState<Perspective>(initialPerspective);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');

  const allPlayers = useMemo(() => {
    const pSet = new Set<string>();
    for (const g of games) {
      g.shots_for?.forEach((s) => s.player && pSet.add(s.player));
      g.shots_against?.forEach((s) => s.player && pSet.add(s.player));
    }
    fallbackShotsFor?.forEach((s) => s.player && pSet.add(s.player));
    return Array.from(pSet).sort();
  }, [games, fallbackShotsFor]);

  const gameId = '__season__';
  const rinkImage = DEFAULT_RINK_IMAGE;
  const shotOpacity = DEFAULT_CALIBRATION.opacity;
  const shotScale = DEFAULT_CALIBRATION.scale;
  const shotRotationDeg = DEFAULT_CALIBRATION.rotationDeg;
  const shotFlipX = DEFAULT_CALIBRATION.flipX;
  const shotFlipY = DEFAULT_CALIBRATION.flipY;
  const centerX = VB_W / 2 + DEFAULT_CALIBRATION.xOffsetPx;
  const centerY = VB_H / 2 + DEFAULT_CALIBRATION.yOffsetPx;
  const scaleX = (shotFlipX ? -1 : 1) * shotScale;
  const scaleY = (shotFlipY ? -1 : 1) * shotScale;

  const effectiveGames = useMemo(() => {
    if (games.length > 0) return games;
    if (fallbackShotsFor?.length) {
      return [
        {
          game_id: '__legacy__',
          opponent: null,
          date: null,
          shots_for: fallbackShotsFor as VizShot[],
          shots_against: [],
        },
      ];
    }
    return [];
  }, [games, fallbackShotsFor]);

  const legacyOnly = games.length === 0 && !!fallbackShotsFor?.length;
  const seasonDivisor = legacyOnly
    ? Math.max(1, nGames || 1)
    : Math.max(1, effectiveGames.length);

  const selectedGames = useMemo(() => {
    if (gameId === '__season__') return effectiveGames;
    return effectiveGames.filter((g) => g.game_id === gameId);
  }, [effectiveGames]);

  const heatDivisor =
    gameId === '__season__' ? seasonDivisor : Math.max(1, selectedGames.length);

  const { bins, maxC, pts } = useMemo(() => {
    const b = Array.from({ length: NY }, () => Array(NX).fill(0));
    const scatter: { x: number; y: number }[] = [];

    for (const g of selectedGames) {
      const list = legacyOnly ? (g.shots_for ?? []) : shotsForGame(g, perspective);
      const filtered = selectedPlayer === 'all' 
        ? list 
        : list.filter(s => s.player === selectedPlayer);

      for (const s of filtered) {
        const xy = toFiniteXY(s);
        if (!xy) continue;
        const p = toShotImageXY(xy.x, xy.y);
        scatter.push(p);
        const xi = Math.min(NX - 1, Math.max(0, Math.floor((p.x / SHOT_W) * NX)));
        const yi = Math.min(NY - 1, Math.max(0, Math.floor((p.y / SHOT_H) * NY)));
        b[yi][xi] += 1;
      }
    }

    for (let yi = 0; yi < NY; yi++) {
      for (let xi = 0; xi < NX; xi++) {
        b[yi][xi] /= heatDivisor;
      }
    }

    let mC = 0;
    for (let yi = 0; yi < NY; yi++) {
      for (let xi = 0; xi < NX; xi++) {
        mC = Math.max(mC, b[yi][xi]);
      }
    }
    return { bins: b, maxC: mC, pts: scatter };
  }, [selectedGames, perspective, heatDivisor, legacyOnly, selectedPlayer]);

  const cellW = SHOT_W / NX;
  const cellH = SHOT_H / NY;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-pwhl-cream p-1 rounded-full border border-pwhl-border shadow-inner">
            {(
              [
                ['for', 'For'],
                ['against', 'Against'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPerspective(k)}
                className={`font-semibold px-4 py-1 rounded-full transition-all ${
                  perspective === k
                    ? 'bg-pwhl-navy text-white shadow-md'
                    : 'text-pwhl-muted hover:text-pwhl-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border border-pwhl-border rounded-full p-1 bg-white shadow-inner">
            {(
              [
                ['both', 'Both'],
                ['heat', 'Heat'],
                ['shots', 'Plot'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`font-semibold px-3 py-1 rounded-full transition-all ${
                  mode === k
                    ? 'bg-pwhl-blue text-white shadow-sm'
                    : 'text-pwhl-muted hover:text-pwhl-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Filter</label>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="text-xs bg-pwhl-cream border border-pwhl-border rounded-lg px-3 py-1.5 focus:border-torrent-teal outline-none font-medium min-w-[140px]"
          >
            <option value="all">All players</option>
            {allPlayers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative rounded-xl border border-pwhl-border/60 bg-transparent overflow-hidden mx-auto max-w-full">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Shot map and heat map"
        >
          <defs>
            <filter id="heatBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.05" />
            </filter>
          </defs>

          {rinkImage ? (
            <image
              href={rinkImage}
              x={0}
              y={0}
              width={VB_W}
              height={VB_H}
              preserveAspectRatio="xMidYMid meet"
              opacity={0.95}
            />
          ) : null}

          <g transform={`translate(${centerX} ${centerY}) rotate(${shotRotationDeg}) scale(${scaleX} ${scaleY})`}>
            {(mode === 'heat' || mode === 'both') && (
              <g filter="url(#heatBlur)">
                {bins.map((row, yi) =>
                  row.map((c, xi) => {
                    const t = maxC > 0 ? c / maxC : 0;
                    return (
                      <rect
                        key={`h-${xi}-${yi}`}
                        x={xi * cellW - SHOT_W / 2}
                        y={yi * cellH - SHOT_H / 2}
                        width={cellW + 0.02}
                        height={cellH + 0.02}
                        fill={heatFill(t)}
                      />
                    );
                  }),
                )}
              </g>
            )}

            {(mode === 'shots' || mode === 'both') &&
              pts.slice(0, 3000).map((p, i) => {
                const cx = p.x - SHOT_W / 2;
                const cy = p.y - SHOT_H / 2;
                const r = mode === 'both' ? 1.8 : 2.4;
                return (
                  <polygon
                    key={`p-${i}`}
                    points={hexPoints(cx, cy, r)}
                    fill={`rgba(0,163,173,${Math.max(0.2, shotOpacity)})`}
                    stroke="rgba(0,0,0,0.78)"
                    strokeWidth={0.45}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
          </g>
        </svg>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-pwhl-muted font-bold uppercase tracking-wider">Density scale</span>
          <div className="flex items-center gap-0.5 border border-pwhl-border p-0.5 rounded-sm bg-white shadow-sm">
            <div className="w-6 h-1.5 rounded-sm" style={{ backgroundColor: 'rgba(227, 238, 245, 0.45)' }} />
            <div className="w-6 h-1.5 rounded-sm" style={{ backgroundColor: 'rgba(0, 163, 173, 0.55)' }} />
            <div className="w-6 h-1.5 rounded-sm" style={{ backgroundColor: 'rgba(29, 79, 145, 0.7)' }} />
            <div className="w-6 h-1.5 rounded-sm" style={{ backgroundColor: 'rgba(10, 28, 58, 0.9)' }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('save')}
            className="flex items-center gap-2 px-3 py-1.5 bg-pwhl-navy text-white text-[11px] font-bold rounded-lg hover:opacity-90 shadow-sm transition-all"
          >
            <Download size={14} />
            Export Data PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport('bloburl')}
            className="flex items-center gap-2 px-3 py-1.5 bg-pwhl-surface border border-pwhl-border text-pwhl-navy text-[11px] font-bold rounded-lg hover:bg-pwhl-surface-hover shadow-sm transition-all"
          >
            <Eye size={14} />
            Preview
          </button>
        </div>
      </div>
    </div>
  );

  async function handleExport(output: 'save' | 'bloburl') {
    const title = `Shot Analysis: ${selectedPlayer === 'all' ? 'Team' : selectedPlayer}`;
    const subtitle = `Perspective: ${perspective === 'for' ? 'Offensive' : 'Defensive (Against)'}`;
    
    // Simple summary for the PDF
    const summary = [
      `PLAYER: ${selectedPlayer === 'all' ? 'ENTIRE TEAM' : selectedPlayer}`,
      `REPORT: ${perspective === 'for' ? 'Shots Generated (Offensive)' : 'Shots Faced (On-Ice/Goalie)'}`,
      `DATE: ${new Date().toLocaleDateString()}`,
      '',
      '--- METRICS ---',
      `Volume: ${pts.length} shots recorded`,
      `Density Cluster x: [${(cellW * NX / 2).toFixed(0)}] units`,
      `Density Cluster y: [${(cellH * NY / 2).toFixed(0)}] units`,
      '',
      '--- POSITIONING SUMMARY ---',
      selectedPlayer === 'all' 
        ? 'Team-wide shot distribution across all active periods.'
        : `Primary shooting/defensive zones scoped to ${selectedPlayer}'s on-ice presence.`,
      '',
      'This report summarizes the spatial data visualized in the Seattle Torrent Analytics Hub.',
    ].join('\n');

    const filename = `Torrent_ShotReport_${selectedPlayer.replace(/\s+/g, '_')}.pdf`;
    const url = await buildBrandedPdf({ title, subtitle, body: summary, filename, output });
    if (output === 'bloburl' && url) {
      window.open(url, '_blank');
    }
  }
}
