import { useState, useMemo } from "react";
import kstatePowercat from "@/assets/kstate-powercat.png";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface SprayChartBall {
  pitch_uid: string;
  tagged_hit_type: string | null;
  exit_speed: number | null;
  angle: number | null;
  direction: number | null;
  distance: number | null;
  play_result: string | null;
}

interface SprayChartProps {
  balls: SprayChartBall[];
}

const VALID_RESULTS = new Set(["Single", "Double", "Triple", "HomeRun", "Out"]);

const getColor = (result: string | null) => {
  if (result === "HomeRun") return "#ef4444";
  if (result === "Out") return "#8b5cf6";
  if (result === "Double") return "#3b82f6";
  if (result === "Triple") return "#f59e0b";
  if (result === "Single") return "#22c55e";
  return "#ec4899";
};

const RESULT_LABEL: Record<string, string> = {
  Single: "Single",
  Double: "Double",
  Triple: "Triple",
  HomeRun: "Home Run",
  Out: "Out",
};

// Fence distances by spray angle
// LF line (-45°): 325ft, LC (-22.5°): 362ft, CF (0°): 400ft, RC (22.5°): 362ft, RF line (45°): 325ft
// More points for a smooth, rounded fence arc
const FENCE_POINTS: [number, number][] = [
  [-45, 325],
  [-35, 340],
  [-25, 360],
  [-15, 380],
  [-8, 393],
  [0, 400],
  [8, 393],
  [15, 380],
  [25, 360],
  [35, 340],
  [45, 325],
];

const getFenceDistance = (dir: number): number => {
  if (dir <= FENCE_POINTS[0][0]) return FENCE_POINTS[0][1];
  if (dir >= FENCE_POINTS[FENCE_POINTS.length - 1][0]) return FENCE_POINTS[FENCE_POINTS.length - 1][1];
  for (let i = 0; i < FENCE_POINTS.length - 1; i++) {
    const [d0, f0] = FENCE_POINTS[i];
    const [d1, f1] = FENCE_POINTS[i + 1];
    if (dir >= d0 && dir <= d1) {
      const t = (dir - d0) / (d1 - d0);
      return f0 + t * (f1 - f0);
    }
  }
  return 400;
};

// SVG coordinate system: home plate at bottom center
// We'll use a 500x500 SVG. Home plate at (250, 450).
const SVG_W = 500;
const SVG_H = 500;
const HOME_X = 250;
const HOME_Y = 450;
const SCALE = 0.95; // pixels per foot

const toSvg = (distance: number, sprayAngle: number) => {
  const rad = (sprayAngle * Math.PI) / 180;
  const x = HOME_X + distance * SCALE * Math.sin(rad);
  const y = HOME_Y - distance * SCALE * Math.cos(rad);
  return { x, y };
};

