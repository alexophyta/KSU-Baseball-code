import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import StrikeZone from "@/components/StrikeZone";
import PitchScatter from "@/components/PitchScatter";
import InningStrikeZone, { getPitchColor } from "@/components/InningStrikeZone";
import ExpandableViz from "@/components/player-analytics/ExpandableViz";
import PitchLegend from "@/components/player-analytics/PitchLegend";
import PitchTendencies from "@/components/player-analytics/PitchTendencies";
import StatCards, { StatHeader } from "@/components/player-analytics/StatCards";
import { PITCH_COLORS } from "@/lib/playerAnalytics/constants";
import type { PitchingComputed, InningHalf } from "@/lib/playerAnalytics/computePitching";
import type { AnalyticsFilters } from "@/lib/playerAnalytics/types";

interface Props {
  computed: PitchingComputed;
  inningData: InningHalf[] | null;
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  pitchTypes: string[];
  availableDates: string[];
  batters?: { id: string; name: string }[];
}

export default function PitchingTab({
  computed, inningData, filters, setFilters, pitchTypes, availableDates, batters = [],
}: Props) {
  const sharedFilterProps = {
    filters,
    setFilters,
    isPitching: true,
    pitchTypes,
    availableDates,
    showVeloSlider: true,
    batters,
  };

  return (
    <>
      <StatCards stats={computed.stats} />

      {computed.pitchTypeNames.length > 0 && (
        <div className="mb-6">
          <PitchLegend types={computed.pitchTypeNames} />
        </div>
      )}

      {computed.breakdown.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">Pitch Type Summary</h3>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pitch Type</th>
                  <StatHeader label="# of Pitches" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Usage%" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Avg Velo" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Max Velo" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Spin Rate" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="IVB" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="HB" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="VAA" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="HAA" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Rel Height" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Extension" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Whiffs" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Whiff%" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="GB%" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="FB%" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="LD%" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                  <StatHeader label="Stuff+" className="text-right px-3 py-2 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {computed.breakdown.map((row) => (
                  <tr key={row.type} className="border-t border-border">
                    <td className="px-3 py-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PITCH_COLORS[row.type] ?? "#6b7280" }} />
                      {row.type}
                    </td>
                    <td className="text-right px-3 py-2">{row.count}</td>
                    <td className="text-right px-3 py-2">{row.usagePct}%</td>
                    <td className="text-right px-3 py-2">{row.avgVelo}</td>
                    <td className="text-right px-3 py-2">{row.maxVelo}</td>
                    <td className="text-right px-3 py-2">{row.avgSpin}</td>
                    <td className="text-right px-3 py-2">{row.avgIVB}</td>
                    <td className="text-right px-3 py-2">{row.avgHB}</td>
                    <td className="text-right px-3 py-2">{row.avgVAA}</td>
                    <td className="text-right px-3 py-2">{row.avgHAA}</td>
                    <td className="text-right px-3 py-2">{row.avgRelHeight}</td>
                    <td className="text-right px-3 py-2">{row.avgExtension}</td>
                    <td className="text-right px-3 py-2">{row.whiffs}</td>
                    <td className="text-right px-3 py-2">{row.whiffPct}%</td>
                    <td className="text-right px-3 py-2">{row.gbPct === "—" ? "—" : `${row.gbPct}%`}</td>
                    <td className="text-right px-3 py-2">{row.fbPct === "—" ? "—" : `${row.fbPct}%`}</td>
                    <td className="text-right px-3 py-2">{row.ldPct === "—" ? "—" : `${row.ldPct}%`}</td>
                    <td className="text-right px-3 py-2 font-semibold">{row.stuffPlus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {computed.tendencies.some((t) => t.total > 0) && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Pitch Tendencies by Count</h3>
            <p className="text-xs text-muted-foreground">
              Highlighted: 1st pitch (0-0) and 2-strike counts
            </p>
          </div>
          <PitchTendencies tendencies={computed.tendencies} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {computed.movement.length > 0 && (
          <ExpandableViz
            title="Pitch Movement Profile"
            preview={<PitchScatter points={computed.movement} xLabel="Horizontal Break (in)" yLabel="Induced Vert Break (in)" width={340} height={320} />}
            expanded={<PitchScatter points={computed.movement} xLabel="Horizontal Break (in)" yLabel="Induced Vert Break (in)" width={640} height={600} />}
            legend={<PitchLegend types={computed.pitchTypeNames} />}
            {...sharedFilterProps}
          />
        )}
        {computed.locs.length > 0 && (
          <ExpandableViz
            title="All Pitch Locations"
            preview={<StrikeZone pitches={computed.locs} width={300} height={360} mode="dots" />}
            expanded={<StrikeZone pitches={computed.locs} width={620} height={740} mode="dots" />}
            legend={<PitchLegend types={computed.pitchTypeNames} />}
            {...sharedFilterProps}
          />
        )}
      </div>

      {inningData && inningData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">Inning Detail</h3>
          <ScrollArea className="h-[600px] rounded-lg border border-border p-4">
            {inningData.map((inn) => (
              <div key={inn.label} className="mb-8 last:mb-0">
                <h4 className="text-sm font-bold text-foreground mb-2">{inn.label} Pitch Table</h4>
                <div className="overflow-auto rounded-lg border border-border mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Pitch #</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Batter</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Pitch Type</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Pitch Called</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Velocity</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Spin Rate</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Tilt</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">IVB</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">HB</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">VAA</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">HAA</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Extension</th>
                        <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Rel Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.pitchRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-2 py-1.5">{row.pitchOfPA}</td>
                          <td className="px-2 py-1.5">{row.batterName}</td>
                          <td className="px-2 py-1.5">{row.pitchType}</td>
                          <td className="px-2 py-1.5">{row.pitchCall}</td>
                          <td className="text-right px-2 py-1.5">{row.velocity}</td>
                          <td className="text-right px-2 py-1.5">{row.spinRate}</td>
                          <td className="text-right px-2 py-1.5">{row.tilt}</td>
                          <td className="text-right px-2 py-1.5">{row.ivb}</td>
                          <td className="text-right px-2 py-1.5">{row.hb}</td>
                          <td className="text-right px-2 py-1.5">{row.vaa}</td>
                          <td className="text-right px-2 py-1.5">{row.haa}</td>
                          <td className="text-right px-2 py-1.5">{row.extension}</td>
                          <td className="text-right px-2 py-1.5">{row.relHeight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {inn.batterZones.length > 0 && (() => {
                  const inningTypes = Array.from(
                    new Set(inn.batterZones.flatMap((bz) => bz.pitches.map((p) => p.type)))
                  ).sort();
                  return (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                        {inningTypes.map((type) => (
                          <div key={type} className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-white/60"
                              style={{ backgroundColor: getPitchColor(type) }}
                            />
                            <span className="text-[11px] text-muted-foreground">{type}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {inn.batterZones.map((bz, idx) => (
                          <InningStrikeZone key={idx} title={bz.title} pitches={bz.pitches} width={220} height={270} />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </>
  );
}
