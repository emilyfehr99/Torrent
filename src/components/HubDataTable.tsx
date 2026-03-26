import React, { useMemo, useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import type { HubRow } from '../types/hub';

function formatTableCell(col: string, val: unknown) {
  if (val === '' || val === null || val === undefined) return '—';
  
  // Win/Loss icons
  if (col.toLowerCase() === 'win') {
    const w = Number(val);
    if (w >= 1) return <Check className="inline text-emerald-600" size={16} strokeWidth={3} />;
    if (w <= 0) return <X className="inline text-red-600/80" size={16} strokeWidth={3} />;
  }

  // Percentages
  if (col.includes('%')) {
    const n = Number(val);
    if (Number.isFinite(n)) return `${n.toFixed(0)}%`;
  }

  // Rounded numbers
  if (typeof val === 'number') {
    if (Math.abs(val - Math.round(val)) < 1e-6) return String(Math.round(val));
    return val.toFixed(col.toLowerCase().includes('xg') ? 3 : 2);
  }

  return String(val);
}

export function HubDataTable({
  rows,
  emptyHint = 'No rows.',
}: {
  rows: HubRow[];
  emptyHint?: string;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!rows.length) {
    return <p className="text-sm text-pwhl-muted">{emptyHint}</p>;
  }

  const cols = Object.keys(rows[0]).filter(c => c !== 'date' || c === 'date'); // Keep everything for now

  const filtered = useMemo(() => {
    let rs = rows.filter((r) =>
      Object.keys(r).some((c) => String(r[c] ?? '').toLowerCase().includes(search.toLowerCase())),
    );

    if (sortKey) {
      rs = [...rs].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        const sa = String(va ?? '');
        const sb = String(vb ?? '');
        return sortDir === 'asc' ? sa.localeCompare(sb, undefined, { numeric: true }) : sb.localeCompare(sa, undefined, { numeric: true });
      });
    }
    return rs;
  }, [rows, search, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pwhl-muted" size={14} />
        <input
          type="text"
          placeholder="Search rows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 bg-pwhl-cream/30 border border-pwhl-border rounded-lg text-xs outline-none focus:border-torrent-teal transition-colors"
        />
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto border border-pwhl-border rounded-lg shadow-sm">
        <table className="w-full text-xs text-left font-mono">
          <thead className="text-[10px] text-pwhl-muted uppercase bg-pwhl-cream sticky top-0 z-[1]">
            <tr>
              {Object.keys(rows[0]).map((c) => (
                <th
                  key={c}
                  className="px-2 py-2 font-bold whitespace-nowrap cursor-pointer hover:bg-pwhl-surface-hover select-none transition-colors"
                  onClick={() => handleSort(c)}
                >
                  <div className="flex items-center gap-1">
                    {c}
                    {sortKey === c && (
                      <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pwhl-border text-pwhl-navy bg-white">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-pwhl-surface-hover">
                {Object.keys(r).map((c) => (
                  <td key={c} className="px-2 py-1.5 whitespace-nowrap max-w-[280px] truncate" title={String(r[c] ?? '')}>
                    {formatTableCell(c, r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-pwhl-muted italic">
                  No matching results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
