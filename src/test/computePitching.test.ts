import { describe, it, expect } from "vitest";
import { computePitching } from "@/lib/playerAnalytics/computePitching";
import type { RawPA, RawPitch, AnalyticsFilters } from "@/lib/playerAnalytics/types";

const NO_FILTERS: AnalyticsFilters = {
  countFilter: "all",
  pitchTypeFilter: "all",
  handednessFilter: "all",
  outcomeFilter: "all",
  selectedDates: [],
  veloRange: [0, 110],
};

function pa(id: string, opts: Partial<RawPA>): RawPA {
  return {
    pa_id: id,
    play_result: null,
    k_or_bb: null,
    games: { game_date: "2025-04-01" },
    players: { batter_side: "Right" },
    ...opts,
  };
}
function pitch(uid: string, paId: string, opts: Partial<RawPitch> = {}): RawPitch {
  return {
    pitch_uid: uid,
    pa_id: paId,
    tagged_pitch_type: "Fastball",
    pitch_call: "StrikeCalled",
    pitch_of_pa: 1,
    rel_speed: 93,
    plate_loc_height: 2.5,
    plate_loc_side: 0,
    ...opts,
  };
}

describe("computePitching — MLB stat formulas", () => {
  it("computes Opp AVG = H / AB and K% / BB% per BF", () => {
    const pas: RawPA[] = [
      pa("p1", { play_result: "Single" }),
      pa("p2", { play_result: "Out" }),
      pa("p3", { play_result: "Out" }),
      pa("p4", { play_result: "Out" }),
      pa("p5", { k_or_bb: "Strikeout" }),
      pa("p6", { k_or_bb: "Walk" }),
    ];
    const pitches = pas.map((p, i) => pitch(`u${i}`, p.pa_id));
    const result = computePitching({
      rawPitcherPAs: pas,
      rawPitcherPitches: pitches,
      pitcherPAResults: new Map(),
      pitcherPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    // BF=6, BB=1, AB=5, H=1, Opp AVG = 1/5 = .200
    expect(result.stats["Opp AVG"]).toBe("0.200");
    // K% = 1/6 ≈ 16.7%
    expect(result.stats["K%"]).toBe("16.7%");
    // BB% = 1/6 ≈ 16.7%
    expect(result.stats["BB%"]).toBe("16.7%");
    expect(result.stats["Total BF"]).toBe("6");
  });

  it("computes CSW% = (StrikeCalled + StrikeSwinging) / total pitches", () => {
    const pas: RawPA[] = [pa("p1", { play_result: "Out" })];
    const pitches: RawPitch[] = [
      pitch("u1", "p1", { pitch_call: "StrikeCalled" }),
      pitch("u2", "p1", { pitch_call: "StrikeSwinging" }),
      pitch("u3", "p1", { pitch_call: "BallCalled" }),
      pitch("u4", "p1", { pitch_call: "InPlay" }),
    ];
    const result = computePitching({
      rawPitcherPAs: pas,
      rawPitcherPitches: pitches,
      pitcherPAResults: new Map(),
      pitcherPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    // 2 of 4 = 50.0%
    expect(result.stats["CSW%"]).toBe("50.0%");
  });

  it("safely returns zeros when there is no data", () => {
    const result = computePitching({
      rawPitcherPAs: [],
      rawPitcherPitches: [],
      pitcherPAResults: new Map(),
      pitcherPitchCounts: new Map(),
      filters: NO_FILTERS,
      leagueBaselines: {},
    });
    expect(result.stats["Opp AVG"]).toBe(".000");
    expect(result.stats["K%"]).toBe("0.0%");
    expect(result.breakdown).toEqual([]);
  });
});
