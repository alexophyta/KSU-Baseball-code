import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, FileText, Loader2, Save, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import HittingTab from "@/components/player-analytics/HittingTab";
import PitchingTab from "@/components/player-analytics/PitchingTab";
import PlayerFilterBar from "@/components/player-analytics/PlayerFilterBar";
import FilterChips from "@/components/player-analytics/FilterChips";

import { computePitchCounts } from "@/lib/playerAnalytics/constants";
import { fetchLeagueBaselines, type LeagueBaselines } from "@/lib/playerAnalytics/stuffPlus";
import { computeHitting } from "@/lib/playerAnalytics/computeHitting";
import { computePitching, computeInningData } from "@/lib/playerAnalytics/computePitching";
import type { AnalyticsFilters } from "@/lib/playerAnalytics/types";

import { parseCSV, type RawRow } from "@/lib/scouting/csvParser";
import {
  adaptCSV,
  convertRowsForBatter,
  convertRowsForPitcher,
  type AdaptedData,
} from "@/lib/scouting/csvAdapter";
import {
  loadSavedProfiles,
  persistSavedProfiles,
  type SavedProfile,
} from "@/lib/scouting/savedProfiles";

const DEFAULT_FILTERS: AnalyticsFilters = {
  countFilter: "all",
  pitchTypeFilter: "all",
  handednessFilter: "all",
  outcomeFilter: "all",
  selectedDates: [],
  veloRange: [0, 110],
  batterFilter: "all",
};

interface UploadedFile {
  name: string;
  rows: RawRow[];
  playerNames: Set<string>;
}

