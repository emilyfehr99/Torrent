import React, { useMemo, useState } from 'react';
import type { VizShot, VizShotGame } from '../types/hub';

export type ShotPoint = { x?: number | null; y?: number | null; player?: string | null };

const Y_MAX = 42.5;
const NX = 40;
const NY = 18;
const PAD = 3;
const VB_W = 100 + PAD * 2;
const VB_H = Y_MAX + PAD * 2;

/** Rink x in hub data: DZ / NZ / OZ split (see metrics_core.py). */
const OZ_X0 = 38.1;
const OZ_X1 = 100;
const DEF_ZOOM_X1 = 62;

function heatFill(t: number): string {
  if (t <= 0) return 'rgba(227, 238, 245, 0.15)';
  if (t < 0.2) return 'rgba(0, 179, 201, 0.18)';
  if (t < 0.45) return 'rgba(0, 163, 173, 0.42)';
  if (t < 0.7) return 'rgba(29, 79, 145, 0.55)';
  return 'rgba(10, 28, 58, 0.78)';
}

type ViewMode = 'both' | 'heat' | 'shots';
type Perspective = 'for' | 'against';
type IceMode = 'full' | 'zoom';

function toFiniteXY(s: ShotPoint): { x: number; y: number } | null {
  if (s.x == null || s.y == null) return null;
  const x = Number(s.x);
  const y = Number(s.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** Map rink x to 0–100 display x; return null if outside current ice window. */
function rinkToDisplayX(
  x: number,
  perspective: Perspective,
  ice: IceMode,
): number | null {
  if (ice === 'full') {
    if (x < 0 || x > 100) return null;
    return x;
  }
  if (perspective === 'for') {
    if (x < OZ_X0 || x > OZ_X1) return null;
    return ((x - OZ_X0) / (OZ_X1 - OZ_X0)) * 100;
  }
  if (x < 0 || x > DEF_ZOOM_X1) return null;
  return (x / DEF_ZOOM_X1) * 100;
}

function shotsForGame(g: VizShotGame, p: Perspective): ShotPoint[] {
  return p === 'for' ? (g.shots_for ?? []) : (g.shots_against ?? []);
}

export function ShotHeatmap({
  games,
  nGames = 0,
  fallbackShotsFor,
}: {
  games: VizShotGame[];
  /** Season game count from hub (for legacy flat shots). */
  nGames?: number;
  /** When API has no viz_shot_games yet: still show “for” map from viz_shots. */
  fallbackShotsFor?: VizShot[];
}) {
  const [gameId, setGameId] = useState<string>('__season__');
  const [perspective, setPerspective] = useState<Perspective>('for');
  const [ice, setIce] = useState<IceMode>('zoom');
  const [mode, setMode] = useState<ViewMode>('both');

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
  }, [effectiveGames, gameId]);

  const heatDivisor =
    gameId === '__season__' ? seasonDivisor : Math.max(1, selectedGames.length);

  const { bins, maxC, pts } = useMemo(() => {
    const b = Array.from({ length: NY }, () => Array(NX).fill(0));
    const scatter: { x: number; y: number }[] = [];

    for (const g of selectedGames) {
      const list = legacyOnly ? (g.shots_for ?? []) : shotsForGame(g, perspective);
      for (const s of list) {
        const xy = toFiniteXY(s);
        if (!xy) continue;
        const dx = rinkToDisplayX(xy.x, perspective, ice);
        if (dx == null) continue;
        scatter.push({ x: dx, y: xy.y });
        const xi = Math.min(NX - 1, Math.max(0, Math.floor((dx / 100) * NX)));
        const yi = Math.min(NY - 1, Math.max(0, Math.floor((xy.y / Y_MAX) * NY)));
        b[yi][xi] += 1;
      }
    }

    for (let yi = 0; yi < NY; yi++) {
      for (let xi = 0; xi < NX; xi++) {
        b[yi][xi] /= heatDivisor;
      }
    }

    let maxC = 0;
    for (let yi = 0; yi < NY; yi++) {
      for (let xi = 0; xi < NX; xi++) {
        maxC = Math.max(maxC, b[yi][xi]);
      }
    }
    return { bins: b, maxC, pts: scatter };
  }, [selectedGames, perspective, ice, heatDivisor, legacyOnly]);

  const cellW = 100 / NX;
  const cellH = Y_MAX / NY;
  const toSX = (x: number) => PAD + x;
  const toSY = (y: number) => PAD + y;

  const gameOptions = useMemo(() => {
    return effectiveGames
      .filter((g) => g.game_id !== '__legacy__')
      .map((g) => ({
        id: g.game_id,
        label: [g.date, g.opponent].filter(Boolean).join(' vs ') || g.game_id,
      }));
  }, [effectiveGames]);

  const canAgainst = !legacyOnly;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Game</span>
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          className="text-xs font-semibold border border-pwhl-border rounded-lg px-2 py-1 bg-pwhl-cream text-pwhl-navy min-w-[10rem] max-w-[18rem]"
        >
          <option value="__season__">All games (heat = avg / game)</option>
          {gameOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Shots</span>
        {(
          [
            ['for', 'For (team)'],
            ['against', 'Against (opp)'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            disabled={k === 'against' && !canAgainst}
            onClick={() => setPerspective(k)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              perspective === k
                ? 'bg-pwhl-navy text-white border-pwhl-navy'
                : 'bg-pwhl-cream text-pwhl-muted border-pwhl-border hover:border-torrent-teal'
            } ${k === 'against' && !canAgainst ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Ice</span>
        {(
          [
            ['zoom', perspective === 'for' ? 'Zoom: offensive zone' : 'Zoom: defensive end'],
            ['full', 'Full rink'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setIce(k)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              ice === k
                ? 'bg-pwhl-navy text-white border-pwhl-navy'
                : 'bg-pwhl-cream text-pwhl-muted border-pwhl-border hover:border-torrent-teal'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">View</span>
        {(
          [
            ['both', 'Heat + shots'],
            ['heat', 'Heat only'],
            ['shots', 'Shots only'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              mode === k
                ? 'bg-pwhl-navy text-white border-pwhl-navy'
                : 'bg-pwhl-cream text-pwhl-muted border-pwhl-border hover:border-torrent-teal'
            }`}
          >
            {label}
          </button>
        ))}
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

          <rect
            x={toSX(0)}
            y={toSY(0)}
            width={100}
            height={Y_MAX}
            rx={1.2}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={0.25}
            opacity={0.85}
          />

          {ice === 'full' ? (
            <>
              <line
                x1={toSX(50)}
                y1={toSY(0)}
                x2={toSX(50)}
                y2={toSY(Y_MAX)}
                stroke="#c8102e"
                strokeWidth={0.45}
                opacity={0.85}
              />
              <line
                x1={toSX(0)}
                y1={toSY(0)}
                x2={toSX(0)}
                y2={toSY(Y_MAX)}
                stroke="#c8102e"
                strokeWidth={0.55}
              />
              <line
                x1={toSX(100)}
                y1={toSY(0)}
                x2={toSX(100)}
                y2={toSY(Y_MAX)}
                stroke="#c8102e"
                strokeWidth={0.55}
              />
              <path
                d={`M ${toSX(4.5)} ${toSY(8)} A 6 6 0 0 1 ${toSX(4.5)} ${toSY(Y_MAX - 8)}`}
                fill="none"
                stroke="#5C6B89"
                strokeWidth={0.3}
                opacity={0.6}
              />
              <path
                d={`M ${toSX(95.5)} ${toSY(8)} A 6 6 0 0 0 ${toSX(95.5)} ${toSY(Y_MAX - 8)}`}
                fill="none"
                stroke="#5C6B89"
                strokeWidth={0.3}
                opacity={0.6}
              />
              <line
                x1={toSX(25)}
                y1={toSY(0)}
                x2={toSX(25)}
                y2={toSY(Y_MAX)}
                stroke="#1D4F91"
                strokeWidth={0.35}
                opacity={0.5}
              />
              <line
                x1={toSX(75)}
                y1={toSY(0)}
                x2={toSX(75)}
                y2={toSY(Y_MAX)}
                stroke="#1D4F91"
                strokeWidth={0.35}
                opacity={0.5}
              />
            </>
          ) : perspective === 'for' ? (
            <>
              <line
                x1={toSX(0)}
                y1={toSY(0)}
                x2={toSX(0)}
                y2={toSY(Y_MAX)}
                stroke="#1D4F91"
                strokeWidth={0.45}
                opacity={0.75}
              />
              <line
                x1={toSX(100)}
                y1={toSY(0)}
                x2={toSX(100)}
                y2={toSY(Y_MAX)}
                stroke="#c8102e"
                strokeWidth={0.55}
              />
              <path
                d={`M ${toSX(92)} ${toSY(8)} A 7 7 0 0 0 ${toSX(92)} ${toSY(Y_MAX - 8)}`}
                fill="none"
                stroke="#5C6B89"
                strokeWidth={0.32}
                opacity={0.65}
              />
            </>
          ) : (
            <>
              <line
                x1={toSX(0)}
                y1={toSY(0)}
                x2={toSX(0)}
                y2={toSY(Y_MAX)}
                stroke="#c8102e"
                strokeWidth={0.55}
              />
              <line
                x1={toSX(100)}
                y1={toSY(0)}
                x2={toSX(100)}
                y2={toSY(Y_MAX)}
                stroke="#1D4F91"
                strokeWidth={0.45}
                opacity={0.75}
              />
              <path
                d={`M ${toSX(8)} ${toSY(8)} A 7 7 0 0 1 ${toSX(8)} ${toSY(Y_MAX - 8)}`}
                fill="none"
                stroke="#5C6B89"
                strokeWidth={0.32}
                opacity={0.65}
              />
            </>
          )}

          {(mode === 'heat' || mode === 'both') && (
            <g filter="url(#heatBlur)">
              {bins.map((row, yi) =>
                row.map((c, xi) => {
                  const t = maxC > 0 ? c / maxC : 0;
                  return (
                    <rect
                      key={`h-${xi}-${yi}`}
                      x={toSX(xi * cellW)}
                      y={toSY(yi * cellH)}
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
            pts.slice(0, 2800).map((p, i) => (
              <circle
                key={`s-${i}`}
                cx={toSX((p.x / 100) * 100)}
                cy={toSY((p.y / Y_MAX) * Y_MAX)}
                r={mode === 'both' ? 0.55 : 0.85}
                fill={mode === 'both' ? 'rgba(255,255,255,0.82)' : 'rgba(29, 79, 145,0.55)'}
                stroke="rgba(10, 28, 58, 0.35)"
                strokeWidth={0.08}
              />
            ))}

          {ice === 'full' ? (
            <>
              <text
                x={toSX(2)}
                y={toSY(2.2)}
                fill="#5C6B89"
                fontSize="2.2"
                fontFamily="ui-monospace, monospace"
              >
                Def · 0
              </text>
              <text
                x={toSX(78)}
                y={toSY(2.2)}
                fill="#5C6B89"
                fontSize="2.2"
                fontFamily="ui-monospace, monospace"
              >
                Off · 100
              </text>
            </>
          ) : perspective === 'for' ? (
            <>
              <text
                x={toSX(2)}
                y={toSY(2.2)}
                fill="#5C6B89"
                fontSize="2.2"
                fontFamily="ui-monospace, monospace"
              >
                OZ blue
              </text>
              <text
                x={toSX(72)}
                y={toSY(2.2)}
                fill="#5C6B89"
                fontSize="2.2"
                fontFamily="ui-monospace, monospace"
              >
                Goal
              </text>
            </>
          ) : (
            <>
              <text
                x={toSX(2)}
                y={toSY(2.2)}
                fill="#5C6B89"
                fontSize="2.2"
                fontFamily="ui-monospace, monospace"
              >
                Goal
              </text>
              <text
                x={toSX(58)}
                y={toSY(2.2)}
                fill="#5C6B89"
                fontSize="2.2"
                fontFamily="ui-monospace, monospace"
              >
                NZ+
              </text>
            </>
          )}
        </svg>
      </div>
      <p className="text-[10px] text-pwhl-muted font-mono px-1 leading-relaxed">
        x = length (0–100), y = width (0–{Y_MAX}). Season view: heat is mean shots per game in each cell;
        single-game view uses raw counts. Zoom uses hub zone splits (~38 = NZ/OZ). Refresh hub if “Against”
        is disabled (needs viz_shot_games).
      </p>
    </div>
  );
}
