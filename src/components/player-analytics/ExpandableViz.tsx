import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import PlayerFilterBar from "@/components/player-analytics/PlayerFilterBar";
import type { AnalyticsFilters } from "@/lib/playerAnalytics/types";

interface ExpandableVizProps {
  title: string;
  /** Compact preview (the small viz shown inline). */
  preview: ReactNode;
  /** Full-size content (typically same component with bigger width/height). */
  expanded: ReactNode;
  /** Optional legend to render under the visualization in both views. */
  legend?: ReactNode;
  /** Filter bar config — shown at top of the dialog so users can filter without leaving. */
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  isPitching: boolean;
  pitchTypes: string[];
  availableDates: string[];
  showVeloSlider?: boolean;
}

export default function ExpandableViz({
  title,
  preview,
  expanded,
  legend,
  filters,
  setFilters,
  isPitching,
  pitchTypes,
  availableDates,
  showVeloSlider = true,
}: ExpandableVizProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Expand ${title}`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expand
          </button>
        </div>
        <div>{preview}</div>
        {legend && <div className="mt-2">{legend}</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border pb-3 -mx-6 px-6">
            <PlayerFilterBar
              filters={filters}
              setFilters={setFilters}
              isPitching={isPitching}
              pitchTypes={pitchTypes}
              availableDates={availableDates}
              showVeloSlider={showVeloSlider}
            />
          </div>

          <div className="flex flex-col items-center pt-4">
            {expanded}
            {legend && <div className="mt-4 w-full">{legend}</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
