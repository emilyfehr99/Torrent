import React from 'react';
import { Book, Info, Calculator, Database, Target, Activity } from 'lucide-react';

export function Methodology() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-pwhl-navy">Methodology & Glossary</h2>
          <p className="text-pwhl-muted text-sm mt-1">Definitions & metric calculations · Seattle Torrent hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div id="glossary-gs" className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <Calculator size={24} className="text-pwhl-blue" />
              <h3 className="font-serif font-bold text-xl text-pwhl-navy">Game Score (tracking)</h3>
            </div>
            <p className="text-sm text-pwhl-navy mb-4">
              The hub&apos;s <strong>GameScore</strong> column is computed from <strong>your tracked play-by-play</strong> (Python{' '}
              <span className="font-mono text-xs">metrics_players</span>), not from public boxscores. It rewards transition contributions,
              chances, and shot assists derived from the same CSVs as zone entries and exits.
            </p>
            <p className="text-sm text-pwhl-navy mb-4">
              <strong>Situation weighting:</strong> when strength-state columns exist in the export, the pipeline can weight EV vs PP/PK;
              otherwise values are effectively aggregated across tracked situations. Check your hub config for exclusions.
            </p>
            <p className="text-xs text-pwhl-muted mb-4">
              Per-60 rates: divide by TOI or GP columns when present in the player season sheet; the UI shows raw totals unless a{' '}
              <span className="font-mono">/60</span> column is emitted by the hub.
            </p>
            <div className="bg-pwhl-cream rounded-lg p-4 border border-pwhl-border font-mono text-xs text-pwhl-navy mb-4">
              Illustrative boxscore-style GS (not the hub default): Goals, assists, shots, blocks, faceoffs, Corsi/xG differentials —
              use only when you explicitly blend public data; the Torrent hub prioritizes <strong>tracked</strong> events.
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Activity size={24} className="text-torrent-teal" />
              <h3 className="font-serif font-bold text-xl text-pwhl-navy">Transition metrics</h3>
            </div>
            <div className="space-y-4 text-sm text-pwhl-navy">
              <p>
                <strong>Controlled exit % / possession exit %</strong> — share of defensive-zone exits that keep possession (carry or
                pass) vs dump/clear, from tagged exits in the CSV.
              </p>
              <p>
                <strong>Carry vs pass vs dump</strong> — action labels on exit/entry events; rates are counts divided by opportunities.
              </p>
              <p>
                <strong>Transition success rate</strong> — team-defined: often entries with a shot or chance within N seconds; align with
                your R post-game scripts.
              </p>
              <p>
                <strong>Breakouts per 60</strong> — retrieval + exit sequences per minute when those columns are stacked in the hub.
              </p>
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Target size={24} className="text-pwhl-blue" />
              <h3 className="font-serif font-bold text-xl text-pwhl-navy">Entry quality</h3>
            </div>
            <div className="space-y-3 text-sm text-pwhl-navy">
              <p>
                <strong>Controlled entry %</strong> — carries + passes ÷ all entries with those action types.
              </p>
              <p>
                <strong>Entry success rate</strong> — entries that lead to a shot or scoring chance within the hub window.
              </p>
              <p>
                <strong>xG in 10s post-entry</strong> — requires a shot model on entry-attached shots;{' '}
                <span className="font-mono text-xs">N/A</span> in UI until the feed is merged.
              </p>
              <p>
                <strong>Entry Danger Score</strong> — proprietary weight on shot quality following entry; score/venue adjustments below
                apply when using league shot data.
              </p>
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Database size={24} className="text-pwhl-blue" />
              <h3 className="font-serif font-bold text-xl text-pwhl-navy">Standard advanced (league feeds)</h3>
            </div>
            <p className="text-sm text-pwhl-navy mb-3">
              <strong>xG/60, Corsi/Fenwick %, high-danger chances, shooting %, iSF%, GSAx, HD save %, rebound control, QoC/QoT, zone
              starts</strong> — shown as <span className="font-mono">N/A</span> in the player grid until public or league APIs are joined
              on player_id. The hub does not invent these from tracking CSVs alone.
            </p>
            <p className="text-xs text-pwhl-muted">
              Radar charts use <strong>hub</strong> numeric columns only; league benchmarks appear once blended.
            </p>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Info size={24} className="text-pwhl-blue" />
              <h3 className="font-serif font-bold text-xl text-pwhl-navy">Adjustments</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-pwhl-navy mb-1">Score & venue</h4>
                <p className="text-xs text-pwhl-muted">
                  Trailing teams push more carries and shots — when league xG/Corsi feeds are connected, metrics will be{' '}
                  <strong>score- and venue-adjusted</strong> for fair player comparison.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-pwhl-navy mb-1">Strength of schedule</h4>
                <p className="text-xs text-pwhl-muted">
                  Team pages show a rank-based SoS <strong>proxy</strong> until opponent strength is imported from the schedule.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Book size={24} className="text-pwhl-blue" />
              <h3 className="font-serif font-bold text-xl text-pwhl-navy">Lines & pairs</h3>
            </div>
            <p className="text-xs text-pwhl-muted">
              Forward trios and D pairs follow play-by-play order and roster positions, mirroring your Line:Pairing Efficiency R workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
