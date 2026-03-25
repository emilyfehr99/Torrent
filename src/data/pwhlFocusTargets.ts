/** Five PWHL clubs flagged for deeper scouting / narrative in the hub UI */
export const PWHL_FOCUS_TEAMS = [
  'Seattle Torrent',
  'Toronto Sceptres',
  'Montreal Victoire',
  'Vancouver Goldeneyes',
  'Minnesota Frost',
] as const;

export type PwhlFocusTeam = (typeof PWHL_FOCUS_TEAMS)[number];
