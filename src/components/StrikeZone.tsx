import { useState } from "react";

interface PitchDot {
  x: number; // PlateLocSide
  y: number; // PlateLocHeight
  type: string;
  call: string;
  result?: string; // play_result from PA (Single, Double, Triple, HomeRun, Out, etc.)
  endsPA?: boolean; // true if this is the final pitch of the PA
  kOrBB?: string | null; // PA-level "Strikeout" | "Walk" | null
}

interface StrikeZoneProps {
  pitches: PitchDot[];
  width?: number;
  height?: number;
  mode?: "dots" | "heatmap";
}

const PITCH_COLORS: Record<string, string> = {
  Fastball: "#1a1a1a",
  "Four-Seam": "#1a1a1a",
  ChangeUp: "#22c55e",
  Slider: "#3b82f6",
  Curveball: "#ef4444",
  Cutter: "#f97316",
  Splitter: "#eab308",
  Sinker: "#6b7280",
};

// Strike zone in feet (Trackman coordinates)
const ZONE_LEFT = -0.83083;
const ZONE_RIGHT = 0.83083;
const ZONE_BOTTOM = 1.5;
const ZONE_TOP = 3.3775;

// Shadow ring extends 0.5 ft beyond each zone edge
const SHADOW_PAD = 0.5;
const GRID_LEFT = ZONE_LEFT - SHADOW_PAD;
const GRID_RIGHT = ZONE_RIGHT + SHADOW_PAD;
const GRID_BOTTOM = ZONE_BOTTOM - SHADOW_PAD;
const GRID_TOP = ZONE_TOP + SHADOW_PAD;

type HeatMetric = "BA" | "Swing%" | "Whiff%";

const SWING_CALLS = new Set(["StrikeSwinging", "FoulBallNotFieldable", "InPlay"]);

