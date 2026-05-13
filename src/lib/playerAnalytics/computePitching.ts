import type { RawPA, RawPitch, RawBattedBall, AnalyticsFilters, PitchTypeRow, PlayerLite } from "./types";
import { matchesOutcome, matchesCountFilter, ZONE_LEFT, ZONE_RIGHT, ZONE_BOTTOM, ZONE_TOP } from "./constants";
import { computeStuffPlus, type LeagueBaselines } from "./stuffPlus";

export interface CountTendency {
  count: string;       // e.g. "0-0"
  total: number;       // pitches thrown in this count
  usage: { type: string; count: number; pct: number }[]; // sorted desc by count
}

export interface PitchingComputed {
  stats: Record<string, string>;
  breakdown: PitchTypeRow[];
  pitchTypeNames: string[];
  locs: { x: number; y: number; type: string; call: string }[];
  locsByType: Record<string, { x: number; y: number; type: string; call: string }[]>;
  movement: { x: number; y: number; type: string }[];
  release: { x: number; y: number; type: string }[];
  tendencies: CountTendency[];
}

interface PitchingArgs {
  rawPitcherPAs: RawPA[];
  rawPitcherPitches: RawPitch[];
  rawPitcherBattedBalls?: RawBattedBall[];
  pitcherPAResults: Map<string, string | null>;
  pitcherPitchCounts: Map<string, string>;
  filters: AnalyticsFilters;
  leagueBaselines: LeagueBaselines;
}

