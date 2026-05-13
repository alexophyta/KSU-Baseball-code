// Adapt parsed Trackman CSV rows into the shared analytics shapes
// (RawPA / RawPitch / RawBattedBall) so the same compute* functions that power
// the database-backed Player Data page can drive the session-only Scouting page.

import type { RawPA, RawPitch, RawBattedBall } from "@/lib/playerAnalytics/types";
import type { RawRow } from "./csvParser";

const num = (s: string | undefined): number | null => {
  if (s == null || s === "" || s.toLowerCase() === "undefined") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
};
const str = (s: string | undefined): string | null => {
  if (s == null || s === "" || s.toLowerCase() === "undefined") return null;
  return s;
};
const get = (r: RawRow, ...keys: string[]): string => {
  for (const k of keys) if (r[k] != null && r[k] !== "") return r[k];
  return "";
};

export interface PlayerEntry {
  name: string;
  isBatter: boolean;
  isPitcher: boolean;
}

export interface AdaptedData {
  players: PlayerEntry[];
  rowsByBatter: Map<string, RawRow[]>;
  rowsByPitcher: Map<string, RawRow[]>;
  batterIdByName: Map<string, number>;
  batterNameById: Map<number, string>;
}

export function adaptCSV(rows: RawRow[]): AdaptedData {
  const rowsByBatter = new Map<string, RawRow[]>();
  const rowsByPitcher = new Map<string, RawRow[]>();
  const batterIdByName = new Map<string, number>();
  const batterNameById = new Map<number, string>();
  let nextId = 1;

  const ensureId = (name: string) => {
    if (!batterIdByName.has(name)) {
      const id = nextId++;
      batterIdByName.set(name, id);
      batterNameById.set(id, name);
    }
    return batterIdByName.get(name)!;
  };

  for (const r of rows) {
    const batter = get(r, "Batter", "BatterName", "batter");
    const pitcher = get(r, "Pitcher", "PitcherName", "pitcher");
    if (batter) {
      ensureId(batter);
      if (!rowsByBatter.has(batter)) rowsByBatter.set(batter, []);
      rowsByBatter.get(batter)!.push(r);
    }
    if (pitcher) {
      ensureId(pitcher);
      if (!rowsByPitcher.has(pitcher)) rowsByPitcher.set(pitcher, []);
      rowsByPitcher.get(pitcher)!.push(r);
    }
  }

  const allNames = new Set<string>([...rowsByBatter.keys(), ...rowsByPitcher.keys()]);
  const players: PlayerEntry[] = Array.from(allNames)
    .sort()
    .map((name) => ({
      name,
      isBatter: rowsByBatter.has(name),
      isPitcher: rowsByPitcher.has(name),
    }));

  return { players, rowsByBatter, rowsByPitcher, batterIdByName, batterNameById };
}

/** Build a stable PA id from row fields. */
export function buildPAId(r: RawRow): string {
  return [
    get(r, "GameID", "GameId", "Date") || "G",
    get(r, "Inning") || "I",
    get(r, "Top/Bottom", "TopBottom") || "T",
    get(r, "PAofInning") || "P",
    get(r, "Batter") || "B",
    get(r, "Pitcher") || "P",
  ].join("_");
}

export interface ConvertedForPlayer {
  pas: RawPA[];
  pitches: RawPitch[];
  battedBalls: RawBattedBall[];
}

export function convertRowsForBatter(rows: RawRow[]): ConvertedForPlayer {
  const pasMap = new Map<string, RawPA>();
  const pitches: RawPitch[] = [];
  const battedBalls: RawBattedBall[] = [];

  for (const r of rows) {
    const paId = buildPAId(r);
    if (!pasMap.has(paId)) {
      pasMap.set(paId, {
        pa_id: paId,
        play_result: str(get(r, "PlayResult", "play_result")),
        k_or_bb: str(get(r, "KorBB", "k_or_bb")),
        outs_on_play: num(get(r, "OutsOnPlay")) ?? 0,
        runs_scored: num(get(r, "RunsScored")) ?? 0,
        inning: num(get(r, "Inning")) ?? undefined,
        top_bottom: str(get(r, "Top/Bottom", "TopBottom")) ?? undefined,
        pa_of_inning: num(get(r, "PAofInning")),
        games: { game_date: get(r, "Date", "GameDate") || "unknown" },
        players: { pitcher_side: str(get(r, "PitcherThrows", "pitcher_throws")) },
      });
    }
    const pitchUid = get(r, "PitchUID", "pitch_uid") || `${paId}_${pitches.length}`;
    pitches.push({
      pitch_uid: pitchUid,
      pa_id: paId,
      tagged_pitch_type: str(get(r, "TaggedPitchType", "tagged_pitch_type")) ?? "Other",
      pitch_call: str(get(r, "PitchCall", "pitch_call")),
      rel_speed: num(get(r, "RelSpeed", "rel_speed")),
      plate_loc_height: num(get(r, "PlateLocHeight", "plate_loc_height")),
      plate_loc_side: num(get(r, "PlateLocSide", "plate_loc_side")),
      pitch_of_pa: num(get(r, "PitchofPA", "PitchOfPA", "pitch_of_pa")),
      spin_rate: num(get(r, "SpinRate", "spin_rate")),
      induced_vert_break: num(get(r, "InducedVertBreak", "induced_vert_break")),
      horz_break: num(get(r, "HorzBreak", "horz_break")),
      extension: num(get(r, "Extension", "extension")),
    });
    const exitSpeed = num(get(r, "ExitSpeed", "exit_speed"));
    const taggedHit = str(get(r, "TaggedHitType", "tagged_hit_type"));
    if (exitSpeed != null || taggedHit) {
      battedBalls.push({
        pitch_uid: pitchUid,
        exit_speed: exitSpeed,
        angle: num(get(r, "Angle", "angle")),
        direction: num(get(r, "Direction", "direction")),
        distance: num(get(r, "Distance", "distance")),
        hang_time: num(get(r, "HangTime", "hang_time")),
        hit_spin_rate: num(get(r, "HitSpinRate", "hit_spin_rate")),
        tagged_hit_type: taggedHit,
        play_result: str(get(r, "PlayResult", "play_result")),
      });
    }
  }
  return { pas: Array.from(pasMap.values()), pitches, battedBalls };
}

