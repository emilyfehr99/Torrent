import React, { useMemo } from 'react';
import { Book } from 'lucide-react';
import { useHubData } from '../context/HubDataContext';

export function Methodology() {
  const { data } = useHubData();

  const metrics = useMemo(() => {
    const defs: Record<string, string> = {
      'Scoring Chances': 'Proxy computed from slot passes + SOG + goals (static build).',
      'Expected Goals (xG)': 'Proxy iXG computed conservatively from shots/SOG/goals (static build).',
      'Zone Entries': 'Total entries tracked for Seattle (static build uses Entries action count).',
      'Carry-ins': 'Entries via stickhandling.',
      'Carry-in%': 'Carry-ins divided by total entries.',
      'Possession Exits': 'Breakouts total.',
      'Possession Exit %': 'Controlled breakouts (via pass + stickhandling) divided by all breakouts.',
      'Exit off Retrieval %': 'Controlled exits divided by DZ recoveries proxy.',
      'Entry Scoring Chance %': 'Scoring chances proxy divided by entries.',
      'Forecheck Recoveries': 'Puck recoveries in offensive zone.',
      'NZ Turnovers': 'Puck losses in neutral zone.',
      'DZ Shots': 'Shots with tracked x in DZ bin.',
      'NZ Shots': 'Shots with tracked x in NZ bin.',
      'SOG off Rush': 'Not labeled in this CSV export; reserved for rush-tagged shot pipeline.',
      'SOGA off Rush': 'Not labeled in this CSV export; reserved for rush-tagged shot-against pipeline.',
      'SOG off FC cycle': 'Not labeled in this CSV export; reserved for forecheck/cycle tagging.',
      'SOGA off FC cycle': 'Not labeled in this CSV export; reserved for forecheck/cycle tagging.',
      'SOGA off NZ Turnovers': 'Not labeled in this CSV export; reserved for NZ-turnover → chance tagging.',
      'Total GameScore': 'Team-level proxy index from chances, goals, shots, entries, and OZ recoveries.',
      'Entry Denials': 'Failed entries at offensive blue line (player/defense tables).',
      'Botched Retrievals': 'Unsuccessful DZ retrieval outcomes (player/defense tables).',
      'Retrievals w Exit': 'DZ retrievals leading to a breakout/exit.',
      'DZ Retrievals': 'Puck recoveries in DZ (player cards).',
      'Zone Exits': 'Breakout/exit attempts tracked.',
      'Exits w Possession': 'Controlled exits tracked (player cards).',
      'Failed Exits': 'Exit attempts that fail to clear with control.',
      'xG/60 est': 'Player-level per-60 proxy from xG and games played (where available).',
      'Corsi %': 'Shot attempt share proxy when attempts are available.',
      'xGF%': 'Unit-level expected goals share (if present).',
      'SOG%': 'Unit-level shots-on-goal share (if present).',
    };

    const keys = new Set<string>();
    for (const k of data?.metric_names ?? []) keys.add(String(k));
    const addRowKeys = (rows: any[] | undefined) => {
      if (!rows?.length) return;
      for (const r of rows) for (const k of Object.keys(r ?? {})) keys.add(k);
    };
    addRowKeys(data?.per_game_metrics);
    addRowKeys(data?.averages as any);
    addRowKeys(data?.player_season);
    addRowKeys(data?.defense_season);

    const sorted = [...keys].filter(Boolean).sort((a, b) => a.localeCompare(b));
    return sorted.map((name) => [name, defs[name] ?? 'Tracked metric from the hub export.'] as [string, string]);
  }, [data]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Methodology & Glossary</h2>
          <p className="text-pwhl-muted text-sm mt-1">Definitions for metrics used in this build</p>
        </div>
      </div>

      <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Book size={24} className="text-pwhl-blue" />
          <h3 className="font-serif font-bold text-xl text-pwhl-navy">Metric Definitions</h3>
        </div>
        <div className="space-y-3 text-sm">
          {metrics.map(([name, def]) => (
            <div key={name} className="flex justify-between gap-6 border-b border-pwhl-border/60 pb-2">
              <span className="font-semibold text-pwhl-navy">{name}</span>
              <span className="text-pwhl-muted text-right">{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
