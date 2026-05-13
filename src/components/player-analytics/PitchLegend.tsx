import { PITCH_COLORS } from "@/lib/playerAnalytics/constants";

interface Props {
  /** Pitch type names that should appear in the legend (typically those present in data). */
  types: string[];
  /** If true, dedupe colors so Fastball/Four-Seam (same color) only show once. */
  dedupeByColor?: boolean;
}

export default function PitchLegend({ types, dedupeByColor = false }: Props) {
  if (types.length === 0) return null;

  let entries: { type: string; color: string }[] = types.map((t) => ({
    type: t,
    color: PITCH_COLORS[t] ?? "#6b7280",
  }));

  if (dedupeByColor) {
    entries = entries.filter((e, i, arr) => arr.findIndex((x) => x.color === e.color) === i);
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {entries.map(({ type, color }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full inline-block border border-border"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-muted-foreground">{type}</span>
        </div>
      ))}
    </div>
  );
}
