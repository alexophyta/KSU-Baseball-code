import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OUTCOME_OPTIONS } from "@/lib/playerAnalytics/constants";
import type { AnalyticsFilters } from "@/lib/playerAnalytics/types";

interface Props {
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  isPitching: boolean;
  defaultVeloRange: [number, number];
  batters?: { id: string; name: string }[];
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export default function FilterChips({ filters, setFilters, isPitching, defaultVeloRange, batters = [] }: Props) {
  const chips: Chip[] = [];
  const set = <K extends keyof AnalyticsFilters>(k: K, v: AnalyticsFilters[K]) =>
    setFilters({ ...filters, [k]: v });

  const dates = filters.selectedDates ?? [];
  if (dates.length > 0) {
    chips.push({
      key: "dates",
      label: dates.length === 1 ? `Date: ${dates[0]}` : `Games: ${dates.length}`,
      onRemove: () => set("selectedDates", []),
    });
  }

  const balls = filters.ballsFilter ?? [];
  const strikes = filters.strikesFilter ?? [];
  if (balls.length > 0) {
    chips.push({
      key: "balls",
      label: `Balls: ${balls.join(",")}`,
      onRemove: () => set("ballsFilter", []),
    });
  }
  if (strikes.length > 0) {
    chips.push({
      key: "strikes",
      label: `Strikes: ${strikes.join(",")}`,
      onRemove: () => set("strikesFilter", []),
    });
  }

  const pitchTypes = filters.pitchTypesFilter ?? [];
  if (pitchTypes.length > 0) {
    chips.push({
      key: "pitchTypes",
      label: pitchTypes.length === 1 ? `Pitch: ${pitchTypes[0]}` : `Pitches: ${pitchTypes.length}`,
      onRemove: () => set("pitchTypesFilter", []),
    });
  }

  if (filters.handednessFilter && filters.handednessFilter !== "all") {
    chips.push({
      key: "hand",
      label: `Hand: ${filters.handednessFilter}`,
      onRemove: () => set("handednessFilter", "all"),
    });
  }

  if (filters.outcomeFilter && filters.outcomeFilter !== "all") {
    const label = OUTCOME_OPTIONS.find((o) => o.value === filters.outcomeFilter)?.label ?? filters.outcomeFilter;
    chips.push({
      key: "outcome",
      label: `Outcome: ${label}`,
      onRemove: () => set("outcomeFilter", "all"),
    });
  }

  if (isPitching && filters.batterFilter && filters.batterFilter !== "all") {
    const name = batters.find((b) => b.id === filters.batterFilter)?.name ?? filters.batterFilter;
    chips.push({
      key: "batter",
      label: `Hitter: ${name}`,
      onRemove: () => set("batterFilter", "all"),
    });
  }

  const [veloMin, veloMax] = filters.veloRange;
  const [defMin, defMax] = defaultVeloRange;
  if (veloMin !== defMin || veloMax !== defMax) {
    chips.push({
      key: "velo",
      label: `Velo: ${veloMin}-${veloMax} mph`,
      onRemove: () => set("veloRange", defaultVeloRange),
    });
  }

  if (chips.length === 0) return null;

  const clearAll = () =>
    setFilters({
      ...filters,
      selectedDates: [],
      ballsFilter: [],
      strikesFilter: [],
      pitchTypesFilter: [],
      pitchTypeFilter: "all",
      countFilter: "all",
      handednessFilter: "all",
      outcomeFilter: "all",
      batterFilter: "all",
      veloRange: defaultVeloRange,
    });

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
