import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { OUTCOME_OPTIONS } from "@/lib/playerAnalytics/constants";
import type { AnalyticsFilters } from "@/lib/playerAnalytics/types";

interface Props {
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  isPitching: boolean;
  pitchTypes: string[];
  availableDates: string[];
  showVeloSlider?: boolean; // hitting only (matches PlayerData)
  batters?: { id: string; name: string }[]; // pitching only
}

export default function PlayerFilterBar({
  filters, setFilters, isPitching, pitchTypes, availableDates, showVeloSlider = true, batters = [],
}: Props) {
  const handOptions = isPitching
    ? [{ value: "LHH", label: "LHH" }, { value: "RHH", label: "RHH" }]
    : [{ value: "LHP", label: "LHP" }, { value: "RHP", label: "RHP" }];

  const set = <K extends keyof AnalyticsFilters>(k: K, v: AnalyticsFilters[K]) =>
    setFilters({ ...filters, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {(() => {
        const selected = filters.selectedDates ?? [];
        const toggle = (d: string) =>
          selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d].sort();
        const label =
          selected.length === 0
            ? "All Games"
            : selected.length === 1
            ? selected[0]
            : `${selected.length} games`;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-normal justify-between min-w-[10rem]">
                <span className="truncate">{label}</span>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {availableDates.length === 0 && (
                  <div className="text-xs text-muted-foreground">No games available</div>
                )}
                {availableDates.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selected.includes(d)}
                      onCheckedChange={() => set("selectedDates", toggle(d))}
                    />
                    {d}
                  </label>
                ))}
              </div>
              {selected.length > 0 && (
                <Button
                  variant="ghost" size="sm"
                  className="w-full h-7 mt-3 text-xs"
                  onClick={() => set("selectedDates", [])}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>
        );
      })()}

      {(() => {
        const balls = filters.ballsFilter ?? [];
        const strikes = filters.strikesFilter ?? [];
        const toggle = (arr: number[], v: number) =>
          arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort();
        const label = balls.length === 0 && strikes.length === 0
          ? "All Counts"
          : `${balls.length ? `B: ${balls.join(",")}` : ""}${balls.length && strikes.length ? " " : ""}${strikes.length ? `S: ${strikes.join(",")}` : ""}`;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-normal justify-between min-w-[8rem]">
                <span className="truncate">{label}</span>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-2">Balls</div>
                  <div className="flex flex-col gap-1.5">
                    {[0, 1, 2, 3].map((b) => (
                      <label key={b} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={balls.includes(b)}
                          onCheckedChange={() => set("ballsFilter", toggle(balls, b))}
                        />
                        {b}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-2">Strikes</div>
                  <div className="flex flex-col gap-1.5">
                    {[0, 1, 2].map((s) => (
                      <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={strikes.includes(s)}
                          onCheckedChange={() => set("strikesFilter", toggle(strikes, s))}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {(balls.length > 0 || strikes.length > 0) && (
                <Button
                  variant="ghost" size="sm"
                  className="w-full h-7 mt-3 text-xs"
                  onClick={() => setFilters({ ...filters, ballsFilter: [], strikesFilter: [] })}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>
        );
      })()}

      {(() => {
        const selected = filters.pitchTypesFilter ?? [];
        const toggle = (v: string) =>
          selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
        const label = selected.length === 0
          ? "All Pitches"
          : selected.length === 1
          ? selected[0]
          : `${selected.length} pitches`;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-normal justify-between min-w-[8rem]">
                <span className="truncate">{label}</span>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {pitchTypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selected.includes(t)}
                      onCheckedChange={() => set("pitchTypesFilter", toggle(t))}
                    />
                    {t}
                  </label>
                ))}
              </div>
              {selected.length > 0 && (
                <Button
                  variant="ghost" size="sm"
                  className="w-full h-7 mt-3 text-xs"
                  onClick={() => set("pitchTypesFilter", [])}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>
        );
      })()}

      <Select value={filters.handednessFilter} onValueChange={(v) => set("handednessFilter", v)}>
        <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="Hand" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {handOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.outcomeFilter} onValueChange={(v) => set("outcomeFilter", v)}>
        <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="Outcome" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {OUTCOME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {isPitching && batters.length > 0 && (
        <Select value={filters.batterFilter ?? "all"} onValueChange={(v) => set("batterFilter", v)}>
          <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Hitter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hitters</SelectItem>
            {batters.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {showVeloSlider && (() => {
        const veloMin = isPitching ? 0 : 50;
        return (
        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Velo:</span>
          <input
            type="number" min={veloMin} max={filters.veloRange[1]} value={filters.veloRange[0]}
            onChange={(e) => {
              const v = Math.min(Math.max(Number(e.target.value) || 0, veloMin), filters.veloRange[1]);
              set("veloRange", [v, filters.veloRange[1]]);
            }}
            className="w-12 h-7 text-xs text-center rounded border border-input bg-background"
          />
          <Slider
            min={veloMin} max={110} step={1} value={[Math.max(filters.veloRange[0], veloMin), filters.veloRange[1]]}
            onValueChange={(v) => set("veloRange", v as [number, number])}
            className="flex-1"
          />
          <input
            type="number" min={filters.veloRange[0]} max={110} value={filters.veloRange[1]}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value) || 0, filters.veloRange[0]);
              set("veloRange", [filters.veloRange[0], Math.min(v, 110)]);
            }}
            className="w-12 h-7 text-xs text-center rounded border border-input bg-background"
          />
        </div>
        );
      })()}
    </div>
  );
}