export function computePitching({
  rawPitcherPAs, rawPitcherPitches, rawPitcherBattedBalls = [],
  pitcherPAResults, pitcherPitchCounts,
  filters, leagueBaselines,
}: PitchingArgs): PitchingComputed {
  const { selectedDates, handednessFilter, countFilter, ballsFilter, strikesFilter, pitchTypeFilter, pitchTypesFilter, outcomeFilter, batterFilter } = filters;
  const pitchTypesActive = !!(pitchTypesFilter && pitchTypesFilter.length > 0);

  let filteredPAs = rawPitcherPAs;
  if (selectedDates && selectedDates.length > 0) {
    const dateSet = new Set(selectedDates);
    filteredPAs = filteredPAs.filter((pa) => pa.games?.game_date && dateSet.has(pa.games.game_date));
  }
  if (batterFilter && batterFilter !== "all") {
    filteredPAs = filteredPAs.filter((pa) => String(pa.batter_id ?? "") === batterFilter);
  }
  if (handednessFilter !== "all") {
    filteredPAs = filteredPAs.filter((pa) => {
      const side = pa.players?.batter_side;
      // Strict match — switch hitters and unknown sides excluded from both buckets.
      if (handednessFilter === "LHH") return side === "Left";
      if (handednessFilter === "RHH") return side === "Right";
      return true;
    });
  }
  const filteredPAIds = new Set(filteredPAs.map((pa) => pa.pa_id));

  let filteredPitches = rawPitcherPitches.filter((p) => filteredPAIds.has(p.pa_id));
  if ((ballsFilter && ballsFilter.length > 0) || (strikesFilter && strikesFilter.length > 0)) {
    filteredPitches = filteredPitches.filter((p) =>
      matchesCountFilter(pitcherPitchCounts.get(p.pitch_uid), ballsFilter, strikesFilter)
    );
  } else if (countFilter !== "all") {
    filteredPitches = filteredPitches.filter((p) => pitcherPitchCounts.get(p.pitch_uid) === countFilter);
  }
  if (pitchTypesActive) {
    filteredPitches = filteredPitches.filter((p) => pitchTypesFilter!.includes(p.tagged_pitch_type ?? ""));
  } else if (pitchTypeFilter !== "all") {
    filteredPitches = filteredPitches.filter((p) => p.tagged_pitch_type === pitchTypeFilter);
  }
  if (outcomeFilter !== "all") {
    filteredPitches = filteredPitches.filter((p) =>
      matchesOutcome(p.pitch_call ?? "", pitcherPAResults.get(p.pa_id) ?? null, outcomeFilter)
    );
  }

  const allPitches = filteredPitches;
  const totalPAs = filteredPAs.length;
  const totalPitches = allPitches.length;
  const ks = filteredPAs.filter((p) => p.k_or_bb === "Strikeout").length;
  const walks = filteredPAs.filter((p) => p.k_or_bb === "Walk").length;
  const hits = filteredPAs.filter((p) => ["Single", "Double", "Triple", "HomeRun"].includes(p.play_result ?? "")).length;
  const abs = totalPAs - walks;
  const oppBA = abs > 0 ? (hits / abs).toFixed(3) : ".000";
  const kRate = totalPAs > 0 ? ((ks / totalPAs) * 100).toFixed(1) : "0.0";
  const bbRate = totalPAs > 0 ? ((walks / totalPAs) * 100).toFixed(1) : "0.0";

  const fastballs = allPitches.filter(
    (p) => ["Fastball", "Four-Seam", "Sinker"].includes(p.tagged_pitch_type ?? "") && p.rel_speed
  );
  const avgFBV = fastballs.length > 0
    ? (fastballs.reduce((s, p) => s + Number(p.rel_speed), 0) / fastballs.length).toFixed(1)
    : "—";

  const locPitches = allPitches.filter((p) => p.plate_loc_height != null && p.plate_loc_side != null);
  const inZone = locPitches.filter(
    (p) => Number(p.plate_loc_side) >= ZONE_LEFT && Number(p.plate_loc_side) <= ZONE_RIGHT &&
      Number(p.plate_loc_height) >= ZONE_BOTTOM && Number(p.plate_loc_height) <= ZONE_TOP
  );
  const zonePct = locPitches.length > 0 ? ((inZone.length / locPitches.length) * 100).toFixed(1) : "0.0";

  const calledStrikes = allPitches.filter((p) => p.pitch_call === "StrikeCalled");
  const swingingStrikes = allPitches.filter((p) => p.pitch_call === "StrikeSwinging");
  const cswPct = totalPitches > 0 ? (((calledStrikes.length + swingingStrikes.length) / totalPitches) * 100).toFixed(1) : "0.0";

  const firstPitches = allPitches.filter((p) => p.pitch_of_pa === 1);
  const firstPitchStrikes = firstPitches.filter((p) =>
    ["StrikeCalled", "StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")
  );
  const fpsPct = firstPitches.length > 0 ? ((firstPitchStrikes.length / firstPitches.length) * 100).toFixed(1) : "0.0";

  const outsideZone = locPitches.filter(
    (p) => !(Number(p.plate_loc_side) >= ZONE_LEFT && Number(p.plate_loc_side) <= ZONE_RIGHT &&
      Number(p.plate_loc_height) >= ZONE_BOTTOM && Number(p.plate_loc_height) <= ZONE_TOP)
  );
  const chasedSwings = outsideZone.filter((p) =>
    ["StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")
  );
  const chasePct = outsideZone.length > 0 ? ((chasedSwings.length / outsideZone.length) * 100).toFixed(1) : "0.0";

  // IP = outs ÷ 3. `outs_on_play` from Trackman only fires on fielding outs, so
  // strikeouts and most non-contact outs come through as 0. We infer 1 out for
  // any PA that ended in an out (K / Out / FieldersChoice / Sacrifice) when
  // outs_on_play is 0, and respect outs_on_play when > 0 (handles DPs/TPs).
  const OUT_RESULTS = new Set(["Out", "FieldersChoice", "Sacrifice"]);
  const totalOuts = filteredPAs.reduce((s, pa) => {
    const oop = pa.outs_on_play ?? 0;
    if (oop > 0) return s + oop;
    const endedInOut = pa.k_or_bb === "Strikeout" || OUT_RESULTS.has(pa.play_result ?? "");
    return s + (endedInOut ? 1 : 0);
  }, 0);
  const ipNum = totalOuts / 3;
  const ipDisplay = totalOuts > 0
    ? `${Math.floor(ipNum)}.${totalOuts % 3}`
    : "0.0";
  const whip = ipNum > 0 ? ((walks + hits) / ipNum).toFixed(2) : "—";
  const kPer9 = ipNum > 0 ? ((ks * 9) / ipNum).toFixed(1) : "—";
  const bbPer9 = ipNum > 0 ? ((walks * 9) / ipNum).toFixed(1) : "—";
  const kbbRatio = walks > 0 ? (ks / walks).toFixed(2) : (ks > 0 ? "∞" : "—");

  const stats: Record<string, string> = {
    "Opp AVG": oppBA, "K%": kRate + "%", "BB%": bbRate + "%",
    WHIP: whip, "K/BB": kbbRatio, "K/9": kPer9, "BB/9": bbPer9,
    "Avg FB Velo": avgFBV + " mph", "Zone%": zonePct + "%", "CSW%": cswPct + "%",
    "FPS%": fpsPct + "%", "Chase%": chasePct + "%",
    IP: ipDisplay,
    "Total BF": String(totalPAs), "Strikeouts": String(ks), "Walks": String(walks),
  };

  const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "—";
  const typeMap: Record<string, { count: number; velos: number[]; spins: number[]; ivbs: number[]; hbs: number[]; vaas: number[]; haas: number[]; relHeights: number[]; extensions: number[]; swings: number; whiffs: number; csw: number }> = {};
  allPitches.forEach((p) => {
    const type = p.tagged_pitch_type ?? "Other";
    if (!typeMap[type]) typeMap[type] = { count: 0, velos: [], spins: [], ivbs: [], hbs: [], vaas: [], haas: [], relHeights: [], extensions: [], swings: 0, whiffs: 0, csw: 0 };
    const t = typeMap[type];
    t.count++;
    if (p.rel_speed) t.velos.push(Number(p.rel_speed));
    if (p.spin_rate) t.spins.push(Number(p.spin_rate));
    if (p.induced_vert_break != null) t.ivbs.push(Number(p.induced_vert_break));
    if (p.horz_break != null) t.hbs.push(Number(p.horz_break));
    if (p.vert_appr_angle != null) t.vaas.push(Number(p.vert_appr_angle));
    if (p.horz_appr_angle != null) t.haas.push(Number(p.horz_appr_angle));
    if (p.rel_height != null) t.relHeights.push(Number(p.rel_height));
    if (p.extension != null) t.extensions.push(Number(p.extension));
    if (["StrikeSwinging", "FoulBallNotFieldable", "InPlay"].includes(p.pitch_call ?? "")) t.swings++;
    if (p.pitch_call === "StrikeSwinging") t.whiffs++;
    if (p.pitch_call === "StrikeCalled" || p.pitch_call === "StrikeSwinging") t.csw++;
  });

  const pitchStuffByType: Record<string, number[]> = {};
  allPitches.forEach((p) => {
    const type = p.tagged_pitch_type ?? "Other";
    const sp = computeStuffPlus(p, leagueBaselines[type]);
    if (sp != null) {
      if (!pitchStuffByType[type]) pitchStuffByType[type] = [];
      pitchStuffByType[type].push(sp);
    }
  });

  // Map pitch_uid -> tagged_hit_type (for GB%/FB%/LD% per pitch type).
  const hitTypeByPitchUid = new Map<string, string>();
  rawPitcherBattedBalls.forEach((bb) => {
    if (bb.tagged_hit_type) hitTypeByPitchUid.set(bb.pitch_uid, bb.tagged_hit_type);
  });
  // Buckets per pitch type: [gb, fb, ld, totalBatted]
  const battedByType: Record<string, { gb: number; fb: number; ld: number; total: number }> = {};
  allPitches.forEach((p) => {
    const ht = hitTypeByPitchUid.get(p.pitch_uid);
    if (!ht) return;
    const type = p.tagged_pitch_type ?? "Other";
    if (!battedByType[type]) battedByType[type] = { gb: 0, fb: 0, ld: 0, total: 0 };
    const b = battedByType[type];
    b.total++;
    if (ht === "GroundBall") b.gb++;
    else if (ht === "FlyBall" || ht === "Popup") b.fb++;
    else if (ht === "LineDrive") b.ld++;
  });

  const pct = (n: number, d: number) => d > 0 ? ((n / d) * 100).toFixed(1) : "—";

  const breakdown: PitchTypeRow[] = Object.entries(typeMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([type, t]) => {
      const spArr = pitchStuffByType[type] ?? [];
      const avgStuff = spArr.length > 0 ? (spArr.reduce((a, b) => a + b, 0) / spArr.length).toFixed(0) : "—";
      const bb = battedByType[type];
      return {
        type,
        count: t.count,
        usagePct: totalPitches > 0 ? ((t.count / totalPitches) * 100).toFixed(1) : "0.0",
        avgVelo: avg(t.velos),
        maxVelo: t.velos.length > 0 ? Math.max(...t.velos).toFixed(1) : "—",
        avgSpin: t.spins.length > 0 ? Math.round(t.spins.reduce((a, b) => a + b, 0) / t.spins.length).toString() : "—",
        avgIVB: avg(t.ivbs),
        avgHB: avg(t.hbs),
        avgVAA: avg(t.vaas),
        avgHAA: avg(t.haas),
        avgRelHeight: avg(t.relHeights),
        avgExtension: avg(t.extensions),
        whiffs: t.whiffs,
        whiffPct: t.swings > 0 ? ((t.whiffs / t.swings) * 100).toFixed(1) : "0.0",
        cswPct: t.count > 0 ? ((t.csw / t.count) * 100).toFixed(1) : "0.0",
        stuffPlus: avgStuff,
        gbPct: bb ? pct(bb.gb, bb.total) : "—",
        fbPct: bb ? pct(bb.fb, bb.total) : "—",
        ldPct: bb ? pct(bb.ld, bb.total) : "—",
      };
    });

  const pitchTypeNames = breakdown.map((b) => b.type);

  const locs = allPitches
    .filter((p) => p.plate_loc_height != null && p.plate_loc_side != null)
    .map((p) => ({
      x: Number(p.plate_loc_side),
      y: Number(p.plate_loc_height),
      type: p.tagged_pitch_type ?? "Other",
      call: p.pitch_call ?? "",
    }));

  const locsByType: Record<string, typeof locs> = {};
  locs.forEach((l) => {
    if (!locsByType[l.type]) locsByType[l.type] = [];
    locsByType[l.type].push(l);
  });

  const movement = allPitches
    .filter((p) => p.horz_break != null && p.induced_vert_break != null)
    .map((p) => ({ x: Number(p.horz_break), y: Number(p.induced_vert_break), type: p.tagged_pitch_type ?? "Other" }));

  const release = allPitches
    .filter((p) => p.rel_side != null && p.rel_height != null)
    .map((p) => ({ x: Number(p.rel_side), y: Number(p.rel_height), type: p.tagged_pitch_type ?? "Other" }));

  // Pitch tendencies by count: usage % of each pitch type at every ball-strike count.
  const COUNT_ORDER = ["0-0","0-1","0-2","1-0","1-1","1-2","2-0","2-1","2-2","3-0","3-1","3-2"];
  const byCount: Record<string, Record<string, number>> = {};
  allPitches.forEach((p) => {
    const c = pitcherPitchCounts.get(p.pitch_uid);
    if (!c) return;
    const type = p.tagged_pitch_type ?? "Other";
    if (!byCount[c]) byCount[c] = {};
    byCount[c][type] = (byCount[c][type] ?? 0) + 1;
  });
  const tendencies: CountTendency[] = COUNT_ORDER.map((count) => {
    const types = byCount[count] ?? {};
    const total = Object.values(types).reduce((s, n) => s + n, 0);
    const usage = Object.entries(types)
      .map(([type, n]) => ({ type, count: n, pct: total > 0 ? (n / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
    return { count, total, usage };
  });

  return { stats, breakdown, pitchTypeNames, locs, locsByType, movement, release, tendencies };
}

// ============ Inning detail (used only when a single game is selected) ============

export interface InningPitchRow {
  pitchOfPA: number;
  batterName: string;
  pitchType: string;
  pitchCall: string;
  velocity: string;
  spinRate: string;
  tilt: string;
  ivb: string;
  hb: string;
  vaa: string;
  haa: string;
  extension: string;
  relHeight: string;
}

export interface InningHalf {
  label: string;
  pitchRows: InningPitchRow[];
  batterZones: {
    title: string;
    pitches: { x: number; y: number; type: string; call: string; pitchOfPA: number }[];
  }[];
}

interface InningArgs {
  rawPitcherPAs: RawPA[];
  rawPitcherPitches: RawPitch[];
  selectedDates: string[];
  pitcherDisplayName: string;
  batterNameLookup: Map<number, string>;
}

export function computeInningData({
  rawPitcherPAs, rawPitcherPitches, selectedDates,
  pitcherDisplayName, batterNameLookup,
}: InningArgs): InningHalf[] | null {
  // Inning detail only renders for a single selected game.
  if (!selectedDates || selectedDates.length !== 1) return null;
  const date = selectedDates[0];
  const gamePAs = rawPitcherPAs.filter((pa) => pa.games?.game_date === date);
  if (gamePAs.length === 0) return null;
  const gamePAIds = new Set(gamePAs.map((pa) => pa.pa_id));
  const gamePitches = rawPitcherPitches.filter((p) => gamePAIds.has(p.pa_id));
  const paMap = new Map<string, RawPA>();
  gamePAs.forEach((pa) => paMap.set(pa.pa_id, pa));

  const innings = new Map<string, RawPA[]>();
  gamePAs.forEach((pa) => {
    const key = `${pa.top_bottom}_${pa.inning}`;
    if (!innings.has(key)) innings.set(key, []);
    innings.get(key)!.push(pa);
  });

  const sortedKeys = Array.from(innings.keys()).sort((a, b) => {
    const [tbA, innA] = a.split("_");
    const [tbB, innB] = b.split("_");
    const innDiff = Number(innA) - Number(innB);
    if (innDiff !== 0) return innDiff;
    return tbA === "Top" ? -1 : 1;
  });

  const result: InningHalf[] = [];
  for (const key of sortedKeys) {
    const [topBottom, innNum] = key.split("_");
    const label = `${topBottom} ${innNum}`;
    const innPAs = innings.get(key)!;
    const innPAIds = new Set(innPAs.map((pa) => pa.pa_id));
    const innPitches = gamePitches
      .filter((p) => innPAIds.has(p.pa_id))
      .sort((a, b) => {
        const paA = paMap.get(a.pa_id);
        const paB = paMap.get(b.pa_id);
        const paOrder = (paA?.pa_of_inning ?? 0) - (paB?.pa_of_inning ?? 0);
        if (paOrder !== 0) return paOrder;
        return (a.pitch_of_pa ?? 0) - (b.pitch_of_pa ?? 0);
      });

    const pitchRows: InningPitchRow[] = innPitches.map((p) => {
      const pa = paMap.get(p.pa_id);
      const batterName = pa && pa.batter_id != null ? (batterNameLookup.get(pa.batter_id) ?? "Unknown") : "Unknown";
      let displayCall = p.pitch_call ?? "—";
      if (p.pitch_call === "InPlay" && pa?.play_result) displayCall = pa.play_result;
      return {
        pitchOfPA: p.pitch_of_pa ?? 0,
        batterName,
        pitchType: p.tagged_pitch_type ?? "—",
        pitchCall: displayCall,
        velocity: p.rel_speed ? Number(p.rel_speed).toFixed(1) : "—",
        spinRate: p.spin_rate ? Math.round(Number(p.spin_rate)).toString() : "—",
        tilt: p.tilt ?? "—",
        ivb: p.induced_vert_break != null ? Number(p.induced_vert_break).toFixed(2) : "—",
        hb: p.horz_break != null ? Number(p.horz_break).toFixed(2) : "—",
        vaa: p.vert_appr_angle != null ? Number(p.vert_appr_angle).toFixed(2) : "—",
        haa: p.horz_appr_angle != null ? Number(p.horz_appr_angle).toFixed(2) : "—",
        extension: p.extension != null ? Number(p.extension).toFixed(2) : "—",
        relHeight: p.rel_height != null ? Number(p.rel_height).toFixed(2) : "—",
      };
    });

    const batterZones: InningHalf["batterZones"] = [];
    for (const pa of innPAs) {
      const batterName = pa.batter_id != null ? (batterNameLookup.get(pa.batter_id) ?? "Unknown") : "Unknown";
      const paPitches = gamePitches
        .filter((p) => p.pa_id === pa.pa_id && p.plate_loc_height != null && p.plate_loc_side != null)
        .sort((a, b) => (a.pitch_of_pa ?? 0) - (b.pitch_of_pa ?? 0))
        .map((p) => ({
          x: Number(p.plate_loc_side),
          y: Number(p.plate_loc_height),
          type: p.tagged_pitch_type ?? "Other",
          call: p.pitch_call ?? "",
          pitchOfPA: p.pitch_of_pa ?? 0,
        }));
      if (paPitches.length > 0) {
        batterZones.push({ title: `${pitcherDisplayName} vs ${batterName} ${label}`, pitches: paPitches });
      }
    }

    result.push({ label, pitchRows, batterZones });
  }
  return result;
}

// Re-export for convenience
export type { PlayerLite };