// Generate fence arc path
const generateFenceArc = () => {
  const points: string[] = [];
  for (let deg = -45; deg <= 45; deg += 1) {
    const dist = getFenceDistance(deg);
    const { x, y } = toSvg(dist, deg);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
};


const SprayChart = ({ balls }: SprayChartProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const validBalls = balls.filter(
    (b) =>
      b.distance != null &&
      b.distance > 0 &&
      b.direction != null &&
      Math.abs(b.direction) <= 45 &&
      VALID_RESULTS.has(b.play_result ?? "")
  );

  const resultTypes = ["Single", "Double", "Triple", "HomeRun", "Out"].filter((r) =>
    validBalls.some((b) => b.play_result === r)
  );

  const fenceArc = useMemo(() => generateFenceArc(), []);
  const infieldDirt = useMemo(() => {
    // Full dirt infield: arc from ~150ft (behind 2nd) down to home via foul lines
    const pts: string[] = [];
    // Start at home plate
    pts.push(`${HOME_X},${HOME_Y}`);
    // Go along 3B foul line to about 130ft
    const fl3 = toSvg(130, -45);
    pts.push(`${fl3.x},${fl3.y}`);
    // Arc from -45 to 45 at varying distances (wider behind 2nd base)
    for (let deg = -45; deg <= 45; deg += 2) {
      // Oval shape: wider at center (behind 2nd), tighter at corners
      const angleFactor = Math.cos((deg * Math.PI) / 180);
      const dist = 130 + angleFactor * 30; // 130 at corners, 160 at center
      const { x, y } = toSvg(dist, deg);
      pts.push(`${x},${y}`);
    }
    // Come back along 1B foul line
    const fl1 = toSvg(130, 45);
    pts.push(`${fl1.x},${fl1.y}`);
    return pts.join(" ");
  }, []);

  // Base paths
  const base1 = toSvg(90, 45);   // ~63.6ft at 45°
  const base2 = toSvg(127.3, 0); // 2nd base straight center
  const base3 = toSvg(90, -45);  // ~63.6ft at -45°

  // Foul lines
  const foulLeft = toSvg(430, -45);
  const foulRight = toSvg(430, 45);

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="w-full max-w-[520px] mx-auto relative">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
          {/* Background */}
          <rect width={SVG_W} height={SVG_H} fill="#1a472a" rx="8" />

          {/* Outfield grass (fan shape) */}
          <polygon
            points={`${HOME_X},${HOME_Y} ${fenceArc.split(" ").at(0)} ${fenceArc} ${fenceArc.split(" ").at(-1)}`}
            fill="#2d6a3e"
          />

          {/* Warning track */}
          {(() => {
            const warningPoints: string[] = [];
            for (let deg = -45; deg <= 45; deg += 1) {
              const dist = getFenceDistance(deg);
              const { x, y } = toSvg(dist, deg);
              warningPoints.push(`${x},${y}`);
            }
            const innerPoints: string[] = [];
            for (let deg = 45; deg >= -45; deg -= 1) {
              const dist = getFenceDistance(deg) - 15;
              const { x, y } = toSvg(dist, deg);
              innerPoints.push(`${x},${y}`);
            }
            return (
              <polygon
                points={[...warningPoints, ...innerPoints].join(" ")}
                fill="#8B6914"
                opacity={0.35}
              />
            );
          })()}

          {/* Infield dirt — all dirt, no grass cutout */}
          <polygon
            points={infieldDirt}
            fill="#c4956a"
            opacity={0.6}
          />

          {/* Foul lines */}
          <line x1={HOME_X} y1={HOME_Y} x2={foulLeft.x} y2={foulLeft.y} stroke="#ffffff" strokeWidth={1} opacity={0.6} />
          <line x1={HOME_X} y1={HOME_Y} x2={foulRight.x} y2={foulRight.y} stroke="#ffffff" strokeWidth={1} opacity={0.6} />

          {/* K-State Powercat logo in center field */}
          {(() => {
            const cf = toSvg(295, 0);
            const logoW = 120;
            const logoH = 85;
            return (
              <image
                href={kstatePowercat}
                x={cf.x - logoW / 2}
                y={cf.y - logoH / 2}
                width={logoW}
                height={logoH}
                opacity={0.35}
              />
            );
          })()}

          {/* Fence */}
          <polyline points={fenceArc} fill="none" stroke="#ffffff" strokeWidth={2.5} />

          {/* Basepaths */}
          <line x1={HOME_X} y1={HOME_Y} x2={base1.x} y2={base1.y} stroke="#ffffff" strokeWidth={1} opacity={0.5} />
          <line x1={base1.x} y1={base1.y} x2={base2.x} y2={base2.y} stroke="#ffffff" strokeWidth={1} opacity={0.5} />
          <line x1={base2.x} y1={base2.y} x2={base3.x} y2={base3.y} stroke="#ffffff" strokeWidth={1} opacity={0.5} />
          <line x1={base3.x} y1={base3.y} x2={HOME_X} y2={HOME_Y} stroke="#ffffff" strokeWidth={1} opacity={0.5} />

          {/* Bases */}
          <rect x={base1.x - 4} y={base1.y - 4} width={8} height={8} fill="#ffffff" transform={`rotate(45, ${base1.x}, ${base1.y})`} />
          <rect x={base2.x - 4} y={base2.y - 4} width={8} height={8} fill="#ffffff" transform={`rotate(45, ${base2.x}, ${base2.y})`} />
          <rect x={base3.x - 4} y={base3.y - 4} width={8} height={8} fill="#ffffff" transform={`rotate(45, ${base3.x}, ${base3.y})`} />

          {/* Home plate */}
          <polygon
            points={`${HOME_X},${HOME_Y + 5} ${HOME_X - 5},${HOME_Y} ${HOME_X - 3},${HOME_Y - 4} ${HOME_X + 3},${HOME_Y - 4} ${HOME_X + 5},${HOME_Y}`}
            fill="#ffffff"
          />

          {/* Pitcher's mound */}
          {(() => {
            const mound = toSvg(60.5, 0);
            return <circle cx={mound.x} cy={mound.y} r={4} fill="#c4956a" stroke="#ffffff" strokeWidth={0.5} />;
          })()}



          {/* Batted ball dots — rendered directly in SVG for perfect alignment */}
          {validBalls.map((b) => {
            let adjDist = Math.max(b.distance!, 0);
            const fence = getFenceDistance(b.direction!);
            if (b.play_result === "HomeRun") {
              adjDist = Math.max(adjDist, fence + 15);
            } else {
              adjDist = Math.min(adjDist, fence - 5);
            }

            const { x, y } = toSvg(adjDist, b.direction!);
            const color = getColor(b.play_result);
            const isHovered = hoveredId === b.pitch_uid;

            return (
              <circle
                key={b.pitch_uid}
                cx={x}
                cy={y}
                r={isHovered ? 7 : 5}
                fill={color}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1}
                style={{
                  cursor: "pointer",
                  filter: isHovered ? `drop-shadow(0 0 4px ${color})` : "none",
                  transition: "r 0.15s ease, filter 0.15s ease",
                }}
                onMouseEnter={() => setHoveredId(b.pitch_uid)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip overlay — positioned absolutely over SVG */}
        {hoveredId && (() => {
          const b = validBalls.find((bb) => bb.pitch_uid === hoveredId);
          if (!b) return null;
          let adjDist = Math.max(b.distance!, 0);
          const fence = getFenceDistance(b.direction!);
          if (b.play_result === "HomeRun") {
            adjDist = Math.max(adjDist, fence + 15);
          } else {
            adjDist = Math.min(adjDist, fence - 5);
          }
          const { x, y } = toSvg(adjDist, b.direction!);
          const leftPct = (x / SVG_W) * 100;
          const topPct = (y / SVG_H) * 100;
          return (
            <div
              className="absolute pointer-events-none bg-popover text-popover-foreground border border-border rounded-md px-2 py-1 text-xs shadow-md max-w-[200px]"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: "translate(-50%, -110%)",
              }}
            >
              <p className="font-semibold">
                {RESULT_LABEL[b.play_result ?? ""] ?? b.play_result} – {b.tagged_hit_type ?? "Unknown"}
              </p>
              <p className="text-muted-foreground">
                Exit Velo: {b.exit_speed ? Number(b.exit_speed).toFixed(1) : "—"} mph
                {" | "}Launch: {b.angle != null ? Number(b.angle).toFixed(1) + "°" : "—"}
                {" | "}{b.distance ? Number(b.distance).toFixed(0) + " ft" : ""}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {resultTypes.map((r) => (
          <div key={r} className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block border border-white/30"
              style={{ backgroundColor: getColor(r) }}
            />
            <span className="text-sm font-medium text-foreground">{RESULT_LABEL[r]}</span>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Hit Type</TableHead>
              <TableHead>Exit Velo</TableHead>
              <TableHead>Launch Angle</TableHead>
              <TableHead>Spray Angle</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validBalls.map((bb) => (
              <TableRow
                key={bb.pitch_uid}
                className={`cursor-pointer transition-colors ${
                  hoveredId === bb.pitch_uid ? "bg-accent/40" : ""
                }`}
                onMouseEnter={() => setHoveredId(bb.pitch_uid)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <TableCell>{bb.tagged_hit_type ?? "—"}</TableCell>
                <TableCell>{bb.exit_speed ? Number(bb.exit_speed).toFixed(1) : "—"}</TableCell>
                <TableCell>{bb.angle != null ? Number(bb.angle).toFixed(1) + "°" : "—"}</TableCell>
                <TableCell>{bb.direction != null ? Number(bb.direction).toFixed(1) + "°" : "—"}</TableCell>
                <TableCell>{bb.distance ? Number(bb.distance).toFixed(0) + " ft" : "—"}</TableCell>
                <TableCell>{RESULT_LABEL[bb.play_result ?? ""] ?? bb.play_result ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SprayChart;
