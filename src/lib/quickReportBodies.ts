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

function formatRowsCompact(rows: HubRow[] | undefined, max: number): string {
  if (!rows?.length) return '  (no rows in hub)';
  const lines: string[] = [];
  for (const r of rows.slice(0, max)) {
    lines.push(
      '  ' +
        Object.entries(r)
          .map(([k, v]) => `${k}: ${v ?? '—'}`)
          .join(' · '),
    );
  }
  if (rows.length > max) lines.push(`  … ${rows.length - max} more rows`);
  return lines.join('\n');
}

function buildTorontoBlueprint(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const out: string[] = [];
  out.push('OPPONENT FOCUS: TORONTO (SCEPTRES)');
  out.push('');
  out.push(
    `Scenario-style brief for ${team}. Aggregates rink metrics for games where the opponent field matches "Toronto".`,
  );
  out.push('');
  const rink = rinkForScope(data?.rink_report, data?.rink_report_by_game, { opponent: 'Toronto' });
  const scopeNote =
    'Scope: games vs Toronto (substring match on opponent name in hub per-game metadata).';
  out.push(formatShotsGoalsBlock(team, rink, scopeNote));
  out.push('');
  out.push(formatEntriesBlock(team, rink, scopeNote));
  out.push('');
  const av = formatAveragesSnapshot(data?.averages);
  if (av) {
    out.push(av);
    out.push('');
  }
  out.push('Use Custom report in Reports library to adjust focus and section scope.');
  return out.join('\n');
}

function buildTransitionDefense(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const out: string[] = [];
  out.push('TRANSITION & DEFENSIVE TEAM TOTALS');
  out.push('');
  out.push(`Team: ${team} · Hub games: ${data?.n_games ?? '—'}`);
  out.push('');
  out.push('Defense / transition — team totals (season)');
  out.push(formatRowsCompact(data?.defense_team_totals, 40));
  out.push('');
  out.push('Defense / transition — season aggregates');
  out.push(formatRowsCompact(data?.defense_season, 40));
  out.push('');
  out.push('Per-game defense tables (first game sample)');
  const g0 = data?.defense_by_game?.[0];
  if (g0?.table?.length) {
    out.push(`Game: ${g0.opponent ?? '—'} · ${g0.date ?? ''}`);
    out.push(formatRowsCompact(g0.table as HubRow[], 25));
  } else {
    out.push('  (no defense per-game rows)');
  }
  return out.join('\n');
}

function buildMidseason(data: HubPayload | undefined): string {
  const team = data?.team_name ?? 'Seattle Torrent';
  const rec = data ? `${data.record_wins}–${data.record_losses}` : '—';
  const out: string[] = [];
  out.push('MID-SEASON TEAM REVIEW');
  out.push('');
  out.push(`Team: ${team}`);
  out.push(`Games tracked: ${data?.n_games ?? '—'} · Record (from filenames): ${rec}`);
  out.push(`Generated: ${new Date().toLocaleString()}`);
  out.push('');
  out.push('--- Key averages ---');
  out.push(formatAveragesSnapshot(data?.averages) || '  (no averages)');
  out.push('');
  if (data?.period_recap_avg?.length) {
    out.push('--- Period-by-period (sample) ---');
    for (const r of data.period_recap_avg.slice(0, 12)) {
      out.push(
        `  ${r.period} · ${r.metric}: ${team} ${r.team ?? '—'} · Opp ${r.opponent ?? '—'}`,
      );
    }
    out.push('');
  }
  if (data?.sequence_report?.goal_sequences_len3?.length) {
    out.push('--- Top goal sequences (3 actions) ---');
    for (const s of data.sequence_report.goal_sequences_len3.slice(0, 8)) {
      out.push(`  ${s.sequence ?? ''} · ${s.count ?? 0}`);
    }
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