const StrikeZone = ({ pitches, width = 200, height = 250, mode = "dots" }: StrikeZoneProps) => {
  const [metric, setMetric] = useState<HeatMetric>("BA");

  const padding = 20;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  // Map plate coordinates to SVG coordinates.
  // Tighten the visible area to roughly the zone + ~1 ft of margin so the
  // strike zone occupies most of the SVG instead of a small central area.
  // X range: -1.75 to 1.75 ft (3.5 ft wide). Y range: 0.75 to 4.25 ft (3.5 ft tall).
  const X_MIN = -1.75;
  const X_MAX = 1.75;
  const Y_MIN = 0.75;
  const Y_MAX = 4.25;
  const toSvgX = (x: number) => padding + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const toSvgY = (y: number) => padding + plotH - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  const zoneX1 = toSvgX(ZONE_LEFT);
  const zoneX2 = toSvgX(ZONE_RIGHT);
  const zoneY1 = toSvgY(ZONE_TOP);
  const zoneY2 = toSvgY(ZONE_BOTTOM);
  const zoneW = zoneX2 - zoneX1;
  const zoneH = zoneY2 - zoneY1;

  const thirdW = zoneW / 3;
  const thirdH = zoneH / 3;

  if (mode === "heatmap") {
    // 5x5 grid: outer ring is shadow zone (~0.5 ft outside), inner 3x3 is strike zone.
    // Cell sizes (in feet): outer cells = SHADOW_PAD wide, inner cells = zone/3.
    const colEdgesX = [GRID_LEFT, ZONE_LEFT, ZONE_LEFT + (ZONE_RIGHT - ZONE_LEFT) / 3, ZONE_LEFT + (2 * (ZONE_RIGHT - ZONE_LEFT)) / 3, ZONE_RIGHT, GRID_RIGHT];
    const rowEdgesY = [GRID_TOP, ZONE_TOP, ZONE_TOP - (ZONE_TOP - ZONE_BOTTOM) / 3, ZONE_TOP - (2 * (ZONE_TOP - ZONE_BOTTOM)) / 3, ZONE_BOTTOM, GRID_BOTTOM];

    // grid[row][col] — row 0 = top, col 0 = left (catcher's view)
    const grid: { total: number; numerator: number; swings: number; pitches: number }[][] =
      Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ total: 0, numerator: 0, swings: 0, pitches: 0 })));

    const findCol = (x: number) => {
      // Clip to outermost cell if outside grid
      if (x < colEdgesX[0]) return 0;
      if (x >= colEdgesX[5]) return 4;
      for (let c = 0; c < 5; c++) if (x >= colEdgesX[c] && x < colEdgesX[c + 1]) return c;
      return 4;
    };
    const findRow = (y: number) => {
      // y top edge is highest, decreasing
      if (y > rowEdgesY[0]) return 0;
      if (y <= rowEdgesY[5]) return 4;
      for (let r = 0; r < 5; r++) if (y <= rowEdgesY[r] && y > rowEdgesY[r + 1]) return r;
      return 4;
    };

    const hitResults = new Set(["Single", "Double", "Triple", "HomeRun"]);

    pitches.forEach((p) => {
      const row = findRow(p.y);
      const col = findCol(p.x);
      const cell = grid[row][col];
      cell.pitches++;
      const isSwing = SWING_CALLS.has(p.call);
      if (isSwing) cell.swings++;

      if (metric === "BA") {
        // True MLB-style BA: numerator = hits, denominator = at-bats.
        // An AB is consumed by either:
        //   (a) a ball put in play that produces a non-walk outcome (hit or out), OR
        //   (b) a strikeout — attributed to the location of the FINAL pitch of the PA.
        // Balls, called strikes mid-count, swinging strikes mid-count, and fouls do NOT count.
        if (p.call === "InPlay" && p.result && p.result !== "Undefined") {
          // In-play AB
          cell.total++;
          if (hitResults.has(p.result)) cell.numerator++;
        } else if (p.endsPA && p.kOrBB === "Strikeout") {
          // K-causing pitch (StrikeSwinging or StrikeCalled on the final pitch)
          cell.total++;
        }
      } else if (metric === "Whiff%") {
        if (isSwing) {
          cell.total++;
          if (p.call === "StrikeSwinging") cell.numerator++;
        }
      }
    });

    // For Swing%, recompute total/numerator from pitches/swings (cleaner)
    if (metric === "Swing%") {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          grid[r][c].total = grid[r][c].pitches;
          grid[r][c].numerator = grid[r][c].swings;
        }
      }
    }

    // Color scale neutral points by metric
    const neutral = metric === "BA" ? 0.25 : metric === "Swing%" ? 0.45 : 0.25;
    const max = metric === "BA" ? 0.5 : metric === "Swing%" ? 0.8 : 0.5;

    const formatVal = (v: number) => {
      if (metric === "BA") return v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, "");
      return `${Math.round(v * 100)}%`;
    };

    return (
      <div className="flex flex-col items-center">
        <div className="flex gap-1 mb-2">
          {(["BA", "Swing%", "Whiff%"] as HeatMetric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                metric === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <svg width={width} height={height}>
          {/* Render 5x5 cells */}
          {grid.map((rowArr, r) =>
            rowArr.map((cell, c) => {
              const x1 = toSvgX(colEdgesX[c]);
              const x2 = toSvgX(colEdgesX[c + 1]);
              const y1 = toSvgY(rowEdgesY[r]);
              const y2 = toSvgY(rowEdgesY[r + 1]);
              const cw = x2 - x1;
              const ch = y2 - y1;
              const val = cell.total > 0 ? cell.numerator / cell.total : 0;
              // Smooth multi-stop gradient: deep blue → light blue → white → light red → deep red.
              // Map val into a normalized -1..+1 score around the neutral point, then ease.
              const heatColor = (() => {
                if (cell.total === 0) return "rgba(200,200,200,0.15)";
                let t: number; // -1 (cold) ... 0 (neutral) ... +1 (hot)
                if (val >= neutral) {
                  t = Math.min((val - neutral) / (max - neutral), 1);
                } else {
                  t = -Math.min((neutral - val) / neutral, 1);
                }
                // Ease (smoothstep) for a more gradual, less stepped feel
                const ease = (x: number) => x * x * (3 - 2 * x);
                // Color stops
                const stops = [
                  { p: -1.0, r: 33, g: 102, b: 172 }, // deep blue
                  { p: -0.5, r: 146, g: 197, b: 222 }, // light blue
                  { p: 0.0, r: 247, g: 247, b: 247 }, // near white
                  { p: 0.5, r: 244, g: 165, b: 130 }, // light red/orange
                  { p: 1.0, r: 178, g: 24, b: 43 }, // deep red
                ];
                // Find bracketing stops
                let lo = stops[0], hi = stops[stops.length - 1];
                for (let i = 0; i < stops.length - 1; i++) {
                  if (t >= stops[i].p && t <= stops[i + 1].p) {
                    lo = stops[i];
                    hi = stops[i + 1];
                    break;
                  }
                }
                const span = hi.p - lo.p || 1;
                const localT = ease((t - lo.p) / span);
                const r255 = Math.round(lo.r + (hi.r - lo.r) * localT);
                const g255 = Math.round(lo.g + (hi.g - lo.g) * localT);
                const b255 = Math.round(lo.b + (hi.b - lo.b) * localT);
                return `rgb(${r255}, ${g255}, ${b255})`;
              })();
              const fillColor = heatColor;
              // Pick text color based on luminance of the fill (works for any rgb)
              const textColor = (() => {
                if (cell.total === 0) return "#1a1a1a";
                const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(heatColor);
                if (!m) return "#1a1a1a";
                const [, rs, gs, bs] = m;
                const lum = (0.299 * Number(rs) + 0.587 * Number(gs) + 0.114 * Number(bs)) / 255;
                return lum < 0.55 ? "white" : "#1a1a1a";
              })();
              const isShadow = r === 0 || r === 4 || c === 0 || c === 4;
              return (
                <g key={`${r}-${c}`}>
                  <rect
                    x={x1}
                    y={y1}
                    width={cw}
                    height={ch}
                    fill={fillColor}
                    stroke="hsl(var(--border))"
                    strokeWidth={isShadow ? 0.4 : 0.6}
                    strokeDasharray={isShadow ? "2,2" : undefined}
                  />
                  {cell.total > 0 && (
                    <text
                      x={x1 + cw / 2}
                      y={y1 + ch / 2 + 3}
                      textAnchor="middle"
                      fontSize={isShadow ? 8 : 10}
                      fontWeight="bold"
                      fill={textColor}
                    >
                      {formatVal(val)}
                    </text>
                  )}
                </g>
              );
            })
          )}
          {/* Strike zone outline overlay */}
          <rect x={zoneX1} y={zoneY1} width={zoneW} height={zoneH} fill="none" stroke="hsl(var(--foreground))" strokeWidth={2} />
        </svg>
      </div>
    );
  }

  return (
    <svg width={width} height={height} className="mx-0">
      {/* Zone rectangle */}
      <rect x={zoneX1} y={zoneY1} width={zoneW} height={zoneH} fill="none" stroke="hsl(var(--border))" strokeWidth={2} />
      {/* Grid lines */}
      <line x1={zoneX1 + thirdW} y1={zoneY1} x2={zoneX1 + thirdW} y2={zoneY2} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
      <line x1={zoneX1 + thirdW * 2} y1={zoneY1} x2={zoneX1 + thirdW * 2} y2={zoneY2} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
      <line x1={zoneX1} y1={zoneY1 + thirdH} x2={zoneX2} y2={zoneY1 + thirdH} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
      <line x1={zoneX1} y1={zoneY1 + thirdH * 2} x2={zoneX2} y2={zoneY1 + thirdH * 2} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
      {/* Pitch dots */}
      {pitches.map((p, i) => (
        <circle
          key={i}
          cx={toSvgX(p.x)}
          cy={toSvgY(p.y)}
          r={5}
          fill={PITCH_COLORS[p.type] ?? "#6b7280"}
          stroke="white"
          strokeWidth={1}
          opacity={0.85}
        >
          <title>{`${p.type} - ${p.call}`}</title>
        </circle>
      ))}
    </svg>
  );
};

export default StrikeZone;
