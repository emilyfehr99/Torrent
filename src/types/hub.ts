export type HubRow = Record<string, string | number | null | undefined>;

export interface VizShot {
  x?: number | null;
  y?: number | null;
  player?: string | null;
}

export interface VizShotGame {
  game_id: string;
  opponent?: string | null;
  date?: string | null;
  shots_for: VizShot[];
  shots_against: VizShot[];
}

export interface VizPassEdge {
  from: string;
  to: string;
  n: number;
}

/** Season or per-game rink geometry from tracked pos_x / pos_y (hub extract). */
export interface RinkReport {
  shots_for: {
    total: number;
    by_zone_x: Record<string, number>;
    by_distance: Record<string, number>;
  };
  shots_against: {
    total: number;
    by_zone_x: Record<string, number>;
    by_distance: Record<string, number>;
  };
  goals_for: { total: number; by_zone_x: Record<string, number> };
  goals_against: { total: number; by_zone_x: Record<string, number> };
  entries: {
    total: number;
    carry_ins: number;
    dump_ins: number;
    by_lane_carry: Record<string, number>;
    by_lane_dump: Record<string, number>;
  };
}

export interface RinkReportGameRow extends RinkReport {
  game_id: string;
  opponent?: string | null;
  date?: string | null;
}

export interface PeriodRecapRow {
  period: string;
  metric: string;
  team: number | null;
  opponent: number | null;
  metric_is_pct?: boolean;
}

export interface SequenceCountRow {
  sequence?: string;
  count?: number;
}

export interface PrecedingActionRow {
  preceding_action?: string;
  count?: number;
}

export interface SequenceReport {
  goal_sequences_len2?: SequenceCountRow[];
  goal_sequences_len3?: SequenceCountRow[];
  goal_sequences_len3_for_team?: SequenceCountRow[];
  preceding_goal_all?: PrecedingActionRow[];
  preceding_goal_for_team?: PrecedingActionRow[];
}

export interface DefenseGamePayload {
  opponent: string;
  date?: string;
  table: HubRow[];
}

export interface HubPayload {
  team_name: string;
  n_games: number;
  record_wins: number;
  record_losses: number;
  games_meta: HubRow[];
  per_game_metrics: HubRow[];
  averages: HubRow[];
  win_correlations: HubRow[];
  defense_season: HubRow[];
  defense_team_totals: HubRow[];
  defense_by_game: DefenseGamePayload[];
  roster: HubRow[];
  player_season?: HubRow[];
  player_game_log?: HubRow[];
  viz_shots?: VizShot[];
  /** Per-game shots for team offense vs opponent (shots against) */
  viz_shot_games?: VizShotGame[];
  viz_pass_edges?: VizPassEdge[];
  line_combos_season?: HubRow[];
  pairings_season?: HubRow[];
  /** Aggregated shot/goal/entry geometry across loaded games */
  rink_report?: RinkReport;
  /** Per-game rink metrics (filter by opponent/date on client) */
  rink_report_by_game?: RinkReportGameRow[];
  /** Period × metric averages (team vs opponent) — Period by Period Recap logic */
  period_recap_avg?: PeriodRecapRow[];
  /** N-grams / preceding actions — What leads to.R logic */
  sequence_report?: SequenceReport;
  metric_names: string[];
  /** Bump when new hub fields are added; client can refetch if stale */
  hub_schema_version?: number;
  generated_at: string;
}
