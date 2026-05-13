import type { RawPA, RawPitch, RawBattedBall, AnalyticsFilters } from "./types";
import { matchesOutcome, matchesCountFilter, ZONE_LEFT, ZONE_RIGHT, ZONE_BOTTOM, ZONE_TOP } from "./constants";
import { computeStuffPlus, type LeagueBaselines } from "./stuffPlus";

export interface HeatmapPitch {
  x: number;
  y: number;
  type: string;
  call: string;
  result: string;
  endsPA: boolean;
  kOrBB: string | null;
}

export interface HittingComputed {
  stats: Record<string, string>;
  zonePitches: { x: number; y: number; type: string; call: string; result: string }[];
  heatmapPitches: HeatmapPitch[];
  battedBalls: RawBattedBall[];
}

interface Args {
  rawBatterPAs: RawPA[];
  rawBatterPitches: RawPitch[];
  rawBattedBalls: RawBattedBall[];
  batterPAResults: Map<string, string | null>;
  batterPitchCounts: Map<string, string>;
  filters: AnalyticsFilters;
  leagueBaselines: LeagueBaselines;
}

export function computeHitting({
  rawBatterPAs, rawBatterPitches, rawBattedBalls,
  batterPAResults, batterPitchCounts,
  filters, leagueBaselines,
}: Args): HittingComputed {
  const { selectedDates, handednessFilter, countFilter, ballsFilter, strikesFilter, pitchTypeFilter, pitchTypesFilter, outcomeFilter, veloRange } = filters;
  const pitchTypesActive = !!(pitchTypesFilter && pitchTypesFilter.length > 0);
  const ballsActive = !!(ballsFilter && ballsFilter.length > 0);
  const strikesActive = !!(strikesFilter && strikesFilter.length > 0);
  const countActive = ballsActive || strikesActive || countFilter !== "all";

  let filteredPAs = rawBatterPAs;
  if (selectedDates && selectedDates.length > 0) {
    const dateSet = new Set(selectedDates);
    filteredPAs = filteredPAs.filter((pa) => pa.games?.game_date && dateSet.has(pa.games.game_date));
  }
  if (handednessFilter !== "all") {
    filteredPAs = filteredPAs.filter((pa) => {
      const side = pa.players?.pitcher_side;
      // Strict match — switch pitchers (Both/Switch) and unknown sides are excluded
      // from both LHP and RHP buckets so totals add up correctly.
      if (handednessFilter === "LHP") return side === "Left";
      if (handednessFilter === "RHP") return side === "Right";
      return true;
    });
  }
  const filteredPAIds = new Set(filteredPAs.map((pa) => pa.pa_id));

  let filteredPitches = rawBatterPitches.filter((p) => filteredPAIds.has(p.pa_id));
  if (ballsActive || strikesActive) {
    filteredPitches = filteredPitches.filter((p) =>
      matchesCountFilter(batterPitchCounts.get(p.pitch_uid), ballsFilter, strikesFilter)
    );
  } else if (countFilter !== "all") {
    filteredPitches = filteredPitches.filter((p) => batterPitchCounts.get(p.pitch_uid) === countFilter);
  }
  if (pitchTypesActive) {
    filteredPitches = filteredPitches.filter((p) => pitchTypesFilter!.includes(p.tagged_pitch_type ?? ""));
  } else if (pitchTypeFilter !== "all") {
    filteredPitches = filteredPitches.filter((p) => p.tagged_pitch_type === pitchTypeFilter);
  }
  if (outcomeFilter !== "all") {
    filteredPitches = filteredPitches.filter((p) =>
      matchesOutcome(p.pitch_call ?? "", batterPAResults.get(p.pa_id) ?? null, outcomeFilter)
    );
  }
  if (veloRange[0] > 0 || veloRange[1] < 110) {
    filteredPitches = filteredPitches.filter((p) => {
      const v = p.rel_speed != null ? Number(p.rel_speed) : null;
      return v != null && v >= veloRange[0] && v <= veloRange[1];
    });
  }

  // For outcome stats (AVG/OBP/SLG/OPS/K%/BB%), restrict to PAs whose final pitch survives
  // the pitch-level filters. This makes "AVG with 2 strikes" or "AVG vs Fastballs" meaningful.
  const pitchFiltersActive =
    countActive || pitchTypesActive || pitchTypeFilter !== "all" || outcomeFilter !== "all" ||
    veloRange[0] > 0 || veloRange[1] < 110;

  let outcomePAs = filteredPAs;
  if (pitchFiltersActive) {
    // Find the last pitch (max pitch_of_pa) per PA among the original (PA-filtered) pitches,
    // then keep PAs whose last pitch is in filteredPitches.
    const lastPitchByPA = new Map<string, string>(); // pa_id -> pitch_uid of last pitch
    const lastPitchOrder = new Map<string, number>();
    rawBatterPitches.forEach((p) => {
      if (!filteredPAIds.has(p.pa_id)) return;
      const order = p.pitch_of_pa ?? 0;
      if (!lastPitchOrder.has(p.pa_id) || order > (lastPitchOrder.get(p.pa_id) ?? -1)) {
        lastPitchOrder.set(p.pa_id, order);
        lastPitchByPA.set(p.pa_id, p.pitch_uid);
      }
    });
    const survivingPitchUids = new Set(filteredPitches.map((p) => p.pitch_uid));
    const survivingPAIds = new Set<string>();
    lastPitchByPA.forEach((uid, paId) => {
      if (survivingPitchUids.has(uid)) survivingPAIds.add(paId);
    });
    outcomePAs = filteredPAs.filter((pa) => survivingPAIds.has(pa.pa_id));
  }

  const totalPAs = outcomePAs.length;
  const hits = outcomePAs.filter((p) => ["Single", "Double", "Triple", "HomeRun"].includes(p.play_result ?? "")).length;
  const singles = outcomePAs.filter((p) => p.play_result === "Single").length;
  const doubles = outcomePAs.filter((p) => p.play_result === "Double").length;
  const triples = outcomePAs.filter((p) => p.play_result === "Triple").length;
  const hrs = outcomePAs.filter((p) => p.play_result === "HomeRun").length;
  const walks = outcomePAs.filter((p) => p.k_or_bb === "Walk").length;
  const ks = outcomePAs.filter((p) => p.k_or_bb === "Strikeout").length;
  const abs = totalPAs - walks;
  const ba = abs > 0 ? (hits / abs).toFixed(3) : ".000";
  const obp = totalPAs > 0 ? ((hits + walks) / totalPAs).toFixed(3) : ".000";
  const tb = singles + doubles * 2 + triples * 3 + hrs * 4;
  const slg = abs > 0 ? (tb / abs).toFixed(3) : ".000";
  const ops = (parseFloat(obp) + parseFloat(slg)).toFixed(3);
  const kRate = totalPAs > 0 ? ((ks / totalPAs) * 100).toFixed(1) : "0.0";
  const bbRate = totalPAs > 0 ? ((walks / totalPAs) * 100).toFixed(1) : "0.0";

  // Use filteredPitches (which respects count/pitchType/outcome/velo) so spray chart
  // and batted-ball list update with all active filters — not just date/handedness.
  const filteredBBPitchUids = new Set(filteredPitches.map((p) => p.pitch_uid));
  const filteredBBs = rawBattedBalls.filter((bb) =>
    filteredBBPitchUids.has(bb.pitch_uid) && bb.play_result && bb.play_result !== "Undefined"
  );
  const exitSpeeds = filteredBBs.filter((b) => b.exit_speed).map((b) => Number(b.exit_speed));
  const avgEV = exitSpeeds.length > 0 ? (exitSpeeds.reduce((a, b) => a + b, 0) / exitSpeeds.length).toFixed(1) : "—";

  const swings = filteredPitches.filter((p) =>
    ["StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")
  );
  const whiffs = filteredPitches.filter((p) => p.pitch_call === "StrikeSwinging");
  const whiffPct = swings.length > 0 ? ((whiffs.length / swings.length) * 100).toFixed(1) : "0.0";

  const swingPct = filteredPitches.length > 0 ? ((swings.length / filteredPitches.length) * 100).toFixed(1) : "0.0";

  const locPitches = filteredPitches.filter((p) => p.plate_loc_height != null && p.plate_loc_side != null);
  const outsideZone = locPitches.filter(
    (p) => !(Number(p.plate_loc_side) >= ZONE_LEFT && Number(p.plate_loc_side) <= ZONE_RIGHT &&
      Number(p.plate_loc_height) >= ZONE_BOTTOM && Number(p.plate_loc_height) <= ZONE_TOP)
  );
  const chasedSwings = outsideZone.filter((p) =>
    ["StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")
  );
  const chasePct = outsideZone.length > 0 ? ((chasedSwings.length / outsideZone.length) * 100).toFixed(1) : "0.0";

  const allPitchesForPAs = rawBatterPitches.filter((p) => filteredPAIds.has(p.pa_id));
  const pPerPA = totalPAs > 0 ? (allPitchesForPAs.length / totalPAs).toFixed(2) : "0.00";

  const inZone = locPitches.filter(
    (p) => Number(p.plate_loc_side) >= ZONE_LEFT && Number(p.plate_loc_side) <= ZONE_RIGHT &&
      Number(p.plate_loc_height) >= ZONE_BOTTOM && Number(p.plate_loc_height) <= ZONE_TOP
  );
  const inZoneSwings = inZone.filter((p) =>
    ["StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")
  );
  const inZoneWhiffs = inZone.filter((p) => p.pitch_call === "StrikeSwinging");
  const inZoneWhiffPct = inZoneSwings.length > 0 ? ((inZoneWhiffs.length / inZoneSwings.length) * 100).toFixed(1) : "0.0";
  const zSwingPct = inZone.length > 0 ? ((inZoneSwings.length / inZone.length) * 100).toFixed(1) : "0.0";

  // Barrel% & Sweet Spot% (from filtered batted balls)
  const isBarrel = (ev: number, la: number) => {
    if (ev < 98) return false;
    // Expanding LA window: at 98 mph -> 26-30°, +1° per mph above 98 (capped at 8-50°).
    const extra = Math.floor(ev - 98);
    const lo = Math.max(8, 26 - extra);
    const hi = Math.min(50, 30 + extra);
    return la >= lo && la <= hi;
  };
  const evLaBalls = filteredBBs.filter((b) => b.exit_speed != null && b.angle != null);
  const barrels = evLaBalls.filter((b) => isBarrel(Number(b.exit_speed), Number(b.angle)));
  const barrelPct = evLaBalls.length > 0 ? ((barrels.length / evLaBalls.length) * 100).toFixed(1) : "0.0";
  const sweetSpots = evLaBalls.filter((b) => Number(b.angle) >= 8 && Number(b.angle) <= 32);
  const sweetSpotPct = evLaBalls.length > 0 ? ((sweetSpots.length / evLaBalls.length) * 100).toFixed(1) : "0.0";
  const iso = abs > 0 ? (parseFloat(slg) - parseFloat(ba)).toFixed(3) : ".000";

  // BA vs Stuff+ > 100
  const paStuffMap = new Map<string, number[]>();
  filteredPitches.forEach((p) => {
    const sp = computeStuffPlus(p, leagueBaselines[p.tagged_pitch_type ?? "Other"]);
    if (sp != null) {
      if (!paStuffMap.has(p.pa_id)) paStuffMap.set(p.pa_id, []);
      paStuffMap.get(p.pa_id)!.push(sp);
    }
  });
  const highStuffPAIds = new Set<string>();
  paStuffMap.forEach((scores, paId) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > 100) highStuffPAIds.add(paId);
  });
  const highStuffPAs = filteredPAs.filter((pa) => highStuffPAIds.has(pa.pa_id));
  const hsHits = highStuffPAs.filter((p) => ["Single", "Double", "Triple", "HomeRun"].includes(p.play_result ?? "")).length;
  const hsWalks = highStuffPAs.filter((p) => p.k_or_bb === "Walk").length;
  const hsABs = highStuffPAs.length - hsWalks;
  const baVsStuffPlus = hsABs > 0 ? (hsHits / hsABs).toFixed(3) : ".000";

  const highStuffPitchIds = new Set<string>();
  filteredPitches.forEach((p) => {
    const sp = computeStuffPlus(p, leagueBaselines[p.tagged_pitch_type ?? "Other"]);
    if (sp != null && sp > 100) highStuffPitchIds.add(p.pitch_uid);
  });
  const highStuffInPlay = filteredPitches.filter(
    (p) => highStuffPitchIds.has(p.pitch_uid) && p.pitch_call === "InPlay"
  );
  const hardContactVsStuff = highStuffInPlay.filter((p) => {
    const bb = filteredBBs.find((b) => b.pitch_uid === p.pitch_uid);
    return bb && bb.exit_speed != null && bb.exit_speed > 95;
  });
  const hardContactPct = highStuffInPlay.length > 0
    ? ((hardContactVsStuff.length / highStuffInPlay.length) * 100).toFixed(1)
    : "0.0";

  const highStuffSwings = filteredPitches.filter(
    (p) => highStuffPitchIds.has(p.pitch_uid) &&
      ["StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")
  );
  const highStuffWhiffs = filteredPitches.filter(
    (p) => highStuffPitchIds.has(p.pitch_uid) && p.pitch_call === "StrikeSwinging"
  );
  const whiffRateVsStuff = highStuffSwings.length > 0
    ? ((highStuffWhiffs.length / highStuffSwings.length) * 100).toFixed(1)
    : "0.0";

  const stats: Record<string, string> = {
    AVG: ba, OBP: obp, SLG: slg, OPS: ops, ISO: iso,
    "K%": kRate + "%", "BB%": bbRate + "%",
    "Avg EV": avgEV + " mph", "Whiff%": whiffPct + "%",
    "Swing%": swingPct + "%", "Z-Swing%": zSwingPct + "%", "O-Swing%": chasePct + "%",
    "P/PA": pPerPA, "IZ Whiff%": inZoneWhiffPct + "%",
    "Barrel%": barrelPct + "%", "Sweet Spot%": sweetSpotPct + "%",
    "BA vs Stuff+>100": baVsStuffPlus,
    "Hard Contact %": hardContactPct + "%",
    "Whiff Rate / 100": whiffRateVsStuff + "%",
    PAs: String(totalPAs), Hits: String(hits), HRs: String(hrs),
  };

  const zonePitches = filteredPitches
    .filter((p) => p.plate_loc_height && p.plate_loc_side && p.pitch_call === "InPlay")
    .map((p) => ({
      x: Number(p.plate_loc_side),
      y: Number(p.plate_loc_height),
      type: p.tagged_pitch_type ?? "Other",
      call: p.pitch_call ?? "",
      result: batterPAResults.get(p.pa_id) ?? "",
    }));

  // Include ALL located pitches (in & outside zone) so heatmap can compute BA, Swing%, Whiff%
  // across the full plate area including the shadow ring.
  // Tag the LAST pitch of each PA with endsPA + the PA's k_or_bb so we can attribute
  // strikeouts to the K-causing pitch's location for accurate per-cell BA.
  const lastPitchByPAForHeat = new Map<string, string>();
  const lastPitchOrderForHeat = new Map<string, number>();
  rawBatterPitches.forEach((p) => {
    if (!filteredPAIds.has(p.pa_id)) return;
    const order = p.pitch_of_pa ?? 0;
    if (!lastPitchOrderForHeat.has(p.pa_id) || order > (lastPitchOrderForHeat.get(p.pa_id) ?? -1)) {
      lastPitchOrderForHeat.set(p.pa_id, order);
      lastPitchByPAForHeat.set(p.pa_id, p.pitch_uid);
    }
  });
  const paKOrBB = new Map<string, string | null>();
  filteredPAs.forEach((pa) => paKOrBB.set(pa.pa_id, pa.k_or_bb ?? null));

  const heatmapPitches = filteredPitches
    .filter((p) => p.plate_loc_height != null && p.plate_loc_side != null)
    .map((p) => ({
      x: Number(p.plate_loc_side),
      y: Number(p.plate_loc_height),
      type: p.tagged_pitch_type ?? "Other",
      call: p.pitch_call ?? "",
      result: batterPAResults.get(p.pa_id) ?? "",
      endsPA: lastPitchByPAForHeat.get(p.pa_id) === p.pitch_uid,
      kOrBB: paKOrBB.get(p.pa_id) ?? null,
    }));

  return { stats, zonePitches, heatmapPitches, battedBalls: filteredBBs };
}
