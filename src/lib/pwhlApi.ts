import type { PwhlStandingRow } from '../data/pwhlStandings2526';

type LiveStandingsResponse = {
  generated_at: string;
  source: string;
  standings: PwhlStandingRow[];
};

type LiveTopScorer = {
  rank: number;
  player: string;
  team: string;
  goals: number;
  assists: number;
  points: number;
};

type LiveTopScorersResponse = {
  generated_at: string;
  source: string;
  players: LiveTopScorer[];
};

export async function fetchPwhlStandings(): Promise<LiveStandingsResponse> {
  const res = await fetch('/api/pwhl/standings');
  if (!res.ok) throw new Error(`PWHL standings ${res.status}`);
  return res.json() as Promise<LiveStandingsResponse>;
}

export async function fetchPwhlTopScorers(): Promise<LiveTopScorersResponse> {
  const res = await fetch('/api/pwhl/topscorers');
  if (!res.ok) throw new Error(`PWHL top scorers ${res.status}`);
  return res.json() as Promise<LiveTopScorersResponse>;
}
