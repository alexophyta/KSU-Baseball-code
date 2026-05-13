import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STAT_GLOSSARY } from "@/lib/playerAnalytics/glossary";

interface StatCardsProps {
  stats: Record<string, string>;
}

/** Renders a grid of stat cards with hover tooltips explaining each stat. */
export default function StatCards({ stats }: StatCardsProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {Object.entries(stats).map(([key, val]) => {
          const desc = STAT_GLOSSARY[key];
          const labelEl = (
            <p
              className={`text-[10px] text-muted-foreground ${
                desc ? "underline decoration-dotted decoration-muted-foreground/40 cursor-help" : ""
              }`}
            >
              {key}
            </p>
          );
          return (
            <Card key={key} className="px-3 py-2">
              {desc ? (
                <Tooltip>
                  <TooltipTrigger asChild>{labelEl}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {desc}
                  </TooltipContent>
                </Tooltip>
              ) : (
                labelEl
              )}
              <p className="text-sm font-bold text-foreground">{val}</p>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface StatHeaderProps {
  label: string;
  className?: string;
}

/** Table header cell with an info tooltip when the abbreviation has a glossary entry. */
export function StatHeader({ label, className }: StatHeaderProps) {
  const desc = STAT_GLOSSARY[label];
  if (!desc) return <th className={className}>{label}</th>;
  return (
    <th className={className}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted decoration-muted-foreground/40 cursor-help">
              {label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {desc}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </th>
  );
}
