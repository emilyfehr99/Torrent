import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Zap, Shield, Target, Award, Info, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useHubData } from '../context/HubDataContext';

type Player = {
  Player: string;
  Pos: string;
  Archetype: string;
  GameScore: number;
  'Offense Score': number;
  'Defense Score': number;
  [key: string]: any;
};

type LineupSlot = {
  id: string;
  player: Player | null;
  posLabel: string;
};

const ARCHETYPE_ICONS: Record<string, any> = {
  'Sniper': Target,
  'Playmaker': Zap,
  'Power Forward': Shield,
  'Two-Way F': Users,
  'Puck-Mover': Award,
  'Shutdown': Shield,
  'Two-Way D': Users,
};

const ARCHETYPE_COLORS: Record<string, string> = {
  'Sniper': 'text-torrent-red bg-torrent-red/10 border-torrent-red/30',
  'Playmaker': 'text-torrent-teal bg-torrent-teal/10 border-torrent-teal/30',
  'Power Forward': 'text-torrent-navy bg-torrent-navy/10 border-torrent-navy/30',
  'Puck-Mover': 'text-pwhl-blue bg-pwhl-blue/10 border-pwhl-blue/30',
  'Shutdown': 'text-pwhl-navy bg-pwhl-navy/10 border-pwhl-navy/30',
};

