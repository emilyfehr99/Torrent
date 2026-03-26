const PWHL_STANDINGS_URL =
  'https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=statviewtype&stat=conference&type=standings&season_id=8&key=446521baf8c38984&client_code=pwhl';

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function handler(req, res) {
  try {
    const upstream = await fetch(PWHL_STANDINGS_URL, {
      headers: { accept: 'application/json' },
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }

    const raw = await upstream.json();
    const rows = raw?.SiteKit?.Statviewtype;
    if (!Array.isArray(rows)) {
      return res.status(502).json({ error: 'Invalid PWHL standings payload' });
    }

    const teams = rows
      .filter((r) => r && r.team_id)
      .map((r) => ({
        pos: toNumber(r.rank || r.overall_rank),
        team: String(r.team_name || r.name || ''),
        gp: toNumber(r.games_played),
        w: toNumber(r.wins),
        otw: toNumber(r.ot_wins) + toNumber(r.shootout_wins),
        otl: toNumber(r.ot_losses) + toNumber(r.shootout_losses),
        l: toNumber(r.reg_losses),
        gf: toNumber(r.goals_for),
        ga: toNumber(r.goals_against),
        gd: toNumber(r.goals_diff),
        pts: toNumber(r.points),
        qualification: '',
      }))
      .sort((a, b) => a.pos - b.pos);

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      source: 'pwhl-hockeytech',
      standings: teams,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
