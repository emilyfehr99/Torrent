import React from 'react';
import { Book } from 'lucide-react';

export function Methodology() {
  const metrics = [
    ['Scoring Chances', 'Shots on goal + slot-pass chances.'],
    ['Zone Entries', 'Carry-ins + pass entries + dump-in entries.'],
    ['Carry-in%', 'Carry-ins divided by total zone entries.'],
    ['Possession Exit %', 'Controlled breakouts divided by all exits.'],
    ['Forecheck Recoveries', 'Puck recoveries in offensive zone.'],
    ['NZ Turnovers', 'Puck losses in neutral zone.'],
    ['Entry Denials', 'Failed entries at offensive blue line.'],
    ['GameScore', 'Tracking composite from goals, assists, shots, entries, and battle impacts.'],
    ['xG/60 est', 'Shot-and-chance based expected-goals estimate per 60.'],
    ['Corsi %', 'CF/(CF+CA) using shot attempts: shots + blocks + misses.'],
    ['xGF%', 'Unit-level expected goals share proxy (0-100).'],
    ['SOG%', 'Unit-level shots-on-goal share proxy (0-100).'],
  ];

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
