interface PitchDot {
  x: number;
  y: number;
  type: string;
  call: string;
  pitchOfPA: number;
}

interface InningStrikeZoneProps {
  pitches: PitchDot[];
  title: string;
  width?: number;
  height?: number;
}

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

export const getPitchColor = (type: string) => PITCH_COLORS[type] ?? "#6b7280";

const ZONE_LEFT = -0.83083;
const ZONE_RIGHT = 0.83083;
const ZONE_BOTTOM = 1.5;
const ZONE_TOP = 3.3775;

const InningStrikeZone = ({ pitches, title, width = 220, height = 270 }: InningStrikeZoneProps) => {
  const padding = 20;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

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

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-xs font-semibold text-foreground mb-1 text-center">{title}</h4>
      <svg width={width} height={height}>
        {/* Zone rectangle */}
        <rect x={zoneX1} y={zoneY1} width={zoneW} height={zoneH} fill="none" stroke="hsl(var(--border))" strokeWidth={2} />
        {/* Grid lines */}
        <line x1={zoneX1 + thirdW} y1={zoneY1} x2={zoneX1 + thirdW} y2={zoneY2} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
        <line x1={zoneX1 + thirdW * 2} y1={zoneY1} x2={zoneX1 + thirdW * 2} y2={zoneY2} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
        <line x1={zoneX1} y1={zoneY1 + thirdH} x2={zoneX2} y2={zoneY1 + thirdH} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
        <line x1={zoneX1} y1={zoneY1 + thirdH * 2} x2={zoneX2} y2={zoneY1 + thirdH * 2} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
        {/* Pitch dots with numbers */}
        {pitches.map((p, i) => {
          const cx = toSvgX(p.x);
          const cy = toSvgY(p.y);
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={12}
                fill={getPitchColor(p.type)}
                stroke="white"
                strokeWidth={1.5}
                opacity={0.9}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill="white"
              >
                {p.pitchOfPA}
              </text>
              <title>{`#${p.pitchOfPA} ${p.type} - ${p.call}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default InningStrikeZone;
