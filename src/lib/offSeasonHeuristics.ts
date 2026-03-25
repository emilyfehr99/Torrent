import type { PwhlStandingRow } from '../data/pwhlStandings2526';

export interface OffSeasonFlag {
  team: string;
  severity: 'high' | 'medium';
  headline: string;
  detail: string;
}

/**
 * Rule-based flags from standings + GF/GA (until NZ transition aggregates exist per team in API).
 */
export function computeOffSeasonFlags(standings: PwhlStandingRow[]): OffSeasonFlag[] {
  const out: OffSeasonFlag[] = [];
  const byName = new Map(standings.map((r) => [r.team, r]));

  const van = byName.get('Vancouver Goldeneyes');
  if (van && van.pos >= 6) {
    out.push({
      team: 'Vancouver Goldeneyes',
      severity: 'high',
      headline: 'Neutral-zone transition depth',
      detail:
        'Standings position in bottom third with negative goal differential — prioritize NZ transition drivers (centres who exit clean, wingers who support mid-lane) in UFA/RFA.',
    });
  }

  const sea = byName.get('Seattle Torrent');
  if (sea && sea.gd < -15) {
    out.push({
      team: 'Seattle Torrent',
      severity: 'high',
      headline: 'Defensive suppression & NZ turnovers',
      detail:
        'Large negative GD vs games played — audit NZ turnover rates and retrieval exits; add D who limit slot passes off the rush.',
    });
  }

  const nyr = byName.get('New York Sirens');
  if (nyr && nyr.ga > 55) {
    out.push({
      team: 'New York Sirens',
      severity: 'medium',
      headline: 'Goals-against load',
      detail: 'High GA through ~20+ GP — explore goalie workload + slot suppression; PP PK underlying review.',
    });
  }

  const ott = byName.get('Ottawa Charge');
  if (ott && ott.otl + ott.otw > 8) {
    out.push({
      team: 'Ottawa Charge',
      severity: 'medium',
      headline: 'Overtime volatility',
      detail: 'Many games decided past regulation — roster construction for 3v3 specialists vs 5v5 depth trade-off.',
    });
  }

  const mon = byName.get('Montreal Victoire');
  if (mon && mon.gf > 50 && mon.pos <= 3) {
    out.push({
      team: 'Montreal Victoire',
      severity: 'medium',
      headline: 'Sustain offence at the top',
      detail: 'Elite GF pace — maintain transition volume when adding pieces; avoid diluting entry schemes.',
    });
  }

  return out.slice(0, 8);
}
