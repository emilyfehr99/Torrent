import React from 'react';
import type { HubRow } from '../types/hub';

export function HubDataTable({
  rows,
  emptyHint = 'No rows.',
}: {
  rows: HubRow[];
  emptyHint?: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-pwhl-muted">{emptyHint}</p>;
  }
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto border border-pwhl-border rounded-lg">
      <table className="w-full text-xs text-left font-mono">
        <thead className="text-[10px] text-pwhl-muted uppercase bg-pwhl-cream sticky top-0 z-[1]">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-2 py-2 font-bold whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-pwhl-border text-pwhl-navy">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-pwhl-surface-hover">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1.5 whitespace-nowrap max-w-[280px] truncate" title={String(row[c] ?? '')}>
                  {row[c] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
