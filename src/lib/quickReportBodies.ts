import type { HubPayload, HubRow } from '../types/hub';
import {
  formatAveragesSnapshot,
  formatEntriesBlock,
  formatShotsGoalsBlock,
  rinkForScope,
} from './rinkReport';

export type QuickReportVariant = 'toronto-blueprint' | 'transition-defense' | 'midseason';

function slug(s: string): string {
  return s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
}

function formatTable(headers: string[], rows: any[][]): string {
  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)));
  const pad = (s: string, w: number, right = false) => right ? s.padStart(w) : s.padEnd(w);
  
  const hLine = headers.map((h, i) => pad(h, colWidths[i])).join(' | ');
  const separator = colWidths.map(w => '-'.repeat(w)).join('-|-');
  const body = rows.map(r => r.map((cell, i) => pad(String(cell ?? '—'), colWidths[i], typeof cell === 'number')).join(' | '));
  
  return [hLine, separator, ...body].join('\n');
}

function buildTorontoBlueprint(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const out: string[] = [];
  out.push('OPPONENT SCOUTING BLUEPRINT: TORONTO SCEPTRES');
  out.push('=' .repeat(45));
  out.push(`Team: ${team} · Hub Source Data`);
  out.push('');
  out.push('Aggregated rink metrics for games where the opponent is Toronto.');
  out.push('');
  
  const rink = rinkForScope(data?.rink_report, data?.rink_report_by_game, { opponent: 'Toronto' });
  const scopeNote = 'Scope: All season games vs Toronto.';
  
  out.push('--- SHOT & GOAL LOCATIONS ---');
  out.push(formatShotsGoalsBlock(team, rink, scopeNote));
  out.push('');
  out.push('--- ZONE ENTRY EFFICIENCY ---');
  out.push(formatEntriesBlock(team, rink, scopeNote));
  out.push('');
  
  const av = formatAveragesSnapshot(data?.averages);
  if (av) {
    out.push('--- TEAM SEASON AVERAGES (REF) ---');
    out.push(av);
    out.push('');
  }
  
  out.push('Strategic Note: Use the Rink Report in for specific date-range filtering.');
  return out.join('\n');
}

function buildTransitionDefense(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const out: string[] = [];
  out.push('TRANSITION & DEFENSE PROFILE');
  out.push('=' .repeat(30));
  out.push(`Team: ${team} · Hub games: ${data?.n_games ?? '—'}`);
  out.push('');
  
  if (data?.defense_team_totals?.length) {
    out.push('--- TEAM DEFENSE TOTALS (SEASON) ---');
    const rows = data.defense_team_totals.map(r => [r.Metric, r[team], r.Opponent]);
    out.push(formatTable(['Metric', team, 'Opponent'], rows));
    out.push('');
  }
  
  if (data?.defense_season?.length) {
    out.push('--- TOP DEFENSIVE CONTRIBUTORS ---');
    const rows = data.defense_season.slice(0, 15).map(r => [r.Player, r.Pos, r['DZ Retrievals'], r['Retrievals w Exit']]);
    out.push(formatTable(['Player', 'Pos', 'DZ Retr', 'Retr w/ Exit'], rows));
    out.push('');
  }
  
  return out.join('\n');
}

function buildMidseason(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const rec = data ? `${data.record_wins}–${data.record_losses}` : '—';
  const out: string[] = [];
  out.push('MID-SEASON PERFORMANCE REVIEW');
  out.push('=' .repeat(32));
  out.push(`Team: ${team}`);
  out.push(`Games Tracked: ${data?.n_games ?? '—'} · Record: ${rec}`);
  out.push(`Report Generated: ${new Date().toLocaleString()}`);
  out.push('');
  
  out.push('--- PERFORMANCE SNAPSHOT ---');
  out.push(formatAveragesSnapshot(data?.averages) || '  (no averages)');
  out.push('');
  
  if (data?.period_recap_avg?.length) {
    out.push('--- PERIOD RECAP (AVERAGES) ---');
    const rows = data.period_recap_avg.slice(0, 15).map(r => [r.period, r.metric, r.team, r.opponent]);
    out.push(formatTable(['Period', 'Metric', team, 'Opponent'], rows));
    out.push('');
  }
  
  if (data?.sequence_report?.goal_sequences_len3?.length) {
    out.push('--- TOP GOAL SEQUENCES (LEN-3) ---');
    const rows = data.sequence_report.goal_sequences_len3.slice(0, 10).map(s => [s.sequence, s.count]);
    out.push(formatTable(['Sequence Chain', 'Count'], rows));
  }
  
  return out.join('\n');
}

export function buildQuickReportBody(
  variant: QuickReportVariant,
  data: HubPayload | undefined,
): { title: string; subtitle: string; body: string; filename: string } {
  const team = data?.team_name ?? 'Seattle Torrent';
  const d = new Date().toISOString().slice(0, 10);
  const base = `torrent_${slug(team)}`;

  switch (variant) {
    case 'toronto-blueprint':
      return {
        title: `${team} — Toronto opponent blueprint`,
        subtitle: 'Rink zones + entries vs Toronto (hub scope)',
        body: buildTorontoBlueprint(data),
        filename: `${base}_blueprint_toronto_${d}.pdf`,
      };
    case 'transition-defense':
      return {
        title: `${team} — Transition & defense`,
        subtitle: 'Defensive team totals and season aggregates',
        body: buildTransitionDefense(data),
        filename: `${base}_transition_defense_${d}.pdf`,
      };
    case 'midseason':
    default:
      return {
        title: `${team} — Mid-season review`,
        subtitle: `${data?.n_games ?? '—'} games · microstats snapshot`,
        body: buildMidseason(data),
        filename: `${base}_midseason_${d}.pdf`,
      };
  }
}

export function buildAdvancedAnalyticsPdfBody(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const lines: string[] = [
    `ADVANCED ANALYTICS EXPORT — ${team}`,
    '',
    '--- Period-by-period averages (team vs opponent) ---',
  ];
  const pr = data?.period_recap_avg ?? [];
  if (!pr.length) lines.push('  (none — ensure `half` in CSVs and hub schema ≥ 4)');
  else {
    for (const r of pr) {
      lines.push(
        `  ${r.period} · ${r.metric}: ${r.team ?? '—'} vs ${r.opponent ?? '—'}${r.metric_is_pct ? ' (%)' : ''}`,
      );
    }
  }
  lines.push('');
  lines.push('--- Goal sequences ---');
  const sr = data?.sequence_report;
  if (!sr || !Object.keys(sr).length) {
    lines.push('  (none)');
  } else {
    const add = (label: string, rows: { sequence?: string; preceding_action?: string; count?: number }[] | undefined) => {
      lines.push(`  ${label}:`);
      if (!rows?.length) lines.push('    (empty)');
      else rows.slice(0, 12).forEach((x) => lines.push(`    ${x.sequence ?? x.preceding_action ?? ''} · ${x.count ?? 0}`));
    };
    add('Len-2', sr.goal_sequences_len2);
    add('Len-3', sr.goal_sequences_len3);
    add('Len-3 (team)', sr.goal_sequences_len3_for_team);
    add('Preceding (all)', sr.preceding_goal_all);
    add('Preceding (team)', sr.preceding_goal_for_team);
  }
  return lines.join('\n');
}
