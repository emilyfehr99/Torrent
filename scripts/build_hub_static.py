#!/usr/bin/env python3
"""
Rebuilds `public/hub-static.json` from the CSVs in the Torrent Data folder.

Design goals for this script:
- Make it easy to re-run when new game CSVs are added.
- Ensure `n_games` / `games_meta` / `per_game_metrics` reflect *all* CSVs found.
- Keep the rest of the payload shape stable by starting from the existing hub-static.json
  and updating only fields we can safely recompute from the game CSVs alone.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
from collections import Counter, defaultdict
from typing import Any, Dict, Iterable, List, Optional, Tuple


BLACKLIST_PLAYERS = {"Schroeder Corinne", "Jackson Carly", "Murphy Hannah"}
TEAM_NAME = "Seattle Torrent"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--csv-dir",
        default="/Users/emilyfehr8/Desktop/My Analytics Work/Torrent Data",
        help="Folder containing game CSV files.",
    )
    p.add_argument(
        "--existing-hub",
        default=os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "public", "hub-static.json")
        ),
        help="Path to an existing hub-static.json to use as a base payload.",
    )
    p.add_argument(
        "--out",
        default=os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "public", "hub-static.json")
        ),
        help="Output path for the regenerated hub-static.json.",
    )
    return p.parse_args()


_FILENAME_RE = re.compile(
    r"^(?P<t1>.*?)\s+(?P<s1>\d+)\s+_\s+(?P<s2>\d+)\s+(?P<t2>.*?)\s+(?P<date>\d{2}\.\d{2}\.\d{4})$"
)


def fmt_date(dmy: str) -> str:
    d = dt.datetime.strptime(dmy, "%d.%m.%Y").date()
    return d.strftime("%b %d, %Y")


def parse_game_from_filename(path: str) -> Dict[str, Any]:
    base = os.path.splitext(os.path.basename(path))[0]
    m = _FILENAME_RE.match(base)
    if not m:
        raise ValueError(f"Unrecognized game filename format: {base}")
    t1 = m.group("t1").strip()
    t2 = m.group("t2").strip()
    s1 = int(m.group("s1"))
    s2 = int(m.group("s2"))
    dmy = m.group("date")

    if TEAM_NAME == t1:
        sea = s1
        opp = s2
        opponent = t2
    elif TEAM_NAME == t2:
        sea = s2
        opp = s1
        opponent = t1
    else:
        # Still load it, but we won't treat it as part of Seattle's hub.
        opponent = t1
        sea = 0
        opp = 0

    return {
        "game_id": base,
        "csv_file": path,
        "date": fmt_date(dmy),
        "opponent": opponent,
        "sea_score": sea,
        "opp_score": opp,
        "final_score": f"{sea}–{opp}",
        "win": 1.0 if sea > opp else 0.0,
    }


def safe_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "na":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def zone_from_x(pos_x: Optional[float]) -> Optional[str]:
    if pos_x is None:
        return None
    # pos_x in these exports appears to be 0..60 (feet/meters-scaled). We use simple bins.
    if pos_x < 20:
        return "DZ"
    if pos_x < 40:
        return "NZ"
    return "OZ"


def pct(n: float, d: float) -> Optional[float]:
    if d <= 0:
        return None
    return 100.0 * n / d


def list_game_csvs(csv_dir: str) -> List[str]:
    csvs: List[str] = []
    for fn in os.listdir(csv_dir):
        if fn.lower().endswith(".csv"):
            csvs.append(os.path.join(csv_dir, fn))
    # Deterministic: sort by parsed date if possible, else by name.
    def sort_key(path: str):
        try:
            info = parse_game_from_filename(path)
            return (dt.datetime.strptime(info["date"], "%b %d, %Y").date(), path)
        except Exception:
            return (dt.date(1900, 1, 1), path)

    return sorted(csvs, key=sort_key)


def read_csv_rows(path: str) -> Iterable[Dict[str, str]]:
    with open(path, newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            # Drop blacklisted players early so they never affect team/player aggregates.
            if row.get("player") in BLACKLIST_PLAYERS:
                continue
            yield row


def build_per_game_metrics(game: Dict[str, Any]) -> Dict[str, Any]:
    actions_for = Counter()
    actions_against = Counter()
    dz_shots = nz_shots = 0

    for row in read_csv_rows(game["csv_file"]):
        team = (row.get("team") or "").strip()
        action = (row.get("action") or "").strip()
        pos_x = safe_float(row.get("pos_x"))

        if team == TEAM_NAME:
            actions_for[action] += 1
            if action == "Shots":
                z = zone_from_x(pos_x)
                if z == "DZ":
                    dz_shots += 1
                elif z == "NZ":
                    nz_shots += 1
        elif team:
            actions_against[action] += 1

    entries = float(actions_for.get("Entries", 0))
    carry_ins = float(actions_for.get("Entries via stickhandling", 0))
    breakouts = float(actions_for.get("Breakouts", 0))
    poss_exits = float(actions_for.get("Breakouts via pass", 0) + actions_for.get("Breakouts via stickhandling", 0))

    shots_against = float(actions_against.get("Shots", 0))

    out: Dict[str, Any] = {
        "date": game["date"],
        "opponent": game["opponent"],
        "final_score": game["final_score"],
        "csv_file": game["csv_file"],
        "Win": game["win"],
        # Core counts directly available from action taxonomy
        "Shots": float(actions_for.get("Shots", 0)),
        "Shots on goal": float(actions_for.get("Shots on goal", 0)),
        "Goals": float(actions_for.get("Goals", 0)),
        "Shot Assists": float(actions_for.get("Assists", 0)),
        "Zone Entries": entries,
        "Carry-ins": carry_ins,
        "Carry-in%": pct(carry_ins, entries),
        "Possession Exits": breakouts,
        "Possession Exit %": pct(poss_exits, breakouts),
        "Forecheck Recoveries": float(actions_for.get("Puck recoveries in OZ", 0)),
        "NZ Turnovers": float(actions_for.get("Puck losses in NZ", 0)),
        "DZ Shots": float(dz_shots),
        "NZ Shots": float(nz_shots),
        "Shots Against": shots_against,
        # Present for schema compatibility; not computable from this export alone.
        "Scoring Chances": None,
        "Carries w/ Chances": None,
        "Dump-in Chances": None,
        "Exit off Retrieval %": None,
        "Entry Scoring Chance %": None,
        "Shots off Rush": None,
        "Shots off Forecheck": None,
        "SOGA off NZ Turnovers": None,
        "Expected Goals (xG)": None,
    }
    return out


def mean_rows(rows: List[Dict[str, Any]], exclude_keys: set) -> Dict[str, Any]:
    sums: Dict[str, float] = defaultdict(float)
    counts: Dict[str, int] = defaultdict(int)
    for r in rows:
        for k, v in r.items():
            if k in exclude_keys:
                continue
            if isinstance(v, (int, float)) and v is not None:
                sums[k] += float(v)
                counts[k] += 1
    out: Dict[str, Any] = {}
    for k, s in sums.items():
        c = counts.get(k, 0)
        out[k] = (s / c) if c else None
    return out


def update_player_gp_from_csvs(csv_paths: List[str]) -> Dict[str, int]:
    player_games: Dict[str, set] = defaultdict(set)
    for path in csv_paths:
        game_id = os.path.splitext(os.path.basename(path))[0]
        for row in read_csv_rows(path):
            if (row.get("team") or "").strip() != TEAM_NAME:
                continue
            player = (row.get("player") or "").strip()
            if not player:
                continue
            player_games[player].add(game_id)
    return {p: len(gids) for p, gids in player_games.items()}


def main() -> int:
    args = parse_args()

    csv_paths = list_game_csvs(args.csv_dir)
    games = [parse_game_from_filename(p) for p in csv_paths]

    # Only keep games involving Seattle in filename (safety).
    games = [g for g in games if g["sea_score"] is not None]

    per_game = [build_per_game_metrics(g) for g in games]
    games_meta = [
        {
            "opponent": g["opponent"],
            "date": g["date"],
            "final_score": g["final_score"],
            "csv_file": g["csv_file"],
        }
        for g in games
    ]

    record_w = sum(1 for g in games if g["sea_score"] > g["opp_score"])
    record_l = sum(1 for g in games if g["sea_score"] < g["opp_score"])

    averages_row = mean_rows(per_game, exclude_keys={"date", "opponent", "final_score", "csv_file"})

    # Load existing payload (keeps all the extra tables/viz outputs stable).
    with open(args.existing_hub) as f:
        base = json.load(f)

    base["team_name"] = TEAM_NAME
    base["n_games"] = len(games)
    base["record_wins"] = record_w
    base["record_losses"] = record_l
    base["games_meta"] = games_meta
    base["per_game_metrics"] = per_game
    base["averages"] = [averages_row]
    base["generated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()

    # Update GP in player_season / roster if present, so the UI reflects the new game count.
    gp_map = update_player_gp_from_csvs(csv_paths)
    if isinstance(base.get("player_season"), list):
        for row in base["player_season"]:
            if not isinstance(row, dict):
                continue
            name = row.get("Player")
            if name in gp_map:
                row["GP"] = gp_map[name]
    if isinstance(base.get("roster"), list):
        for row in base["roster"]:
            if not isinstance(row, dict):
                continue
            name = row.get("Player")
            if name in gp_map:
                row["GP"] = gp_map[name]

    # Ensure blacklist players are removed from roster/player_season.
    def drop_blacklist(rows: Any) -> Any:
        if not isinstance(rows, list):
            return rows
        out_rows = []
        for r in rows:
            if not isinstance(r, dict):
                out_rows.append(r)
                continue
            if r.get("Player") in BLACKLIST_PLAYERS:
                continue
            out_rows.append(r)
        return out_rows

    base["roster"] = drop_blacklist(base.get("roster"))
    base["player_season"] = drop_blacklist(base.get("player_season"))
    base["player_game_log"] = drop_blacklist(base.get("player_game_log"))

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(base, f, indent=2, sort_keys=False)
        f.write("\n")

    print(f"Wrote {args.out}")
    print(f"n_games={base.get('n_games')} record={base.get('record_wins')}-{base.get('record_losses')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

