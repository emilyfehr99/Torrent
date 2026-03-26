const PWHL_TOPSCORERS_URL =
  'https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=statviewtype&type=topscorers&first=0&limit=50&season_id=8&key=446521baf8c38984&client_code=pwhl';

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req, res) {
  try {
    const upstream = await fetch(PWHL_TOPSCORERS_URL, {
      headers: { accept: 'application/json' },
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }
    const raw = await upstream.json();
    const rows = raw?.SiteKit?.Statviewtype;
    if (!Array.isArray(rows)) return res.status(502).json({ error: 'Invalid top scorers payload' });

    const players = rows
      .filter((r) => r && r.player_id)
      .map((r) => ({
        rank: toNumber(r.rank),
        player: String(r.name || ''),
        team: String(r.team_code || ''),
        goals: toNumber(r.goals),
        assists: toNumber(r.assists),
        points: toNumber(r.points),
      }))
      .sort((a, b) => a.rank - b.rank);

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      source: 'pwhl-hockeytech',
      players,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
