import { Card } from "@/components/ui/card";
import StrikeZone from "@/components/StrikeZone";
import SprayChart from "@/components/SprayChart";
import ExpandableViz from "@/components/player-analytics/ExpandableViz";
import PitchLegend from "@/components/player-analytics/PitchLegend";
import StatCards from "@/components/player-analytics/StatCards";
import { PITCH_COLORS } from "@/lib/playerAnalytics/constants";
import type { HittingComputed } from "@/lib/playerAnalytics/computeHitting";
import type { AnalyticsFilters } from "@/lib/playerAnalytics/types";

interface Props {
  computed: HittingComputed;
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  pitchTypes: string[];
  availableDates: string[];
}

export default function HittingTab({ computed, filters, setFilters, pitchTypes, availableDates }: Props) {
  const presentZoneTypes = Object.keys(PITCH_COLORS).filter((t) =>
    computed.zonePitches.some((p) => p.type === t)
  );

  const sharedFilterProps = {
    filters,
    setFilters,
    isPitching: false,
    pitchTypes,
    availableDates,
    showVeloSlider: true,
  };

  return (
    <>
      <StatCards stats={computed.stats} />

      {computed.zonePitches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ExpandableViz
            title="Batted Ball Locations"
            preview={<StrikeZone pitches={computed.zonePitches} width={360} height={430} mode="dots" />}
            expanded={<StrikeZone pitches={computed.zonePitches} width={640} height={760} mode="dots" />}
            legend={<PitchLegend types={presentZoneTypes} dedupeByColor />}
            {...sharedFilterProps}
          />
          <ExpandableViz
            title="Zone Heat Map"
            preview={<StrikeZone pitches={computed.heatmapPitches} width={360} height={430} mode="heatmap" />}
            expanded={<StrikeZone pitches={computed.heatmapPitches} width={640} height={760} mode="heatmap" />}
            {...sharedFilterProps}
          />
        </div>
      )}

      {computed.battedBalls.length > 0 && (
        <div className="mt-4">
          <ExpandableViz
            title="Batted Ball Data"
            preview={
              <SprayChart
                balls={computed.battedBalls.map((bb) => ({
                  pitch_uid: bb.pitch_uid,
                  tagged_hit_type: bb.tagged_hit_type ?? null,
                  exit_speed: bb.exit_speed ?? null,
                  angle: bb.angle ?? null,
                  direction: bb.direction ?? null,
                  distance: bb.distance ?? null,
                  play_result: bb.play_result ?? null,
                }))}
              />
            }
            expanded={
              <SprayChart
                balls={computed.battedBalls.map((bb) => ({
                  pitch_uid: bb.pitch_uid,
                  tagged_hit_type: bb.tagged_hit_type ?? null,
                  exit_speed: bb.exit_speed ?? null,
                  angle: bb.angle ?? null,
                  direction: bb.direction ?? null,
                  distance: bb.distance ?? null,
                  play_result: bb.play_result ?? null,
                }))}
              />
            }
            {...sharedFilterProps}
          />
        </div>
      )}
    </>
  );
}
