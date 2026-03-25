import type { PwhlStandingRow } from '../data/pwhlStandings2526';

/** League-wide proxies from standings (GF/GA/GD, pace) — not xG modelled here. */
export function leagueAggregates(standings: PwhlStandingRow[]) {
  if (!standings.length) return null;
  const gf = standings.reduce((a, r) => a + r.gf, 0);
  const ga = standings.reduce((a, r) => a + r.ga, 0);
  const gd = gf - ga;
  const gp = standings.reduce((a, r) => a + r.gp, 0);
  const games = standings.length;
  return {
    teams: games,
    totalGoalsFor: gf,
    totalGoalsAgainst: ga,
    leagueGoalDiff: gd,
    avgGfPerTeamPerGp: gp > 0 ? gf / gp : 0,
    avgGaPerTeamPerGp: gp > 0 ? ga / gp : 0,
  };
}

/** Pace to 30 GP: pts/gp * 30 */
export function projectedPoints30(r: PwhlStandingRow): number {
  if (r.gp <= 0) return 0;
  return (r.pts / r.gp) * 30;
}

/** Crude strength-of-schedule proxy: inverse of current rank (1st = 8 difficulty points) — replace when schedule API wired */
export function mockSosScore(rank1Indexed: number, nTeams: number): number {
  return nTeams - rank1Indexed + 1;
}
