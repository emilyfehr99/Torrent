/**
 * 2025–26 PWHL regular season standings (in progress — GP varies by schedule).
 * Updated to games played March 22, 2026.
 *
 * Source: https://en.wikipedia.org/wiki/2025%E2%80%9326_PWHL_season#Standings
 * Official: https://www.thepwhl.com/en/stats/standings
 *
 * Season: 30 GP each; ends April 25, 2026.
 */
export interface PwhlStandingRow {
  pos: number;
  team: string;
  gp: number;
  w: number;
  otw: number;
  otl: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  qualification: string;
}

/** As of March 22, 2026 — refresh this snapshot when you want newer numbers. */
export const PWHL_STANDINGS_2526: PwhlStandingRow[] = [
  {
    pos: 1,
    team: 'Minnesota Frost',
    gp: 21,
    w: 11,
    otw: 3,
    otl: 3,
    l: 4,
    gf: 67,
    ga: 42,
    gd: 25,
    pts: 42,
    qualification: 'T-1st',
  },
  {
    pos: 2,
    team: 'Boston Fleet',
    gp: 21,
    w: 10,
    otw: 5,
    otl: 2,
    l: 4,
    gf: 49,
    ga: 34,
    gd: 15,
    pts: 42,
    qualification: 'T-1st',
  },
  {
    pos: 3,
    team: 'Montreal Victoire',
    gp: 21,
    w: 10,
    otw: 4,
    otl: 2,
    l: 5,
    gf: 53,
    ga: 32,
    gd: 21,
    pts: 40,
    qualification: '3rd',
  },
  {
    pos: 4,
    team: 'Toronto Sceptres',
    gp: 22,
    w: 8,
    otw: 1,
    otl: 5,
    l: 8,
    gf: 43,
    ga: 55,
    gd: -12,
    pts: 31,
    qualification: '4th',
  },
  {
    pos: 5,
    team: 'Ottawa Charge',
    gp: 22,
    w: 5,
    otw: 7,
    otl: 1,
    l: 9,
    gf: 53,
    ga: 61,
    gd: -8,
    pts: 30,
    qualification: '5th',
  },
  {
    pos: 6,
    team: 'New York Sirens',
    gp: 21,
    w: 8,
    otw: 0,
    otl: 3,
    l: 10,
    gf: 49,
    ga: 57,
    gd: -8,
    pts: 27,
    qualification: '6th',
  },
  {
    pos: 7,
    team: 'Vancouver Goldeneyes',
    gp: 21,
    w: 6,
    otw: 1,
    otl: 4,
    l: 10,
    gf: 41,
    ga: 51,
    gd: -10,
    pts: 24,
    qualification: '7th',
  },
  {
    pos: 8,
    team: 'Seattle Torrent',
    gp: 21,
    w: 5,
    otw: 1,
    otl: 2,
    l: 13,
    gf: 41,
    ga: 64,
    gd: -23,
    pts: 19,
    qualification: '8th',
  },
];
