// Shared shapes used by analytics computation.
// Intentionally permissive: both DB rows and CSV-derived rows can satisfy these.

export interface RawPA {
  pa_id: string;
  play_result: string | null;
  k_or_bb: string | null;
  outs_on_play?: number | null;
  runs_scored?: number | null;
  pitcher_id?: number;
  batter_id?: number;
  inning?: number;
  top_bottom?: string;
  pa_of_inning?: number | null;
  // For DB queries this comes through as nested objects; for CSV we synthesize equivalent shape.
  games?: { game_date: string } | null;
  players?: { pitcher_side?: string | null; batter_side?: string | null } | null;
}

export interface RawPitch {
  pitch_uid: string;
  pa_id: string;
  tagged_pitch_type?: string | null;
  pitch_call?: string | null;
  rel_speed?: number | null;
  plate_loc_height?: number | null;
  plate_loc_side?: number | null;
  pitch_of_pa?: number | null;
  spin_rate?: number | null;
  vert_break?: number | null;
  induced_vert_break?: number | null;
  horz_break?: number | null;
  rel_height?: number | null;
  rel_side?: number | null;
  extension?: number | null;
  spin_axis?: number | null;
  tilt?: string | null;
  vert_appr_angle?: number | null;
  horz_appr_angle?: number | null;
}

export interface RawBattedBall {
  pitch_uid: string;
  exit_speed?: number | null;
  angle?: number | null;
  direction?: number | null;
  distance?: number | null;
  hang_time?: number | null;
  hit_spin_rate?: number | null;
  tagged_hit_type?: string | null;
  play_result?: string | null;
}

export interface PitchTypeRow {
  type: string;
  count: number;
  usagePct: string;
  avgVelo: string;
  maxVelo: string;
  avgSpin: string;
  avgIVB: string;
  avgHB: string;
  avgVAA: string;
  avgHAA: string;
  avgRelHeight: string;
  avgExtension: string;
  whiffs: number;
  whiffPct: string;
  cswPct: string;
  stuffPlus: string;
  gbPct: string;
  fbPct: string;
  ldPct: string;
}

export interface PlayerLite {
  player_id: number;
  player_name: string;
}

export interface AnalyticsFilters {
  countFilter: string; // legacy: kept for backward compat ("all" when balls/strikes drive filtering)
  ballsFilter?: number[]; // selected ball values (0-3); empty/undefined = no ball restriction
  strikesFilter?: number[]; // selected strike values (0-2); empty/undefined = no strike restriction
  pitchTypeFilter: string; // legacy: kept for backward compat ("all" when pitchTypesFilter drives filtering)
  pitchTypesFilter?: string[]; // selected pitch types; empty/undefined = no restriction
  handednessFilter: string;
  outcomeFilter: string;
  selectedDates: string[]; // empty array = all games
  veloRange: [number, number];
  batterFilter?: string; // pitching tab only — batter_id as string, or "all"
}