export function convertRowsForPitcher(
  rows: RawRow[],
  batterIdByName: Map<string, number>,
): ConvertedForPlayer {
  const pasMap = new Map<string, RawPA>();
  const pitches: RawPitch[] = [];
  const battedBalls: RawBattedBall[] = [];

  for (const r of rows) {
    const paId = buildPAId(r);
    const batterName = get(r, "Batter", "BatterName", "batter");
    if (!pasMap.has(paId)) {
      pasMap.set(paId, {
        pa_id: paId,
        play_result: str(get(r, "PlayResult", "play_result")),
        k_or_bb: str(get(r, "KorBB", "k_or_bb")),
        outs_on_play: num(get(r, "OutsOnPlay")) ?? 0,
        runs_scored: num(get(r, "RunsScored")) ?? 0,
        batter_id: batterIdByName.get(batterName),
        inning: num(get(r, "Inning")) ?? undefined,
        top_bottom: str(get(r, "Top/Bottom", "TopBottom")) ?? undefined,
        pa_of_inning: num(get(r, "PAofInning")),
        games: { game_date: get(r, "Date", "GameDate") || "unknown" },
        players: { batter_side: str(get(r, "BatterSide", "batter_side")) },
      });
    }
    const pitchUid = get(r, "PitchUID", "pitch_uid") || `${paId}_${pitches.length}`;
    pitches.push({
      pitch_uid: pitchUid,
      pa_id: paId,
      tagged_pitch_type: str(get(r, "TaggedPitchType", "tagged_pitch_type")) ?? "Other",
      pitch_call: str(get(r, "PitchCall", "pitch_call")),
      rel_speed: num(get(r, "RelSpeed", "rel_speed")),
      plate_loc_height: num(get(r, "PlateLocHeight", "plate_loc_height")),
      plate_loc_side: num(get(r, "PlateLocSide", "plate_loc_side")),
      pitch_of_pa: num(get(r, "PitchofPA", "PitchOfPA", "pitch_of_pa")),
      spin_rate: num(get(r, "SpinRate", "spin_rate")),
      vert_break: num(get(r, "VertBreak", "vert_break")),
      induced_vert_break: num(get(r, "InducedVertBreak", "induced_vert_break")),
      horz_break: num(get(r, "HorzBreak", "horz_break")),
      rel_height: num(get(r, "RelHeight", "rel_height")),
      rel_side: num(get(r, "RelSide", "rel_side")),
      extension: num(get(r, "Extension", "extension")),
      spin_axis: num(get(r, "SpinAxis", "spin_axis")),
      tilt: str(get(r, "Tilt", "tilt")),
      vert_appr_angle: num(get(r, "VertApprAngle", "vert_appr_angle")),
      horz_appr_angle: num(get(r, "HorzApprAngle", "horz_appr_angle")),
    });
    const exitSpeed = num(get(r, "ExitSpeed", "exit_speed"));
    const taggedHit = str(get(r, "TaggedHitType", "tagged_hit_type"));
    if (exitSpeed != null || taggedHit) {
      battedBalls.push({
        pitch_uid: pitchUid,
        exit_speed: exitSpeed,
        angle: num(get(r, "Angle", "angle")),
        direction: num(get(r, "Direction", "direction")),
        distance: num(get(r, "Distance", "distance")),
        hang_time: num(get(r, "HangTime", "hang_time")),
        hit_spin_rate: num(get(r, "HitSpinRate", "hit_spin_rate")),
        tagged_hit_type: taggedHit,
        play_result: str(get(r, "PlayResult", "play_result")),
      });
    }
  }
  return { pas: Array.from(pasMap.values()), pitches, battedBalls };
}
