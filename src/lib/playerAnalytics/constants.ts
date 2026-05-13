// Shared constants and small helpers for player analytics
// Used by both the PlayerData page (DB-backed) and the Scouting page (CSV-backed).

export const PITCH_COLORS: Record<string, string> = {
  Fastball: "#1a1a1a",
  "Four-Seam": "#1a1a1a",
  ChangeUp: "#22c55e",
  Slider: "#3b82f6",
  Curveball: "#ef4444",
  Cutter: "#f97316",
  Splitter: "#eab308",
  Sinker: "#6b7280",
};

export const COUNTS = ["0-0","1-0","0-1","2-0","1-1","0-2","3-0","2-1","1-2","3-1","2-2","3-2"];

export const OUTCOME_OPTIONS = [
  { value: "strike", label: "Strike" },
  { value: "ball", label: "Ball" },
  { value: "bip_out", label: "BIP Out" },
  { value: "hit", label: "Hit" },
  { value: "hr", label: "Home Run" },
];

// Strike zone bounds (feet)
export const ZONE_LEFT = -0.83083;
export const ZONE_RIGHT = 0.83083;
export const ZONE_BOTTOM = 1.5;
export const ZONE_TOP = 3.3775;

export function matchesOutcome(pitchCall: string, paResult: string | null, outcome: string): boolean {
  switch (outcome) {
    case "strike": return ["StrikeCalled", "StrikeSwinging", "FoulBallNotFieldable"].includes(pitchCall);
    case "ball": return ["BallCalled", "HitByPitch"].includes(pitchCall);
    case "bip_out": return pitchCall === "InPlay" && !["Single", "Double", "Triple", "HomeRun"].includes(paResult ?? "");
    case "hit": return pitchCall === "InPlay" && ["Single", "Double", "Triple"].includes(paResult ?? "");
    case "hr": return pitchCall === "InPlay" && paResult === "HomeRun";
    default: return true;
  }
}

// Returns true when the given count string ("b-s") matches the selected balls/strikes filters.
// Empty/undefined arrays mean "no restriction" for that dimension.
export function matchesCountFilter(
  count: string | undefined,
  balls?: number[],
  strikes?: number[],
): boolean {
  const ballsActive = balls && balls.length > 0;
  const strikesActive = strikes && strikes.length > 0;
  if (!ballsActive && !strikesActive) return true;
  if (!count) return false;
  const [bStr, sStr] = count.split("-");
  const b = Number(bStr);
  const s = Number(sStr);
  if (ballsActive && !balls!.includes(b)) return false;
  if (strikesActive && !strikes!.includes(s)) return false;
  return true;
}

// Compute the ball-strike count before each pitch.
export function computePitchCounts(pitches: { pitch_uid: string; pa_id: string; pitch_of_pa?: number | null; pitch_call?: string | null }[]): Map<string, string> {
  const byPA: Record<string, typeof pitches> = {};
  pitches.forEach((p) => {
    if (!byPA[p.pa_id]) byPA[p.pa_id] = [];
    byPA[p.pa_id].push(p);
  });
  const countMap = new Map<string, string>();
  Object.values(byPA).forEach((paPitches) => {
    paPitches.sort((a, b) => (a.pitch_of_pa ?? 0) - (b.pitch_of_pa ?? 0));
    let balls = 0, strikes = 0;
    paPitches.forEach((p) => {
      countMap.set(p.pitch_uid, `${balls}-${strikes}`);
      const call = p.pitch_call ?? "";
      if (["BallCalled", "HitByPitch"].includes(call)) {
        balls = Math.min(balls + 1, 3);
      } else if (["StrikeCalled", "StrikeSwinging"].includes(call)) {
        strikes = Math.min(strikes + 1, 2);
      } else if (call === "FoulBallNotFieldable") {
        if (strikes < 2) strikes++;
      }
    });
  });
  return countMap;
}
