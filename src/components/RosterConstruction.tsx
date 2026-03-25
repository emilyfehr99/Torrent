import React, { useState } from 'react';
import { BookOpen, Filter, UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useHubData } from '../context/HubDataContext';
import { HubDataTable } from './HubDataTable';

const freeAgents = [
  { id: 1, name: 'S. Nurse', pos: 'F', currentTeam: 'TOR', projGS: 3.8, valueIndex: 88, value: 'High', age: 29 },
  { id: 2, name: 'M. Keller', pos: 'D', currentTeam: 'BOS', projGS: 2.9, valueIndex: 76, value: 'Value', age: 27 },
  { id: 3, name: 'A. Roque', pos: 'F', currentTeam: 'MIN', projGS: 3.2, valueIndex: 71, value: 'Fair', age: 26 },
  { id: 4, name: 'E. Clark', pos: 'F', currentTeam: 'OTT', projGS: 2.1, valueIndex: 74, value: 'Value', age: 24 },
];

type RosterPanel = 'fa' | 'lineup';

export function RosterConstruction({
  onViewFullDatabase,
}: {
  /** Opens the Player database tab (full roster + season rows). */
  onViewFullDatabase?: () => void;
}) {
  const { data } = useHubData();
  const [panel, setPanel] = useState<RosterPanel>('fa');
  const [fitFor, setFitFor] = useState<string | null>(null);
  const lines = data?.line_combos_season ?? [];
  const pairs = data?.pairings_season ?? [];
  const playerCount = data?.player_season?.length ?? data?.roster?.length ?? 0;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Roster Construction</h2>
          <p className="text-pwhl-muted text-sm mt-1">
            Free agent evaluator (projected impact) · per-player value index · lineup optimizer
          </p>
        </div>
        <div className="flex gap-2 bg-pwhl-cream p-1 rounded-lg border border-pwhl-border">
          <button
            type="button"
            onClick={() => setPanel('fa')}
            className={cn(
              'px-4 py-1.5 text-sm font-semibold rounded transition-colors',
              panel === 'fa' ? 'bg-white shadow-sm text-pwhl-navy' : 'text-pwhl-muted hover:text-pwhl-navy',
            )}
          >
            Free Agents
          </button>
          <button
            type="button"
            onClick={() => setPanel('lineup')}
            className={cn(
              'px-4 py-1.5 text-sm font-semibold rounded transition-colors',
              panel === 'lineup' ? 'bg-white shadow-sm text-pwhl-navy' : 'text-pwhl-muted hover:text-pwhl-navy',
            )}
          >
            Lineup Optimizer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-pwhl-navy text-white rounded-xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h3 className="font-serif font-bold text-lg mb-1">Projected roster value</h3>
            <p className="text-xs text-white/65 mb-4 leading-relaxed">
              No public PWHL salary data — rankings use Game Score impact and a composite value index per
              player.
            </p>
            <div className="text-4xl font-mono font-bold mb-1">77</div>
            <div className="text-xs text-white/70 font-mono uppercase tracking-wider mb-4">Team value index (0–100)</div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div className="bg-pwhl-success h-2 rounded-full" style={{ width: '77%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-white/70 font-mono">
              <span>Avg player index</span>
              <span>72.4</span>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Roster slots</span>
                <span className="font-bold">19 / 23</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">High-value targets (FA board)</span>
                <span className="font-bold">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Avg proj. GS/60 (board)</span>
                <span className="font-bold">2.8</span>
              </div>
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <h3 className="font-serif font-bold text-md text-pwhl-navy mb-4">Sample Playbook</h3>
            <div className="p-4 bg-pwhl-cream rounded-lg border border-pwhl-border mb-3 cursor-pointer hover:border-pwhl-blue transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} className="text-pwhl-blue" />
                <span className="font-semibold text-sm">Seattle Off-Season Plan</span>
              </div>
              <p className="text-xs text-pwhl-muted">Recommended 2 FA targets + 1 trade to optimize transition game.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-pwhl-surface border border-pwhl-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[420px]">
          {fitFor ? (
            <div className="px-4 py-2 bg-torrent-teal/10 border-b border-torrent-teal/30 text-sm text-pwhl-navy flex justify-between items-center gap-2">
              <span>
                <strong>Simulate fit:</strong> {fitFor} — projected lineup impact uses your hub roster + GameScore
                weights (illustrative).
              </span>
              <button type="button" className="text-xs font-semibold text-pwhl-blue shrink-0 hover:underline" onClick={() => setFitFor(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
          {panel === 'fa' ? (
            <>
              <div className="p-6 border-b border-pwhl-border flex justify-between items-center bg-pwhl-surface">
                <div>
                  <h3 className="font-serif font-bold text-lg text-pwhl-navy">Free Agent Evaluator</h3>
                  <p className="text-xs text-pwhl-muted mt-1">Ranked by Projected Game Score Impact</p>
                  <p className="text-xs text-pwhl-muted mt-0.5">
                    Lineup optimizer for chemistry-based line and pair recommendations
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-pwhl-cream border border-pwhl-border rounded px-2 py-1">
                    <Filter size={14} className="text-pwhl-muted mr-2" />
                    <select className="bg-transparent text-xs outline-none text-pwhl-navy font-medium">
                      <option>All Positions</option>
                      <option>Forwards</option>
                      <option>Defense</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-pwhl-muted uppercase tracking-wider bg-pwhl-cream border-b border-pwhl-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">Player</th>
                      <th className="px-4 py-4 font-bold text-center">Age</th>
                      <th className="px-4 py-4 font-bold text-center">Pos</th>
                      <th className="px-4 py-4 font-bold text-center">24-25 Team</th>
                      <th className="px-6 py-4 font-bold text-right">Proj. Game Score/60</th>
                      <th className="px-6 py-4 font-bold text-right">Value index</th>
                      <th className="px-6 py-4 font-bold text-center">Value tier</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pwhl-border font-mono text-sm">
                    {freeAgents.map((player) => (
                      <tr key={player.id} className="hover:bg-pwhl-surface-hover transition-colors group">
                        <td className="px-6 py-4 font-sans font-semibold text-pwhl-navy flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pwhl-cream border border-pwhl-border flex items-center justify-center text-pwhl-blue">
                            <UserCircle size={20} />
                          </div>
                          {player.name}
                        </td>
                        <td className="px-4 py-4 text-center text-pwhl-muted">{player.age}</td>
                        <td className="px-4 py-4 text-center text-pwhl-muted">{player.pos}</td>
                        <td className="px-4 py-4 text-center text-pwhl-muted">{player.currentTeam}</td>
                        <td className="px-6 py-4 text-right font-bold text-pwhl-blue">{player.projGS}</td>
                        <td className="px-6 py-4 text-right text-pwhl-navy font-mono">{player.valueIndex}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider',
                              player.value === 'Value'
                                ? 'bg-pwhl-success/10 text-pwhl-success'
                                : player.value === 'High'
                                  ? 'bg-pwhl-accent/10 text-pwhl-accent'
                                  : 'bg-pwhl-border text-pwhl-muted',
                            )}
                          >
                            {player.value}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setFitFor(
                                `${player.name} — proj GS ${player.projGS}, value ${player.value} (${player.currentTeam})`,
                              )
                            }
                            className="text-xs font-sans font-semibold text-pwhl-blue hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Simulate Fit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-pwhl-border bg-pwhl-cream text-center">
                <button
                  type="button"
                  onClick={() => onViewFullDatabase?.()}
                  className="text-sm font-semibold text-pwhl-blue hover:underline"
                >
                  {playerCount > 0
                    ? `View full database (${playerCount} players)`
                    : 'View full database (Player database tab)'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-6 border-b border-pwhl-border bg-pwhl-surface">
                <h3 className="font-serif font-bold text-lg text-pwhl-navy">Lineup optimizer</h3>
                <p className="text-xs text-pwhl-muted mt-1 max-w-3xl">
                  Forward trios and defensive pairs ranked from play-by-play order (same logic as Line:Pairing
                  Efficiency). Higher segment shot and goal shares indicate stronger chemistry in this sample.
                </p>
              </div>
              <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 overflow-y-auto">
                <div>
                  <h4 className="text-sm font-bold text-pwhl-navy mb-2">Forward trios (season)</h4>
                  <HubDataTable rows={lines} emptyHint="No line combos — rebuild hub with game CSVs." />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-pwhl-navy mb-2">Defensive pairs (season)</h4>
                  <HubDataTable rows={pairs} emptyHint="No D pairs — rebuild hub with game CSVs." />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
