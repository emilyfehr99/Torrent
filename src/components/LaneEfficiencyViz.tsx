import React from 'react';
import { cn } from '../lib/utils';

interface LaneData {
  Lane: string;
  Total_Entries: number;
  Entries_w_Shot: number;
  Entry_Efficiency: number;
  Total_Breakouts: number;
  Breakouts_w_Entry: number;
  Breakout_Efficiency: number;
}

interface Props {
  data: LaneData[];
  type: 'entry' | 'breakout';
  title: string;
}

/**
 * Returns a CSS HSL color for the efficiency percentage.
 * Red (0%) -> White (50%) -> Green (100%)
 */
function getEfficiencyColor(pct: number) {
  if (pct === 50) return 'white';
  if (pct < 50) {
    // Red to White (Red is hue 0, Saturation 100, Lightness varies)
    // At 0%, we want fully red: hsl(0, 100%, 50%)
    // At 50%, we want white: hsl(0, 0%, 100%)
    const lightness = 50 + pct; // 50 at 0%, 100 at 50%
    const saturation = 100 - (pct * 2); // 100 at 0%, 0 at 50%
    return `hsl(0, ${saturation}%, ${lightness}%)`;
  } else {
    // White to Green (Green is hue 120)
    // At 50%, we want white: hsl(120, 0%, 100%)
    // At 100%, we want fully green: hsl(120, 100%, 40%)
    const p = (pct - 50) * 2; // 0 at 50%, 100 at 100%
    const lightness = 100 - (p * 0.6); // 100 at 50%, 40 at 100%
    const saturation = p; // 0 at 50%, 100 at 100%
    return `hsl(120, ${saturation}%, ${lightness}%)`;
  }
}

export function LaneEfficiencyViz({ data, type, title }: Props) {
  // Sort data to ensure Top Lane is at the top visually
  const lanes = [...data].reverse(); // Assumes data is Bottom, Middle, Top

  return (
    <div className="bg-pwhl-surface border border-pwhl-border rounded-xl shadow-sm overflow-hidden">
      <div className="bg-torrent-teal px-4 py-2 flex items-center justify-between border-b border-pwhl-border">
        <h4 className="text-torrent-cream font-serif font-bold text-sm uppercase tracking-wider">{title}</h4>
        <div className="text-[10px] font-mono text-torrent-cream/80 font-bold">BY LANE</div>
      </div>
      
      <div className="p-4 bg-pwhl-cream/30">
        <div className="relative aspect-[2/1] bg-white rounded-lg border border-pwhl-border overflow-hidden shadow-inner flex flex-col">
          {lanes.map((lane, idx) => {
            const pct = type === 'entry' ? lane.Entry_Efficiency : lane.Breakout_Efficiency;
            const total = type === 'entry' ? lane.Total_Entries : lane.Total_Breakouts;
            const success = type === 'entry' ? lane.Entries_w_Shot : lane.Breakouts_w_Entry;
            const bgColor = getEfficiencyColor(pct);
            
            return (
              <div 
                key={lane.Lane} 
                className={cn(
                  "flex-1 flex flex-col justify-center px-6 relative transition-colors duration-500 border-pwhl-border/30",
                  idx !== lanes.length - 1 && "border-b"
                )}
                style={{ backgroundColor: bgColor }}
              >
                <div className="flex justify-between items-center z-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-tighter text-pwhl-navy/40">
                      {lane.Lane}
                    </span>
                    <span className="text-xl font-serif font-black text-pwhl-navy tabular-nums italic">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="text-right flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] text-pwhl-muted uppercase font-bold tracking-widest">Total</span>
                      <span className="font-mono text-xs font-bold text-pwhl-navy">{total}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] text-pwhl-muted uppercase font-bold tracking-widest">
                        {type === 'entry' ? 'With Shot' : 'With Entry'}
                      </span>
                      <span className="font-mono text-xs font-bold text-torrent-teal">{success}</span>
                    </div>
                  </div>
                </div>
                
                {/* Subtle lane label backdrop */}
                <div className="absolute inset-x-0 inset-y-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
                  <span className="text-6xl font-black italic uppercase text-pwhl-navy transform -rotate-2 select-none">
                    {lane.Lane.split(' ')[0]}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Rink visual overlays (crease/lines) */}
          <div className="absolute inset-y-0 left-0 w-2 bg-pwhl-accent/20 border-r border-pwhl-accent/30" />
          <div className="absolute inset-y-0 right-0 w-2 bg-pwhl-blue/20 border-l border-pwhl-blue/30" />
        </div>
        
        <div className="mt-3 flex justify-between items-center text-[10px] text-pwhl-muted font-medium">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-hsl(0, 100%, 50%)" style={{ backgroundColor: 'hsl(0, 50%, 80%)' }} />
            <span>Low Efficiency</span>
          </div>
          <div className="font-mono italic">
            N={lanes.reduce((acc, l) => acc + (type === 'entry' ? l.Total_Entries : l.Total_Breakouts), 0)} events analyzed
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(120, 50%, 60%)' }} />
            <span>High Efficiency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
