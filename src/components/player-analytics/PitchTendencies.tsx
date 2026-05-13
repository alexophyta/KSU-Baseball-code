import { Card } from "@/components/ui/card";
import { PITCH_COLORS } from "@/lib/playerAnalytics/constants";
import type { CountTendency } from "@/lib/playerAnalytics/computePitching";

interface Props {
  tendencies: CountTendency[];
}

const colorFor = (type: string) => PITCH_COLORS[type] ?? "#6b7280";

export default function PitchTendencies({ tendencies }: Props) {
  // Highlight buckets: 1st pitch (0-0) and any 2-strike count.
  const isHighlight = (count: string) => count === "0-0" || count.endsWith("-2");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {tendencies.map((t) => {
        const empty = t.total === 0;
        const highlight = isHighlight(t.count);
        return (
          <Card
            key={t.count}
            className={`p-2 ${highlight ? "border-primary/40 bg-primary/[0.03]" : ""}`}
          >
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">{t.count}</span>
              <span className="text-[10px] text-muted-foreground">{t.total} pitches</span>
            </div>

            {empty ? (
              <div className="h-3 rounded bg-muted/40" />
            ) : (
              <>
                {/* Stacked bar */}
                <div className="h-3 rounded overflow-hidden flex border border-border">
                  {t.usage.map((u) => (
                    <div
                      key={u.type}
                      style={{ width: `${u.pct}%`, backgroundColor: colorFor(u.type) }}
                      title={`${u.type}: ${u.pct.toFixed(1)}% (${u.count})`}
                    />
                  ))}
                </div>
                {/* Top 3 legend */}
                <div className="mt-1.5 space-y-0.5">
                  {t.usage.slice(0, 3).map((u) => (
                    <div key={u.type} className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1 truncate">
                        <span
                          className="inline-block w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: colorFor(u.type) }}
                        />
                        <span className="truncate">{u.type}</span>
                      </span>
                      <span className="text-muted-foreground tabular-nums">{u.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