export default function LineupOptimizer() {
  const { data } = useHubData();
  const rawPlayers = (data?.player_season as Player[]) || [];
  
  // Initialize slots
  const [forwardLines, setForwardLines] = useState<LineupSlot[][]>([
    [{ id: 'L1-LW', player: null, posLabel: 'LW' }, { id: 'L1-C', player: null, posLabel: 'C' }, { id: 'L1-RW', player: null, posLabel: 'RW' }],
    [{ id: 'L2-LW', player: null, posLabel: 'LW' }, { id: 'L2-C', player: null, posLabel: 'C' }, { id: 'L2-RW', player: null, posLabel: 'RW' }],
    [{ id: 'L3-LW', player: null, posLabel: 'LW' }, { id: 'L3-C', player: null, posLabel: 'C' }, { id: 'L3-RW', player: null, posLabel: 'RW' }],
  ]);

  const [defensePairs, setDefensePairs] = useState<LineupSlot[][]>([
    [{ id: 'D1-L', player: null, posLabel: 'LD' }, { id: 'D1-R', player: null, posLabel: 'RD' }],
    [{ id: 'D2-L', player: null, posLabel: 'LD' }, { id: 'D2-R', player: null, posLabel: 'RD' }],
  ]);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Filter out players already in the lineup
  const usedPlayerNames = useMemo(() => {
    const names = new Set<string>();
    forwardLines.flat().forEach(s => s.player && names.add(s.player.Player));
    defensePairs.flat().forEach(s => s.player && names.add(s.player.Player));
    return names;
  }, [forwardLines, defensePairs]);

  const rosterPool = useMemo(() => 
    rawPlayers.filter(p => !usedPlayerNames.has(p.Player))
    .sort((a, b) => (b.GameScore || 0) - (a.GameScore || 0)),
  [rawPlayers, usedPlayerNames]);

  const handleSlotClick = (rowIdx: number, slotIdx: number, type: 'F' | 'D') => {
    if (selectedPlayer) {
      if (type === 'F') {
        const newLines = [...forwardLines];
        newLines[rowIdx][slotIdx].player = selectedPlayer;
        setForwardLines(newLines);
      } else {
        const newPairs = [...defensePairs];
        newPairs[rowIdx][slotIdx].player = selectedPlayer;
        setDefensePairs(newPairs);
      }
      setSelectedPlayer(null);
    } else {
      // Remove player if clicking a filled slot
      if (type === 'F') {
        const newLines = [...forwardLines];
        newLines[rowIdx][slotIdx].player = null;
        setForwardLines(newLines);
      } else {
        const newPairs = [...defensePairs];
        newPairs[rowIdx][slotIdx].player = null;
        setDefensePairs(newPairs);
      }
    }
  };

  const getLineChemistry = (line: LineupSlot[]) => {
    const players = line.map(s => s.player).filter(Boolean) as Player[];
    if (players.length < 2) return { score: 0, label: 'Incomplete', color: 'text-pwhl-muted' };
    
    let score = 0;
    const archs = players.map(p => p.Archetype);
    
    // Playmaker + Sniper bonus
    if (archs.includes('Playmaker') && archs.includes('Sniper')) score += 40;
    // Power Forward + Sniper/Playmaker bonus
    if (archs.includes('Power Forward') && (archs.includes('Sniper') || archs.includes('Playmaker'))) score += 20;
    
    // Balanced Line Bonus
    if (new Set(archs).size === archs.length && players.length === 3) score += 20;

    // Defense: Puck-Mover + Shutdown bonus
    if (archs.includes('Puck-Mover') && archs.includes('Shutdown')) score += 50;

    if (score >= 60) return { score, label: 'Elite Synergy', color: 'text-torrent-teal' };
    if (score >= 30) return { score, label: 'Modest Chemistry', color: 'text-pwhl-blue' };
    return { score, label: 'Redundant Profile', color: 'text-torrent-orange' };
  };

  const autoOptimize = () => {
    // Basic greedy optimization
    const fwds = rawPlayers.filter(p => p.Pos !== 'D').sort((a,b) => b.GameScore - a.GameScore);
    const defs = rawPlayers.filter(p => p.Pos === 'D').sort((a,b) => b.GameScore - a.GameScore);
    
    const newLines = forwardLines.map((line, i) => 
      line.map((slot, j) => ({ ...slot, player: fwds[i * 3 + j] || null }))
    );
    const newPairs = defensePairs.map((pair, i) => 
      pair.map((slot, j) => ({ ...slot, player: defs[i * 2 + j] || null }))
    );
    
    setForwardLines(newLines);
    setDefensePairs(newPairs);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 h-full min-h-[600px]">
      {/* Roster Pool */}
      <div className="lg:w-1/3 bg-white border border-pwhl-border rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-pwhl-border bg-pwhl-surface flex justify-between items-center">
          <div>
            <h3 className="font-serif font-bold text-lg text-pwhl-navy">Roster Pool</h3>
            <p className="text-xs text-pwhl-muted">Select a player to slot them</p>
          </div>
          <button 
            onClick={autoOptimize}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pwhl-navy text-white rounded-md text-xs font-semibold hover:bg-pwhl-blue transition-colors"
          >
            <RefreshCw size={14} />
            Auto-Fill
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {rosterPool.map(player => (
            <motion.div
              layoutId={player.Player}
              key={player.Player}
              onClick={() => setSelectedPlayer(player === selectedPlayer ? null : player)}
              className={cn(
                "p-3 rounded-lg border transition-all cursor-pointer group flex items-center justify-between",
                selectedPlayer === player 
                  ? "border-pwhl-blue bg-pwhl-blue/5 ring-1 ring-pwhl-blue" 
                  : "border-pwhl-border hover:border-pwhl-blue bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center",
                  ARCHETYPE_COLORS[player.Archetype] || 'text-pwhl-muted bg-pwhl-cream border-pwhl-border'
                )}>
                  {React.createElement(ARCHETYPE_ICONS[player.Archetype] || Users, { size: 16 })}
                </div>
                <div>
                  <div className="text-sm font-bold text-pwhl-navy">{player.Player}</div>
                  <div className="text-[10px] text-pwhl-muted font-mono">{player.Archetype} · GS: {player.GameScore?.toFixed(1)}</div>
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-pwhl-muted group-hover:text-pwhl-blue">{player.Pos}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lineup Canvas */}
      <div className="lg:w-2/3 flex flex-col gap-6">
        {/* Forward Lines */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold text-pwhl-muted uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-torrent-orange" />
              Forward Trios
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {forwardLines.map((line, rowIdx) => (
              <div key={`line-${rowIdx}`} className="bg-pwhl-cream/40 border border-pwhl-border rounded-xl p-4 relative">
                <div className="absolute top-2 right-4 flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", getLineChemistry(line).color)}>
                    {getLineChemistry(line).label}
                  </span>
                  <div className="w-16 h-1 bg-pwhl-border rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", getLineChemistry(line).color.replace('text', 'bg'))}
                      style={{ width: `${getLineChemistry(line).score}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {line.map((slot, slotIdx) => (
                    <motion.div
                      key={slot.id}
                      onClick={() => handleSlotClick(rowIdx, slotIdx, 'F')}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer relative",
                        slot.player 
                          ? "border-pwhl-border border-solid bg-white shadow-sm" 
                          : selectedPlayer?.Pos !== 'D' && selectedPlayer 
                            ? "border-pwhl-blue bg-pwhl-blue/5" 
                            : "border-pwhl-border/50 bg-transparent hover:border-pwhl-border"
                      )}
                    >
                      {slot.player ? (
                        <>
                          <div className={cn(
                            "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                            ARCHETYPE_COLORS[slot.player.Archetype] || 'bg-pwhl-cream text-pwhl-muted'
                          )}>
                            {slot.player.Archetype}
                          </div>
                          <div className="text-sm font-bold text-pwhl-navy text-center px-2">{slot.player.Player}</div>
                          <div className="text-[10px] text-pwhl-muted font-mono">GS: {slot.player.GameScore?.toFixed(1)}</div>
                        </>
                      ) : (
                        <div className="text-sm font-bold text-pwhl-border">{slot.posLabel}</div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Defense Pairs */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold text-pwhl-muted uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} className="text-pwhl-blue" />
              Defensive Pairings
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {defensePairs.map((pair, rowIdx) => (
              <div key={`pair-${rowIdx}`} className="bg-pwhl-cream/40 border border-pwhl-border rounded-xl p-4 relative">
                 <div className="absolute top-2 right-4 flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", getLineChemistry(pair).color)}>
                    {getLineChemistry(pair).label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {pair.map((slot, slotIdx) => (
                    <motion.div
                      key={slot.id}
                      onClick={() => handleSlotClick(rowIdx, slotIdx, 'D')}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer relative",
                        slot.player 
                          ? "border-pwhl-border border-solid bg-white shadow-sm" 
                          : selectedPlayer?.Pos === 'D' && selectedPlayer 
                            ? "border-pwhl-blue bg-pwhl-blue/5" 
                            : "border-pwhl-border/50 bg-transparent hover:border-pwhl-border"
                      )}
                    >
                      {slot.player ? (
                        <>
                           <div className={cn(
                            "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                            ARCHETYPE_COLORS[slot.player.Archetype] || 'bg-pwhl-cream text-pwhl-muted'
                          )}>
                            {slot.player.Archetype}
                          </div>
                          <div className="text-sm font-bold text-pwhl-navy text-center px-2">{slot.player.Player}</div>
                          <div className="text-[10px] text-pwhl-muted font-mono">GS: {slot.player.GameScore?.toFixed(1)}</div>
                        </>
                      ) : (
                        <div className="text-sm font-bold text-pwhl-border">{slot.posLabel}</div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
