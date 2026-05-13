import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSeasonStart } from "@/hooks/useSeasonFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface RawPA {
  pa_id: string;
  batter_id: number;
  pitcher_id: number;
  play_result: string | null;
  k_or_bb: string | null;
  game_id: string;
  inning: number;
  runs_scored: number | null;
  games: { game_date: string } | null;
}

interface PlayerInfo {
  player_id: number;
  player_name: string;
}

// Strongly-typed sortable keys per table — keeps `as any` out of the comparators
// and gives us a compile error if a SortHead `field` typo creeps in.
type HittingSortKey =
  | "name" | "avg" | "ops" | "gp" | "ab" | "h" | "doubles" | "triples"
  | "hr" | "rbi" | "tb" | "slg" | "walks" | "strikeouts" | "obp";
type PitchingSortKey =
  | "name" | "era" | "whip" | "app" | "ipDisplay" | "h" | "r" | "er"
  | "bb" | "so" | "doubles" | "triples" | "hr" | "ab" | "bavg";
type SortKey = HittingSortKey | PitchingSortKey;

const Dashboard = () => {
  const { isStaff, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<"hitting" | "pitching">("hitting");
  const [loading, setLoading] = useState(true);
  const [allPAs, setAllPAs] = useState<RawPA[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("avg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortHead = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <TableHead
      className={`text-primary-foreground text-[11px] font-semibold text-center cursor-pointer select-none hover:bg-primary/80 ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === field ? (
          sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );

  useEffect(() => {
    if (roleLoading) return;
    loadData();
  }, [roleLoading]);

  const loadData = async () => {
    try {
      const seasonStart = getCurrentSeasonStart();

      const [pasRes, playersRes] = await Promise.all([
        supabase
          .from("plate_appearances")
          .select("pa_id, batter_id, pitcher_id, play_result, k_or_bb, game_id, inning, runs_scored, games!inner(game_date)")
          .gte("games.game_date", seasonStart),
        supabase.from("players").select("player_id, player_name"),
      ]);

      setAllPAs((pasRes.data ?? []) as unknown as RawPA[]);
      setPlayers(playersRes.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const playerMap = useMemo(() => {
    const m: Record<number, string> = {};
    players.forEach((p) => (m[p.player_id] = p.player_name));
    return m;
  }, [players]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    allPAs.forEach((pa) => {
      const gd = pa.games?.game_date;
      if (gd) dates.add(gd);
    });
    return Array.from(dates).sort();
  }, [allPAs]);

  const filteredPAs = useMemo(() => {
    let pas = allPAs;
    if (selectedDate !== "all") {
      pas = pas.filter((pa) => (pa.games?.game_date ?? "") === selectedDate);
    }
    return pas;
  }, [allPAs, selectedDate]);

  // ========== HITTING TABLE ==========
  const hittingRows = useMemo(() => {
    const groups: Record<number, RawPA[]> = {};
    filteredPAs.forEach((pa) => {
      if (!groups[pa.batter_id]) groups[pa.batter_id] = [];
      groups[pa.batter_id].push(pa);
    });

    return Object.entries(groups)
      .map(([id, pas]) => {
        const pid = Number(id);
        const name = playerMap[pid] ?? String(pid);
        const gameIds = new Set(pas.map((p) => p.game_id));
        const gp = gameIds.size;

        const hits = pas.filter((p) => ["Single", "Double", "Triple", "HomeRun"].includes(p.play_result ?? ""));
        const singles = hits.filter((p) => p.play_result === "Single").length;
        const doubles = hits.filter((p) => p.play_result === "Double").length;
        const triples = hits.filter((p) => p.play_result === "Triple").length;
        const hr = hits.filter((p) => p.play_result === "HomeRun").length;
        const h = hits.length;

        const walks = pas.filter((p) => p.k_or_bb === "Walk").length;
        const strikeouts = pas.filter((p) => p.k_or_bb === "Strikeout").length;
        // AB = PAs minus walks. Strikeouts ARE at-bats (Trackman writes
        // play_result="Undefined" on Ks, so we can't filter on that field).
        const ab = pas.filter((p) => p.k_or_bb !== "Walk").length;

        // MLB formulas (HBP and SF not available in Trackman source, so omitted):
        //   AVG = H / AB
        //   SLG = TB / AB
        //   OBP = (H + BB) / (AB + BB)   [equivalent to (H+BB)/PA since AB = PA - BB here]
        //   OPS = OBP + SLG
        const avg = ab > 0 ? h / ab : 0;
        const tb = singles + doubles * 2 + triples * 3 + hr * 4;
        const slg = ab > 0 ? tb / ab : 0;
        const obp = pas.length > 0 ? (h + walks) / pas.length : 0;
        const ops = obp + slg;

        const rbi = pas.reduce((s, p) => s + (p.runs_scored ?? 0), 0);

        // Runs scored (count PAs where this batter scored - approximate via runs_scored on PAs where they batted)
        // We don't have individual runner tracking so we skip R

        return {
          pid, name, gp, ab, h, doubles, triples, hr, rbi, tb, walks, strikeouts,
          avg, slg, obp, ops, totalPAs: pas.length,
        };
      })
      .filter((r) => r.totalPAs > 0);
  }, [filteredPAs, playerMap]);

  // ========== PITCHING TABLE ==========
  const pitchingRows = useMemo(() => {
    const groups: Record<number, RawPA[]> = {};
    filteredPAs.forEach((pa) => {
      if (!groups[pa.pitcher_id]) groups[pa.pitcher_id] = [];
      groups[pa.pitcher_id].push(pa);
    });

    return Object.entries(groups)
      .map(([id, pas]) => {
        const pid = Number(id);
        const name = playerMap[pid] ?? String(pid);
        const gameIds = new Set(pas.map((p) => p.game_id));
        const app = gameIds.size;

        const hitsAllowed = pas.filter((p) => ["Single", "Double", "Triple", "HomeRun"].includes(p.play_result ?? ""));
        const h = hitsAllowed.length;
        const doubles = hitsAllowed.filter((p) => p.play_result === "Double").length;
        const triples = hitsAllowed.filter((p) => p.play_result === "Triple").length;
        const hr = hitsAllowed.filter((p) => p.play_result === "HomeRun").length;

        const bb = pas.filter((p) => p.k_or_bb === "Walk").length;
        const so = pas.filter((p) => p.k_or_bb === "Strikeout").length;
        const er = pas.reduce((s, p) => s + (p.runs_scored ?? 0), 0);

        const ab = pas.filter((p) => p.k_or_bb !== "Walk").length;
        const bavg = ab > 0 ? h / ab : 0;

        // Estimate IP: outs = AB - H (at bats minus hits). Approximate — does not
        // account for sac flies / HBP since those columns aren't in the source data.
        const outs = ab - h;
        const ipFull = Math.floor(outs / 3);
        const ipRemainder = outs % 3;
        const ipDisplay = `${ipFull}.${ipRemainder}`;
        const ipDecimal = outs / 3;

        const era = ipDecimal > 0 ? (er / ipDecimal) * 9 : 0;
        const whip = ipDecimal > 0 ? (bb + h) / ipDecimal : 0;

        return {
          pid, name, app, h, doubles, triples, hr, bb, so, er, ab, bavg,
          ipDisplay, era, whip, totalPAs: pas.length, r: er, // R ≈ ER with available data
        };
      })
      .filter((r) => r.totalPAs > 0);

  }, [filteredPAs, playerMap]);

  const sortedHittingRows = useMemo(() => {
    const rows = [...hittingRows];
    rows.sort((a, b) => {
      const aVal = (a as Partial<Record<SortKey, string | number>>)[sortKey] ?? 0;
      const bVal = (b as Partial<Record<SortKey, string | number>>)[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return rows;
  }, [hittingRows, sortKey, sortDir]);

  const sortedPitchingRows = useMemo(() => {
    const rows = [...pitchingRows];
    rows.sort((a, b) => {
      const aVal = (a as Partial<Record<SortKey, string | number>>)[sortKey] ?? 0;
      const bVal = (b as Partial<Record<SortKey, string | number>>)[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return rows;
  }, [pitchingRows, sortKey, sortDir]);

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px]">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-4">Team stats for the current season</p>

        {allPAs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 mb-4 text-center">
            <p className="text-sm text-foreground font-medium">No data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload Trackman CSVs via the Admin page to populate the dashboard.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "hitting" | "pitching")}>
            <TabsList className="h-9">
              <TabsTrigger value="hitting" className="text-xs px-4">Hitters</TabsTrigger>
              <TabsTrigger value="pitching" className="text-xs px-4">Pitchers</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Game Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {availableDates.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tables */}
        {tab === "hitting" ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-[11px] font-semibold w-8 text-center">#</TableHead>
                  <SortHead label="PLAYER" field="name" className="min-w-[120px] text-left" />
                  <SortHead label="AVG" field="avg" />
                  <SortHead label="OPS" field="ops" />
                  <SortHead label="GP" field="gp" />
                  <SortHead label="AB" field="ab" />
                  <SortHead label="H" field="h" />
                  <SortHead label="2B" field="doubles" />
                  <SortHead label="3B" field="triples" />
                  <SortHead label="HR" field="hr" />
                  <SortHead label="RBI" field="rbi" />
                  <SortHead label="TB" field="tb" />
                  <SortHead label="SLG%" field="slg" />
                  <SortHead label="BB" field="walks" />
                  <SortHead label="SO" field="strikeouts" />
                  <SortHead label="OB%" field="obp" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHittingRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center text-muted-foreground py-8">
                      No hitting data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHittingRows.map((r, i) => (
                    <TableRow key={r.pid} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                      <TableCell className="text-[11px] text-center font-medium">{i + 1}</TableCell>
                      <TableCell className="text-[11px] font-semibold text-primary underline">{r.name}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.avg.toFixed(3)}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.ops.toFixed(3)}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.gp}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.ab}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.h}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.doubles}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.triples}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.hr}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.rbi}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.tb}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.slg.toFixed(3)}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.walks}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.strikeouts}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.obp.toFixed(3)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-[11px] font-semibold w-8 text-center">#</TableHead>
                  <SortHead label="PLAYER" field="name" className="min-w-[120px] text-left" />
                  <SortHead label="ERA" field="era" />
                  <SortHead label="WHIP" field="whip" />
                  <SortHead label="APP" field="app" />
                  <SortHead label="IP" field="ipDisplay" />
                  <SortHead label="H" field="h" />
                  <SortHead label="R" field="r" />
                  <SortHead label="ER" field="er" />
                  <SortHead label="BB" field="bb" />
                  <SortHead label="SO" field="so" />
                  <SortHead label="2B" field="doubles" />
                  <SortHead label="3B" field="triples" />
                  <SortHead label="HR" field="hr" />
                  <SortHead label="AB" field="ab" />
                  <SortHead label="B/AVG" field="bavg" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPitchingRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center text-muted-foreground py-8">
                      No pitching data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPitchingRows.map((r, i) => (
                    <TableRow key={r.pid} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                      <TableCell className="text-[11px] text-center font-medium">{i + 1}</TableCell>
                      <TableCell className="text-[11px] font-semibold text-primary underline">{r.name}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.era.toFixed(2)}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.whip.toFixed(2)}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.app}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.ipDisplay}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.h}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.r}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.er}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.bb}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.so}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.doubles}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.triples}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.hr}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.ab}</TableCell>
                      <TableCell className="text-[11px] text-center">{r.bavg.toFixed(3)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
