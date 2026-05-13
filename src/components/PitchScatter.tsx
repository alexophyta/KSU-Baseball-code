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

interface ScatterPoint {
  x: number;
  y: number;
  type: string;
}

interface PitchScatterProps {
  points: ScatterPoint[];
  width?: number;
  height?: number;
  xLabel: string;
  yLabel: string;
  xRange?: [number, number];
  yRange?: [number, number];
}

const PitchScatter = ({
  points,
  width = 320,
  height = 300,
  xLabel,
  yLabel,
  xRange,
  yRange,
}: PitchScatterProps) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Auto-range with 10% buffer
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = xRange ? xRange[0] : Math.min(...xs) - Math.abs(Math.min(...xs)) * 0.1 - 1;
  const xMax = xRange ? xRange[1] : Math.max(...xs) + Math.abs(Math.max(...xs)) * 0.1 + 1;
  const yMin = yRange ? yRange[0] : Math.min(...ys) - Math.abs(Math.min(...ys)) * 0.1 - 1;
  const yMax = yRange ? yRange[1] : Math.max(...ys) + Math.abs(Math.max(...ys)) * 0.1 + 1;

  const toX = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const toY = (v: number) => padding.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Tick generation
  const ticks = (min: number, max: number, count: number) => {
    const step = (max - min) / count;
    return Array.from({ length: count + 1 }, (_, i) => min + step * i);
  };

  const xTicks = ticks(xMin, xMax, 5);
  const yTicks = ticks(yMin, yMax, 5);

  if (points.length === 0) return null;

  return (
    <svg width={width} height={height} className="mx-auto">
      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotH} stroke="hsl(var(--border))" strokeWidth={1} />
      <line x1={padding.left} y1={padding.top + plotH} x2={padding.left + plotW} y2={padding.top + plotH} stroke="hsl(var(--border))" strokeWidth={1} />

      {/* Zero lines */}
      {xMin < 0 && xMax > 0 && (
        <line x1={toX(0)} y1={padding.top} x2={toX(0)} y2={padding.top + plotH} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
      )}
      {yMin < 0 && yMax > 0 && (
        <line x1={padding.left} y1={toY(0)} x2={padding.left + plotW} y2={toY(0)} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="4" />
      )}

      {/* X ticks */}
      {xTicks.map((t, i) => (
        <text key={`x${i}`} x={toX(t)} y={padding.top + plotH + 16} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
          {t.toFixed(1)}
        </text>
      ))}
      {/* Y ticks */}
      {yTicks.map((t, i) => (
        <text key={`y${i}`} x={padding.left - 8} y={toY(t) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">
          {t.toFixed(1)}
        </text>
      ))}

      {/* Axis labels */}
      <text x={padding.left + plotW / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))">
        {xLabel}
      </text>
      <text x={12} y={padding.top + plotH / 2} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" transform={`rotate(-90, 12, ${padding.top + plotH / 2})`}>
        {yLabel}
      </text>

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(p.x)}
          cy={toY(p.y)}
          r={4}
          fill={PITCH_COLORS[p.type] ?? "#6b7280"}
          stroke="white"
          strokeWidth={0.8}
          opacity={0.85}
        >
          <title>{`${p.type}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}</title>
        </circle>
      ))}
    </svg>
  );
};

export default PitchScatter;
