import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSeasonStart } from "@/hooks/useSeasonFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

import HittingTab from "@/components/player-analytics/HittingTab";
import PitchingTab from "@/components/player-analytics/PitchingTab";
import PlayerFilterBar from "@/components/player-analytics/PlayerFilterBar";
import FilterChips from "@/components/player-analytics/FilterChips";

import { computePitchCounts } from "@/lib/playerAnalytics/constants";
import { fetchLeagueBaselines, type LeagueBaselines } from "@/lib/playerAnalytics/stuffPlus";
import { computeHitting } from "@/lib/playerAnalytics/computeHitting";
import { computePitching, computeInningData } from "@/lib/playerAnalytics/computePitching";
import type { RawPA, RawPitch, RawBattedBall, AnalyticsFilters, PlayerLite } from "@/lib/playerAnalytics/types";

const DEFAULT_FILTERS: AnalyticsFilters = {
  countFilter: "all",
  pitchTypeFilter: "all",
  handednessFilter: "all",
  outcomeFilter: "all",
  selectedDates: [],
  veloRange: [0, 110],
  batterFilter: "all",
};

const PlayerData = () => {
  const { isStaff, playerId, loading: roleLoading } = useUserRole();
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [tab, setTab] = useState<string>("hitting");
  const [loading, setLoading] = useState(false);

  const [rawBatterPAs, setRawBatterPAs] = useState<RawPA[]>([]);
  const [rawPitcherPAs, setRawPitcherPAs] = useState<RawPA[]>([]);
  const [rawBatterPitches, setRawBatterPitches] = useState<RawPitch[]>([]);
  const [rawPitcherPitches, setRawPitcherPitches] = useState<RawPitch[]>([]);
  const [rawBattedBalls, setRawBattedBalls] = useState<RawBattedBall[]>([]);
  const [rawPitcherBattedBalls, setRawPitcherBattedBalls] = useState<RawBattedBall[]>([]);
  const [hasHitting, setHasHitting] = useState(false);
  const [hasPitching, setHasPitching] = useState(false);

  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [leagueBaselines, setLeagueBaselines] = useState<LeagueBaselines>({});

  // Reset filters on tab/player change. Hitter velo slider starts at 50 mph.
  useEffect(() => {
    const veloMin = tab === "pitching" ? 0 : 50;
    setFilters({ ...DEFAULT_FILTERS, veloRange: [veloMin, 110] });
  }, [tab, selectedPlayer]);

  // League baselines
  useEffect(() => { fetchLeagueBaselines().then(setLeagueBaselines); }, []);

  // Players list
  useEffect(() => {
    if (isStaff) {
      supabase.from("players").select("player_id, player_name").order("player_name").then(({ data }) => {
        setPlayers(data ?? []);
      });
    } else if (playerId) {
      setSelectedPlayer(String(playerId));
      // Non-staff users don't get the full roster, so fetch their own name
      // separately for use in the page header and inning detail headers.
      supabase
        .from("players")
        .select("player_name")
        .eq("player_id", playerId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.player_name) setSelectedPlayerName(data.player_name);
        });
    }
  }, [isStaff, playerId]);

  // Keep selectedPlayerName in sync when staff pick a player from the dropdown.
  useEffect(() => {
    if (!selectedPlayer || players.length === 0) return;
    const match = players.find((p) => String(p.player_id) === selectedPlayer);
    if (match) setSelectedPlayerName(match.player_name);
  }, [selectedPlayer, players]);

  // Load player data
  useEffect(() => {
    if (!selectedPlayer) return;
    const pid = Number(selectedPlayer);
    setLoading(true);
    const seasonStart = getCurrentSeasonStart();

    (async () => {
      const { data: batterPAs } = await supabase
        .from("plate_appearances")
        .select("pa_id, play_result, k_or_bb, outs_on_play, runs_scored, pitcher_id, games!inner(game_date), players!plate_appearances_pitcher_id_fkey(pitcher_side)")
        .eq("batter_id", pid)
        .gte("games.game_date", seasonStart);

      const { data: pitcherPAs } = await supabase
        .from("plate_appearances")
        .select("pa_id, play_result, k_or_bb, outs_on_play, runs_scored, batter_id, inning, top_bottom, pa_of_inning, games!inner(game_date), players!plate_appearances_batter_id_fkey(batter_side)")
        .eq("pitcher_id", pid)
        .gte("games.game_date", seasonStart);

      const hasH = (batterPAs?.length ?? 0) > 0;
      const hasP = (pitcherPAs?.length ?? 0) > 0;
      setHasHitting(hasH);
      setHasPitching(hasP);
      setRawBatterPAs((batterPAs ?? []) as RawPA[]);
      setRawPitcherPAs((pitcherPAs ?? []) as RawPA[]);

      // Batch .in() queries to avoid silently truncating data for high-volume players.
      const CHUNK = 300;
      const fetchInChunks = async <T,>(
        ids: string[],
        runQuery: (chunk: string[]) => Promise<{ data: T[] | null }>,
      ): Promise<T[]> => {
        const out: T[] = [];
        for (let i = 0; i < ids.length; i += CHUNK) {
          const { data } = await runQuery(ids.slice(i, i + CHUNK));
          if (data) out.push(...data);
        }
        return out;
      };

      if (hasH) {
        const paIds = batterPAs!.map((p) => p.pa_id);
        const pitchData = await fetchInChunks<RawPitch>(paIds, (chunk) =>
          supabase
            .from("pitches")
            .select("pitch_uid, pa_id, tagged_pitch_type, pitch_call, rel_speed, plate_loc_height, plate_loc_side, pitch_of_pa, spin_rate, induced_vert_break, horz_break, extension")
            .in("pa_id", chunk) as any
        );
        setRawBatterPitches(pitchData);

        const pitchUids = pitchData.map((p) => p.pitch_uid);
        const bbs = await fetchInChunks<RawBattedBall>(pitchUids, (chunk) =>
          supabase.from("batted_balls").select("*").in("pitch_uid", chunk) as any
        );
        setRawBattedBalls(bbs);
      } else {
        setRawBatterPitches([]);
        setRawBattedBalls([]);
      }

      if (hasP) {
        const paIds = pitcherPAs!.map((p) => p.pa_id);
        const pitchData = await fetchInChunks<RawPitch>(paIds, (chunk) =>
          supabase
            .from("pitches")
            .select("pitch_uid, pa_id, tagged_pitch_type, pitch_call, rel_speed, plate_loc_height, plate_loc_side, spin_rate, vert_break, horz_break, induced_vert_break, rel_height, rel_side, extension, spin_axis, tilt, pitch_of_pa, vert_appr_angle, horz_appr_angle")
            .in("pa_id", chunk) as any
        );
        setRawPitcherPitches(pitchData);

        const pitchUids = pitchData.map((p) => p.pitch_uid);
        const bbs = await fetchInChunks<RawBattedBall>(pitchUids, (chunk) =>
          supabase.from("batted_balls").select("*").in("pitch_uid", chunk) as any
        );
        setRawPitcherBattedBalls(bbs);
      } else {
        setRawPitcherPitches([]);
        setRawPitcherBattedBalls([]);
      }

      setLoading(false);
    })();
  }, [selectedPlayer]);

  // ===== Memoized derivations =====
  const batterPAResults = useMemo(() => {
    const m = new Map<string, string | null>();
    rawBatterPAs.forEach((pa) => m.set(pa.pa_id, pa.play_result));
    return m;
  }, [rawBatterPAs]);

  const pitcherPAResults = useMemo(() => {
    const m = new Map<string, string | null>();
    rawPitcherPAs.forEach((pa) => m.set(pa.pa_id, pa.play_result));
    return m;
  }, [rawPitcherPAs]);

  const batterPitchCounts = useMemo(() => computePitchCounts(rawBatterPitches), [rawBatterPitches]);
  const pitcherPitchCounts = useMemo(() => computePitchCounts(rawPitcherPitches), [rawPitcherPitches]);

  const hittingPitchTypes = useMemo(() => {
    const types = new Set<string>();
    rawBatterPitches.forEach((p) => { if (p.tagged_pitch_type) types.add(p.tagged_pitch_type); });
    return Array.from(types).sort();
  }, [rawBatterPitches]);

  const pitchingPitchTypes = useMemo(() => {
    const types = new Set<string>();
    rawPitcherPitches.forEach((p) => { if (p.tagged_pitch_type) types.add(p.tagged_pitch_type); });
    return Array.from(types).sort();
  }, [rawPitcherPitches]);

  const availableDates = useMemo(() => {
    const pas = tab === "pitching" ? rawPitcherPAs : rawBatterPAs;
    const dates = new Set<string>();
    pas.forEach((pa) => { if (pa.games?.game_date) dates.add(pa.games.game_date); });
    return Array.from(dates).sort();
  }, [tab, rawBatterPAs, rawPitcherPAs]);

  // Hitters faced by this pitcher (for hitter dropdown on pitching tab).
  const battersFaced = useMemo(() => {
    const nameLookup = new Map<number, string>();
    players.forEach((p) => nameLookup.set(p.player_id, p.player_name));
    const seen = new Map<string, string>();
    rawPitcherPAs.forEach((pa) => {
      if (pa.batter_id == null) return;
      const id = String(pa.batter_id);
      if (!seen.has(id)) seen.set(id, nameLookup.get(pa.batter_id) ?? `#${pa.batter_id}`);
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPitcherPAs, players]);

  const hittingComputed = useMemo(() => {
    if (!hasHitting) return null;
    return computeHitting({
      rawBatterPAs, rawBatterPitches, rawBattedBalls,
      batterPAResults, batterPitchCounts,
      filters, leagueBaselines,
    });
  }, [hasHitting, rawBatterPAs, rawBatterPitches, rawBattedBalls, batterPAResults, batterPitchCounts, filters, leagueBaselines]);

  const pitchingComputed = useMemo(() => {
    if (!hasPitching) return null;
    return computePitching({
      rawPitcherPAs, rawPitcherPitches,
      rawPitcherBattedBalls,
      pitcherPAResults, pitcherPitchCounts,
      filters, leagueBaselines,
    });
  }, [hasPitching, rawPitcherPAs, rawPitcherPitches, rawPitcherBattedBalls, pitcherPAResults, pitcherPitchCounts, filters, leagueBaselines]);

  const inningData = useMemo(() => {
    if (!hasPitching || !pitchingComputed) return null;
    const nameLookup = new Map<number, string>();
    players.forEach((p) => nameLookup.set(p.player_id, p.player_name));
    // Fallback chain: roster (staff view) → fetched own name (player view) → "Pitcher"
    const pitcherName =
      nameLookup.get(Number(selectedPlayer)) ?? selectedPlayerName ?? "Pitcher";
    return computeInningData({
      rawPitcherPAs, rawPitcherPitches,
      selectedDates: filters.selectedDates,
      pitcherDisplayName: pitcherName,
      batterNameLookup: nameLookup,
    });
  }, [hasPitching, pitchingComputed, players, selectedPlayer, selectedPlayerName, rawPitcherPAs, rawPitcherPitches, filters.selectedDates]);

  if (roleLoading) {
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
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          {selectedPlayerName ? `${selectedPlayerName} — Player Data` : "Player Data"}
        </h1>

        {isStaff && (
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-72 mb-6"><SelectValue placeholder="Select a player" /></SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.player_id} value={String(p.player_id)}>{p.player_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!selectedPlayer && !isStaff && (
          <p className="text-muted-foreground">Your account is not linked to a player profile.</p>
        )}

        {selectedPlayer && loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {selectedPlayer && !loading && (
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <TabsList>
                {hasHitting && <TabsTrigger value="hitting">Hitting</TabsTrigger>}
                {hasPitching && <TabsTrigger value="pitching">Pitching</TabsTrigger>}
                {!hasHitting && !hasPitching && <TabsTrigger value="none" disabled>No Data</TabsTrigger>}
              </TabsList>
              {(hasHitting || hasPitching) && (
                <PlayerFilterBar
                  filters={filters}
                  setFilters={setFilters}
                  isPitching={tab === "pitching"}
                  pitchTypes={tab === "pitching" ? pitchingPitchTypes : hittingPitchTypes}
                  availableDates={availableDates}
                  batters={battersFaced}
                />
              )}
            </div>

            {(hasHitting || hasPitching) && (
              <FilterChips
                filters={filters}
                setFilters={setFilters}
                isPitching={tab === "pitching"}
                defaultVeloRange={[tab === "pitching" ? 0 : 50, 110]}
                batters={battersFaced}
              />
            )}

            {!hasHitting && !hasPitching && (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm text-foreground font-medium">No data available for this player</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No plate appearances or pitches have been recorded this season. Data appears here once Trackman CSVs containing this player are uploaded.
                </p>
              </div>
            )}

            {hasHitting && hittingComputed && (
              <TabsContent value="hitting">
                <HittingTab
                  computed={hittingComputed}
                  filters={filters}
                  setFilters={setFilters}
                  pitchTypes={hittingPitchTypes}
                  availableDates={availableDates}
                />
              </TabsContent>
            )}

            {hasPitching && pitchingComputed && (
              <TabsContent value="pitching">
                <PitchingTab
                  computed={pitchingComputed}
                  inningData={inningData}
                  filters={filters}
                  setFilters={setFilters}
                  pitchTypes={pitchingPitchTypes}
                  availableDates={availableDates}
                  batters={battersFaced}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default PlayerData;
