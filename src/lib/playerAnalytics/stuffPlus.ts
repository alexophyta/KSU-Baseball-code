import { supabase } from "@/integrations/supabase/client";
import type { RawPitch } from "./types";

export interface LeagueBaseline {
  mean: { velo: number; spin: number; ivb: number; hb: number; ext: number; vaa: number };
  std: { velo: number; spin: number; ivb: number; hb: number; ext: number; vaa: number };
}

export type LeagueBaselines = Record<string, LeagueBaseline>;

export type StuffWeights = { velo: number; ivb: number; hb: number; ext: number; spin: number; vaa: number };

// VAA is transformed to "distance from -5" — farther up or down is better.
// Per-pitch-type weights. Each set sums to 1.0.
// Fastball/Cutter: VAA + movement + velo emphasized.
// Slider: similar to fastball but more movement.
// Curveball: movement, VAA, spin emphasized; velo less important.
export const STUFF_WEIGHTS_BY_TYPE: Record<string, StuffWeights> = {
  Fastball:  { velo: 0.22, ivb: 0.18, hb: 0.13, vaa: 0.25, ext: 0.17, spin: 0.05 },
  FourSeamFastBall: { velo: 0.22, ivb: 0.18, hb: 0.13, vaa: 0.25, ext: 0.17, spin: 0.05 },
  Sinker:    { velo: 0.22, ivb: 0.13, hb: 0.18, vaa: 0.20, ext: 0.17, spin: 0.10 },
  TwoSeamFastBall: { velo: 0.22, ivb: 0.13, hb: 0.18, vaa: 0.20, ext: 0.17, spin: 0.10 },
  Cutter:    { velo: 0.18, ivb: 0.18, hb: 0.13, vaa: 0.24, ext: 0.17, spin: 0.10 },
  Slider:    { velo: 0.15, ivb: 0.20, hb: 0.25, vaa: 0.20, ext: 0.10, spin: 0.10 },
  Sweeper:   { velo: 0.10, ivb: 0.15, hb: 0.30, vaa: 0.20, ext: 0.10, spin: 0.15 },
  Curveball: { velo: 0.05, ivb: 0.25, hb: 0.20, vaa: 0.20, ext: 0.10, spin: 0.20 },
  Splitter:  { velo: 0.20, ivb: 0.20, hb: 0.15, vaa: 0.20, ext: 0.15, spin: 0.10 },
  ChangeUp:  { velo: 0.20, ivb: 0.20, hb: 0.15, vaa: 0.20, ext: 0.15, spin: 0.10 },
  Changeup:  { velo: 0.20, ivb: 0.20, hb: 0.15, vaa: 0.20, ext: 0.15, spin: 0.10 },
};

export const DEFAULT_STUFF_WEIGHTS: StuffWeights = {
  velo: 0.20, ivb: 0.20, hb: 0.20, vaa: 0.20, ext: 0.10, spin: 0.10,
};

export const STUFF_SCALE = 10;
export const VAA_ANCHOR = -5;

function getWeights(pitchType: string | null | undefined): StuffWeights {
  if (!pitchType) return DEFAULT_STUFF_WEIGHTS;
  return STUFF_WEIGHTS_BY_TYPE[pitchType] ?? DEFAULT_STUFF_WEIGHTS;
}

export function computeStuffPlus(
  pitch: Pick<RawPitch, "rel_speed" | "spin_rate" | "induced_vert_break" | "horz_break" | "extension" | "vert_appr_angle"> & { tagged_pitch_type?: string | null },
  baseline: LeagueBaseline | undefined,
  pitchType?: string | null,
): number | null {
  if (!baseline) return null;
  const weights = getWeights(pitchType ?? pitch.tagged_pitch_type ?? null);
  const vals = {
    velo: pitch.rel_speed != null ? Number(pitch.rel_speed) : null,
    spin: pitch.spin_rate != null ? Number(pitch.spin_rate) : null,
    ivb: pitch.induced_vert_break != null ? Number(pitch.induced_vert_break) : null,
    hb: pitch.horz_break != null ? Math.abs(Number(pitch.horz_break)) : null,
    ext: pitch.extension != null ? Number(pitch.extension) : null,
    // Distance from -5: farther up or down is better.
    vaa: pitch.vert_appr_angle != null ? Math.abs(Number(pitch.vert_appr_angle) - VAA_ANCHOR) : null,
  };
  let totalWeight = 0;
  let weightedZ = 0;
  for (const key of ["velo", "spin", "ivb", "hb", "ext", "vaa"] as const) {
    const v = vals[key];
    if (v == null || baseline.std[key] === 0) continue;
    const z = (v - baseline.mean[key]) / baseline.std[key];
    weightedZ += weights[key] * z;
    totalWeight += weights[key];
  }
  if (totalWeight === 0) return null;
  return 100 + (weightedZ / totalWeight) * STUFF_SCALE;
}

// Fetch league-wide baselines from the pitches table (used by both PlayerData and Scouting).
export async function fetchLeagueBaselines(): Promise<LeagueBaselines> {
  const { data } = await supabase
    .from("pitches")
    .select("tagged_pitch_type, rel_speed, spin_rate, induced_vert_break, horz_break, extension, vert_appr_angle");
  if (!data) return {};
  const groups: Record<string, { velos: number[]; spins: number[]; ivbs: number[]; hbs: number[]; exts: number[]; vaas: number[] }> = {};
  data.forEach((p) => {
    const t = p.tagged_pitch_type ?? "Other";
    if (!groups[t]) groups[t] = { velos: [], spins: [], ivbs: [], hbs: [], exts: [], vaas: [] };
    const g = groups[t];
    if (p.rel_speed != null) g.velos.push(Number(p.rel_speed));
    if (p.spin_rate != null) g.spins.push(Number(p.spin_rate));
    if (p.induced_vert_break != null) g.ivbs.push(Number(p.induced_vert_break));
    if (p.horz_break != null) g.hbs.push(Math.abs(Number(p.horz_break)));
    if (p.extension != null) g.exts.push(Number(p.extension));
    if (p.vert_appr_angle != null) g.vaas.push(Math.abs(Number(p.vert_appr_angle) - VAA_ANCHOR));
  });
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const std = (arr: number[], m: number) => {
    if (arr.length < 2) return 1;
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  };
  const baselines: LeagueBaselines = {};
  Object.entries(groups).forEach(([type, g]) => {
    const mv = mean(g.velos), ms = mean(g.spins), mi = mean(g.ivbs), mh = mean(g.hbs), me = mean(g.exts), mvaa = mean(g.vaas);
    baselines[type] = {
      mean: { velo: mv, spin: ms, ivb: mi, hb: mh, ext: me, vaa: mvaa },
      std: { velo: std(g.velos, mv), spin: std(g.spins, ms), ivb: std(g.ivbs, mi), hb: std(g.hbs, mh), ext: std(g.exts, me), vaa: std(g.vaas, mvaa) },
    };
  });
  return baselines;
}

// Backwards-compat export (not used internally anymore).
export const STUFF_WEIGHTS = { velo: 0.30, ivb: 0.25, hb: 0.20, ext: 0.15, spin: 0.10 };
