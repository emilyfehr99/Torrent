import React, { useMemo, useState } from 'react';

export type PassEdge = { from: string; to: string; n: number };

export function PassingNetwork({ edges }: { edges: PassEdge[] }) {
  const [minN, setMinN] = useState(2);

  const { nodes, drawn, maxW } = useMemo(() => {
    const filt = edges.filter((e) => e.n >= minN).slice(0, 120);
    const ns = new Set<string>();
    filt.forEach((e) => {
      ns.add(e.from);
      ns.add(e.to);
    });
    const nodeList = Array.from(ns);
    const maxW = Math.max(1, ...filt.map((e) => e.n));
    return { nodes: nodeList, drawn: filt, maxW };
  }, [edges, minN]);

  const sz = 420;
  const cx = sz / 2;
  const cy = sz / 2;
  const R = sz * 0.36;

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(1, nodes.length) - Math.PI / 2;
      m.set(n, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
    });
    return m;
  }, [nodes, cx, cy, R]);

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-pwhl-muted text-center py-12">No pass pairs at this threshold.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-pwhl-navy">
        <label className="flex items-center gap-2 font-mono">
          <span className="text-pwhl-muted">Min link weight</span>
          <input
            type="range"
            min={1}
            max={12}
            value={minN}
            onChange={(e) => setMinN(Number(e.target.value))}
            className="accent-torrent-teal"
          />
          <span className="w-6">{minN}</span>
        </label>
      </div>
      <div className="rounded-lg border border-pwhl-border bg-pwhl-cream overflow-hidden">
        <svg viewBox={`0 0 ${sz} ${sz}`} className="w-full max-h-[420px] block" role="img" aria-label="Passing network">
          {drawn.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const w = 0.6 + (4 * e.n) / maxW;
            const opacity = 0.15 + (0.55 * e.n) / maxW;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#1D4F91"
                strokeWidth={w}
                strokeOpacity={opacity}
              />
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n);
            if (!p) return null;
            const short = n.length > 18 ? `${n.slice(0, 16)}…` : n;
            return (
              <g key={n}>
                <circle cx={p.x} cy={p.y} r={7} fill="#FFFFFF" stroke="#1D4F91" strokeWidth={1.2} />
                <text
                  x={p.x}
                  y={p.y + 22}
                  textAnchor="middle"
                  className="fill-pwhl-navy text-[7px]"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-[10px] text-pwhl-muted font-mono px-1">
        Edges: pass events followed by same-team touch (~top links by count). Thickness = volume.
      </p>
    </div>
  );
}