const Scouting = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [tab, setTab] = useState<string>("hitting");
  const [dragOver, setDragOver] = useState(false);

  const [leagueBaselines, setLeagueBaselines] = useState<LeagueBaselines>({});
  const [baselinesLoading, setBaselinesLoading] = useState(true);
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);

  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(() => loadSavedProfiles());

  // Fetch baselines once on mount
  useEffect(() => {
    fetchLeagueBaselines().then((b) => { setLeagueBaselines(b); setBaselinesLoading(false); });
  }, []);

  // Reset filters on tab/player change. Hitter velo slider starts at 50 mph (matches Player Data).
  useEffect(() => {
    const veloMin = tab === "pitching" ? 0 : 50;
    setFilters({ ...DEFAULT_FILTERS, veloRange: [veloMin, 110] });
  }, [tab, selectedPlayer]);

  const handleFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList).filter((f) => f.name.endsWith(".csv"));
    if (arr.length === 0) return;
    const readers = arr.map(
      (file) =>
        new Promise<UploadedFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = parseCSV(text);
            const playerNames = new Set<string>();
            rows.forEach((r) => {
              const b = r["Batter"] || r["BatterName"] || r["batter"];
              const p = r["Pitcher"] || r["PitcherName"] || r["pitcher"];
              if (b) playerNames.add(b);
              if (p) playerNames.add(p);
            });
            resolve({ name: file.name, rows, playerNames });
          };
          reader.readAsText(file);
        }),
    );
    Promise.all(readers).then((newFiles) => {
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.name));
        return [...prev, ...newFiles.filter((f) => !existing.has(f.name))];
      });
      setSelectedPlayer("");
    });
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = "";
  };
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, []);
  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setSelectedPlayer("");
  };
  const clearAll = () => {
    setFiles([]);
    setSelectedPlayer("");
  };

  // Adapted dataset combines rows from all uploaded files
  const adapted = useMemo(() => {
    if (files.length === 0) return null;
    const allRows = files.flatMap((f) => f.rows);
    return adaptCSV(allRows);
  }, [files]);

  // Players that appear in ALL uploaded files (intersection)
  const commonPlayerNames = useMemo(() => {
    if (files.length === 0) return new Set<string>();
    let intersection = new Set(files[0].playerNames);
    for (let i = 1; i < files.length; i++) {
      intersection = new Set([...intersection].filter((n) => files[i].playerNames.has(n)));
    }
    return intersection;
  }, [files]);

  const visiblePlayers = useMemo(() => {
    if (!adapted) return [];
    return adapted.players.filter((p) => commonPlayerNames.has(p.name));
  }, [adapted, commonPlayerNames]);

  const persistProfiles = (next: SavedProfile[]) => {
    setSavedProfiles(next);
    const result = persistSavedProfiles(next);
    if (!result.ok) toast.error("Could not save profile (storage full?)");
  };

  const saveCurrentPlayer = () => {
    if (!adapted || !selectedPlayer) return;
    const batterRows = adapted.rowsByBatter.get(selectedPlayer) ?? [];
    const pitcherRows = adapted.rowsByPitcher.get(selectedPlayer) ?? [];
    const seen = new Set<RawRow>();
    const rows: RawRow[] = [];
    for (const r of [...batterRows, ...pitcherRows]) {
      if (!seen.has(r)) { seen.add(r); rows.push(r); }
    }
    if (rows.length === 0) {
      toast.error("No rows to save for this player");
      return;
    }
    const next = savedProfiles.filter((p) => p.name !== selectedPlayer);
    next.unshift({
      name: selectedPlayer,
      rows,
      savedAt: new Date().toISOString(),
      sourceFile: files.map((f) => f.name).join(", ") || "uploaded.csv",
    });
    persistProfiles(next);
    toast.success(`Saved ${selectedPlayer} (${rows.length} rows)`);
  };

  const loadProfile = (profile: SavedProfile) => {
    const playerNames = new Set<string>();
    profile.rows.forEach((r) => {
      const b = r["Batter"] || r["BatterName"] || r["batter"];
      const p = r["Pitcher"] || r["PitcherName"] || r["pitcher"];
      if (b) playerNames.add(b);
      if (p) playerNames.add(p);
    });
    setFiles([{ name: `${profile.sourceFile} • ${profile.name}`, rows: profile.rows, playerNames }]);
    setSelectedPlayer(profile.name);
    toast.success(`Loaded ${profile.name}`);
  };

  const deleteProfile = (name: string) => {
    persistProfiles(savedProfiles.filter((p) => p.name !== name));
  };

  const isCurrentSaved = savedProfiles.some((p) => p.name === selectedPlayer);

  // Convert selected player's rows into shared shape
  const playerData = useMemo(() => {
    if (!adapted || !selectedPlayer) return null;
    const batterRows = adapted.rowsByBatter.get(selectedPlayer) ?? [];
    const pitcherRows = adapted.rowsByPitcher.get(selectedPlayer) ?? [];
    const hasH = batterRows.length > 0;
    const hasP = pitcherRows.length > 0;
    const hitting = hasH ? convertRowsForBatter(batterRows) : null;
    const pitching = hasP ? convertRowsForPitcher(pitcherRows, adapted.batterIdByName) : null;
    return { hasH, hasP, hitting, pitching };
  }, [adapted, selectedPlayer]);

  // Default tab when player changes
  useEffect(() => {
    if (!playerData) return;
    if (playerData.hasH) setTab("hitting");
    else if (playerData.hasP) setTab("pitching");
  }, [playerData]);

  // Memos for filter bar / computed analytics
  const batterPAResults = useMemo(() => {
    const m = new Map<string, string | null>();
    playerData?.hitting?.pas.forEach((pa) => m.set(pa.pa_id, pa.play_result));
    return m;
  }, [playerData]);
  const pitcherPAResults = useMemo(() => {
    const m = new Map<string, string | null>();
    playerData?.pitching?.pas.forEach((pa) => m.set(pa.pa_id, pa.play_result));
    return m;
  }, [playerData]);
  const batterPitchCounts = useMemo(() => computePitchCounts(playerData?.hitting?.pitches ?? []), [playerData]);
  const pitcherPitchCounts = useMemo(() => computePitchCounts(playerData?.pitching?.pitches ?? []), [playerData]);

  const hittingPitchTypes = useMemo(() => {
    const types = new Set<string>();
    playerData?.hitting?.pitches.forEach((p) => { if (p.tagged_pitch_type) types.add(p.tagged_pitch_type); });
    return Array.from(types).sort();
  }, [playerData]);
  const pitchingPitchTypes = useMemo(() => {
    const types = new Set<string>();
    playerData?.pitching?.pitches.forEach((p) => { if (p.tagged_pitch_type) types.add(p.tagged_pitch_type); });
    return Array.from(types).sort();
  }, [playerData]);

  const availableDates = useMemo(() => {
    const pas = tab === "pitching" ? playerData?.pitching?.pas : playerData?.hitting?.pas;
    const dates = new Set<string>();
    pas?.forEach((pa) => { if (pa.games?.game_date) dates.add(pa.games.game_date); });
    return Array.from(dates).sort();
  }, [tab, playerData]);

  // Hitters faced by this pitcher (for hitter dropdown on pitching tab).
  const battersFaced = useMemo(() => {
    const pas = playerData?.pitching?.pas ?? [];
    const seen = new Map<string, string>();
    pas.forEach((pa) => {
      if (pa.batter_id == null) return;
      const id = String(pa.batter_id);
      if (!seen.has(id)) seen.set(id, adapted?.batterNameById.get(pa.batter_id) ?? `#${pa.batter_id}`);
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [playerData, adapted]);

  const hittingComputed = useMemo(() => {
    if (!playerData?.hasH || !playerData.hitting) return null;
    return computeHitting({
      rawBatterPAs: playerData.hitting.pas,
      rawBatterPitches: playerData.hitting.pitches,
      rawBattedBalls: playerData.hitting.battedBalls,
      batterPAResults, batterPitchCounts,
      filters, leagueBaselines,
    });
  }, [playerData, batterPAResults, batterPitchCounts, filters, leagueBaselines]);

  const pitchingComputed = useMemo(() => {
    if (!playerData?.hasP || !playerData.pitching) return null;
    return computePitching({
      rawPitcherPAs: playerData.pitching.pas,
      rawPitcherPitches: playerData.pitching.pitches,
      rawPitcherBattedBalls: playerData.pitching.battedBalls,
      pitcherPAResults, pitcherPitchCounts,
      filters, leagueBaselines,
    });
  }, [playerData, pitcherPAResults, pitcherPitchCounts, filters, leagueBaselines]);

  const inningData = useMemo(() => {
    if (!playerData?.hasP || !playerData.pitching || !pitchingComputed || !adapted) return null;
    return computeInningData({
      rawPitcherPAs: playerData.pitching.pas,
      rawPitcherPitches: playerData.pitching.pitches,
      selectedDates: filters.selectedDates,
      pitcherDisplayName: selectedPlayer,
      batterNameLookup: adapted.batterNameById,
    });
  }, [playerData, pitchingComputed, adapted, filters.selectedDates, selectedPlayer]);

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Scouting</h1>
        <p className="text-muted-foreground mb-6">
          Upload one or more Trackman CSVs to analyze opponents or prospects. When multiple files are uploaded, only players who appear in <em>every</em> file are shown. Data is session-only.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer mb-4
            ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
          onClick={() => document.getElementById("scout-file-input")?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-foreground">Drop CSV files here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Trackman export format (.csv) — multiple files supported</p>
          </div>
          <input id="scout-file-input" type="file" accept=".csv" multiple className="hidden" onChange={onFileInput} />
        </div>

        {files.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {files.length} file{files.length > 1 ? "s" : ""} loaded
                {files.length > 1 && ` • ${commonPlayerNames.size} player${commonPlayerNames.size === 1 ? "" : "s"} in all files`}
              </p>
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">Clear all</Button>
            </div>
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1 truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.rows.length} rows</span>
                <Button variant="ghost" size="icon" onClick={() => removeFile(f.name)} className="h-6 w-6">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {savedProfiles.length > 0 && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Saved Profiles</p>
            <div className="flex flex-wrap gap-2">
              {savedProfiles.map((p) => (
                <div key={p.name} className="flex items-center gap-1 rounded-md border border-border bg-card pl-2 pr-1 py-1">
                  <button
                    onClick={() => loadProfile(p)}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                    title={`${p.rows.length} rows • from ${p.sourceFile}`}
                  >
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">({p.rows.length})</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteProfile(p.name)}
                    title="Delete saved profile"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adapted && visiblePlayers.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={`Select a player (${visiblePlayers.length} available)`} />
              </SelectTrigger>
              <SelectContent>
                {visiblePlayers.map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlayer && (
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentPlayer}
                disabled={isCurrentSaved}
              >
                <Save className="h-4 w-4" />
                {isCurrentSaved ? "Saved" : "Save Profile"}
              </Button>
            )}
            {baselinesLoading && (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading league baselines for Stuff+…
              </span>
            )}
          </div>
        )}

        {playerData && selectedPlayer && (
          <>
            {!playerData.hasH && !playerData.hasP ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No data recorded for {selectedPlayer}.</p>
              </Card>
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <TabsList>
                    {playerData.hasH && <TabsTrigger value="hitting">Hitting</TabsTrigger>}
                    {playerData.hasP && <TabsTrigger value="pitching">Pitching</TabsTrigger>}
                  </TabsList>
                  <PlayerFilterBar
                    filters={filters}
                    setFilters={setFilters}
                    isPitching={tab === "pitching"}
                    pitchTypes={tab === "pitching" ? pitchingPitchTypes : hittingPitchTypes}
                    availableDates={availableDates}
                    batters={battersFaced}
                  />
                </div>

                <FilterChips
                  filters={filters}
                  setFilters={setFilters}
                  isPitching={tab === "pitching"}
                  defaultVeloRange={[tab === "pitching" ? 0 : 50, 110]}
                  batters={battersFaced}
                />

                {playerData.hasH && hittingComputed && (
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

                {playerData.hasP && pitchingComputed && (
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
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Scouting;
