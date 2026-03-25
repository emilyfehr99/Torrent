import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

export type SortableRow = Record<string, string | number | null | undefined>;

type SortDir = 'asc' | 'desc';

function cellSortValue(v: unknown): string | number {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  if (v !== '' && !Number.isNaN(n) && String(v).trim() === String(n)) return n;
  return String(v).toLowerCase();
}

export function SortableTable({
  rows,
  columns,
  emptyHint = 'No rows.',
  initialSort,
}: {
  rows: SortableRow[];
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  emptyHint?: string;
  initialSort?: { key: string; dir: SortDir };
}) {
  const [sortKey, setSortKey] = useState(initialSort?.key ?? columns[0]?.key ?? '');
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? 'asc');

  const sorted = useMemo(() => {
    if (!rows.length || !sortKey) return rows;
    const dirMul = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = cellSortValue(a[sortKey]);
      const vb = cellSortValue(b[sortKey]);
      if (typeof va === 'number' && typeof vb === 'number') {
        if (va !== vb) return (va - vb) * dirMul;
      } else {
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        if (cmp !== 0) return cmp * dirMul;
      }
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const toggle = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (!rows.length) {
    return <p className="text-sm text-pwhl-muted">{emptyHint}</p>;
  }

  return (
    <div className="overflow-x-auto border border-pwhl-border rounded-lg">
      <table className="w-full text-xs text-left font-mono">
        <thead className="text-[10px] text-pwhl-muted uppercase bg-pwhl-cream sticky top-0 z-[1]">
          <tr>
            {columns.map((c) => {
              const active = sortKey === c.key;
              return (
                <th
                  key={c.key}
                  className={`px-2 py-2 font-bold whitespace-nowrap select-none ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className="inline-flex items-center gap-1 hover:text-pwhl-navy transition-colors w-full font-bold uppercase tracking-wider"
                  >
                    {c.label}
                    {active ? (
                      sortDir === 'asc' ? (
                        <ArrowUp size={12} className="shrink-0" />
                      ) : (
                        <ArrowDown size={12} className="shrink-0" />
                      )
                    ) : (
                      <span className="inline-block w-3 opacity-30" aria-hidden>
                        ↕
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-pwhl-border text-pwhl-navy">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-pwhl-surface-hover">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-2 py-1.5 whitespace-nowrap max-w-[min(100vw,20rem)] truncate ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  title={String(row[c.key] ?? '')}
                >
                  {row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
