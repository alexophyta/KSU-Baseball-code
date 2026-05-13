import { describe, it, expect } from "vitest";
import { computeHitting } from "@/lib/playerAnalytics/computeHitting";
import type { RawPA, RawPitch, RawBattedBall, AnalyticsFilters } from "@/lib/playerAnalytics/types";

const NO_FILTERS: AnalyticsFilters = {
  countFilter: "all",
  pitchTypeFilter: "all",
  handednessFilter: "all",
  outcomeFilter: "all",
  selectedDates: [],
  veloRange: [0, 110],
};

// Build a minimal PA + final pitch for that PA.
function pa(id: string, opts: Partial<RawPA>): RawPA {
  return {
    pa_id: id,
    play_result: null,
    k_or_bb: null,
    games: { game_date: "2025-04-01" },
    players: { pitcher_side: "Right" },
    ...opts,
  };
}
function pitch(uid: string, paId: string, opts: Partial<RawPitch> = {}): RawPitch {
  return {
    pitch_uid: uid,
    pa_id: paId,
    tagged_pitch_type: "Fastball",
    pitch_call: "InPlay",
    pitch_of_pa: 1,
    rel_speed: 92,
    plate_loc_height: 2.5,
    plate_loc_side: 0,
    ...opts,
  };
}

describe("computeHitting — MLB stat formulas", () => {
  it("computes AVG = H / AB and OBP = (H+BB)/PA", () => {
    // 10 PAs: 3 singles, 1 HR, 1 walk, 1 K, 4 outs (Out)
    const pas: RawPA[] = [
      pa("p1", { play_result: "Single" }),
      pa("p2", { play_result: "Single" }),
      pa("p3", { play_result: "Single" }),
      pa("p4", { play_result: "HomeRun" }),
      pa("p5", { k_or_bb: "Walk" }),
      pa("p6", { k_or_bb: "Strikeout" }),
      pa("p7", { play_result: "Out" }),
      pa("p8", { play_result: "Out" }),
      pa("p9", { play_result: "Out" }),
      pa("p10", { play_result: "Out" }),
    ];
    const pitches = pas.map((p, i) => pitch(`u${i}`, p.pa_id));
    const result = computeHitting({
      rawBatterPAs: pas,
      rawBatterPitches: pitches,
      rawBattedBalls: [],
      batterPAResults: new Map(pas.map((p) => [p.pa_id, p.play_result])),
      batterPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    // H = 4, BB = 1, AB = PA - BB = 9, AVG = 4/9 = .444
    expect(result.stats.AVG).toBe("0.444");
    // OBP = (H + BB) / PA = 5/10 = .500
    expect(result.stats.OBP).toBe("0.500");
    // SLG = TB / AB = (3 + 4) / 9 = .778
    expect(result.stats.SLG).toBe("0.778");
    // K% = 1/10 = 10.0%
    expect(result.stats["K%"]).toBe("10.0%");
    // BB% = 1/10 = 10.0%
    expect(result.stats["BB%"]).toBe("10.0%");
  });

  it("counts strikeouts as ABs (Trackman writes play_result=Undefined on K)", () => {
    const pas: RawPA[] = [
      pa("p1", { play_result: "Undefined", k_or_bb: "Strikeout" }),
      pa("p2", { play_result: "Single" }),
    ];
    const pitches = pas.map((p, i) => pitch(`u${i}`, p.pa_id));
    const result = computeHitting({
      rawBatterPAs: pas,
      rawBatterPitches: pitches,
      rawBattedBalls: [],
      batterPAResults: new Map(),
      batterPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    // PA=2, BB=0 → AB=2; H=1; AVG = 1/2 = .500 (NOT 1/1 if K were excluded)
    expect(result.stats.AVG).toBe("0.500");
  });

  it("returns .000 / 0.0% safely when no PAs", () => {
    const result = computeHitting({
      rawBatterPAs: [],
      rawBatterPitches: [],
      rawBattedBalls: [],
      batterPAResults: new Map(),
      batterPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    expect(result.stats.AVG).toBe(".000");
    expect(result.stats.OBP).toBe(".000");
    expect(result.stats["K%"]).toBe("0.0%");
  });

  it("computes Avg Exit Velocity from batted balls only", () => {
    const pas: RawPA[] = [pa("p1", { play_result: "Single" }), pa("p2", { play_result: "HomeRun" })];
    const pitches = [pitch("u1", "p1"), pitch("u2", "p2")];
    const bbs: RawBattedBall[] = [
      { pitch_uid: "u1", exit_speed: 95, play_result: "Single" },
      { pitch_uid: "u2", exit_speed: 105, play_result: "HomeRun" },
    ];
    const result = computeHitting({
      rawBatterPAs: pas,
      rawBatterPitches: pitches,
      rawBattedBalls: bbs,
      batterPAResults: new Map(),
      batterPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    expect(result.stats["Avg EV"]).toBe("100.0 mph");
  });
});
