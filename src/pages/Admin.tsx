import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Plus, Loader2 } from "lucide-react";
import { parseCSVLine } from "@/lib/scouting/csvParser";

interface CsvUpload {
  id: string;
  file_name: string;
  upload_date: string;
  row_count: number | null;
  game_ids: string[] | null;
}

interface Player {
  player_id: number;
  player_name: string;
  pitcher_side: string | null;
  batter_side: string | null;
}

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<CsvUpload[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [uploading, setUploading] = useState(false);
  const [updateRoster, setUpdateRoster] = useState(true);
  const [newPlayer, setNewPlayer] = useState({ player_id: "", player_name: "", pitcher_side: "", batter_side: "" });

  useEffect(() => {
    loadUploads();
    loadPlayers();
  }, []);

  const loadUploads = async () => {
    const { data } = await supabase.from("csv_uploads").select("*").order("upload_date", { ascending: false });
    setUploads(data ?? []);
  };

  const loadPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("player_name");
    setPlayers(data ?? []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    try {
      const text = await file.text();
      // Normalize line endings (handles CRLF from Trackman exports)
      const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
      const lines = normalized.split("\n").filter((l) => l.length > 0);
      if (lines.length < 2) throw new Error("CSV file is empty");

      // Use the same quote-aware parser for both headers and rows so embedded
      // commas and escaped quotes ("") are handled consistently.
      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => (row[h] = values[i] ?? ""));
        return row;
      });

      // Extract unique games
      const gameMap = new Map<string, string>();
      rows.forEach((r) => {
        if (r.GameID && r.Date) gameMap.set(r.GameID, r.Date);
      });

      // Bulk upsert games
      const gameInserts = Array.from(gameMap.entries()).map(([gameId, dateStr]) => ({
        game_id: gameId,
        game_date: parseDate(dateStr),
      }));
      for (let i = 0; i < gameInserts.length; i += 100) {
        await supabase.from("games").upsert(gameInserts.slice(i, i + 100), { onConflict: "game_id" });
      }

      // Extract unique players (batters + pitchers) from CSV
      const playerMap = new Map<number, { name: string; pSide: string; bSide: string }>();
      rows.forEach((r) => {
        if (r.PitcherId && r.Pitcher) {
          playerMap.set(Number(r.PitcherId), {
            name: r.Pitcher,
            pSide: r.PitcherThrows || playerMap.get(Number(r.PitcherId))?.pSide || "",
            bSide: playerMap.get(Number(r.PitcherId))?.bSide || "",
          });
        }
        if (r.BatterId && r.Batter) {
          const existing = playerMap.get(Number(r.BatterId));
          playerMap.set(Number(r.BatterId), {
            name: r.Batter,
            pSide: existing?.pSide || "",
            bSide: r.BatterSide || existing?.bSide || "",
          });
        }
      });

      // Build name->id remap so CSVs with a different ID for an existing roster
      // name reuse the existing player_id (prevents duplicate roster entries).
      const { data: existingRoster } = await supabase.from("players").select("player_id, player_name");
      const nameToExistingId = new Map<string, number>();
      (existingRoster ?? []).forEach((p) => {
        if (p.player_name) nameToExistingId.set(p.player_name.trim().toLowerCase(), p.player_id);
      });
      const idRemap = new Map<number, number>();
      playerMap.forEach((info, csvId) => {
        const existingId = nameToExistingId.get(info.name.trim().toLowerCase());
        if (existingId != null && existingId !== csvId) idRemap.set(csvId, existingId);
      });
      const canonicalId = (id: number) => idRemap.get(id) ?? id;

      // Determine which player IDs are eligible for inserting PAs/pitches.
      // - updateRoster ON: upsert all CSV players, every CSV player is eligible.
      // - updateRoster OFF: skip player upsert, only keep rows whose batter AND
      //   pitcher are already on the existing roster.
      let eligiblePlayerIds: Set<number>;
      let skippedRows = 0;

      if (updateRoster) {
        // Skip CSV players that remap to an existing roster entry (don't create dupes).
        const playerInserts = Array.from(playerMap.entries())
          .filter(([id]) => !idRemap.has(id))
          .map(([id, info]) => ({
            player_id: id,
            player_name: info.name,
            pitcher_side: info.pSide || null,
            batter_side: info.bSide || null,
          }));
        for (let i = 0; i < playerInserts.length; i += 100) {
          await supabase.from("players").upsert(playerInserts.slice(i, i + 100), { onConflict: "player_id" });
        }
        eligiblePlayerIds = new Set([
          ...playerInserts.map((p) => p.player_id),
          ...Array.from(idRemap.values()),
        ]);
      } else {
        const { data: rosterRows } = await supabase.from("players").select("player_id");
        eligiblePlayerIds = new Set((rosterRows ?? []).map((r) => r.player_id));
      }

      // Group pitches by plate appearance, skipping rows whose batter or pitcher
      // is not on the eligible roster (only matters when updateRoster is OFF).
      const paMap = new Map<string, any>();
      rows.forEach((r) => {
        const batterId = canonicalId(Number(r.BatterId));
        const pitcherId = canonicalId(Number(r.PitcherId));
        if (!eligiblePlayerIds.has(batterId) || !eligiblePlayerIds.has(pitcherId)) {
          skippedRows++;
          return;
        }
        const paKey = `${r.GameID}_${r.Inning}_${r["Top/Bottom"]}_${r.PAofInning}_${batterId}_${pitcherId}`;
        if (!paMap.has(paKey)) {
          paMap.set(paKey, {
            pa_id: paKey,
            game_id: r.GameID,
            inning: Number(r.Inning),
            top_bottom: r["Top/Bottom"],
            outs: Number(r.Outs),
            batter_id: batterId,
            pitcher_id: pitcherId,
            pa_of_inning: Number(r.PAofInning) || null,
            k_or_bb: r.KorBB || null,
            play_result: r.PlayResult || null,
            outs_on_play: Number(r.OutsOnPlay) || 0,
            runs_scored: Number(r.RunsScored) || 0,
            pitches: [],
          });
        }
        // Update PA with latest KorBB/PlayResult (they appear on the last pitch)
        if (r.KorBB && r.KorBB !== "Undefined") paMap.get(paKey).k_or_bb = r.KorBB;
        if (r.PlayResult && r.PlayResult !== "Undefined") paMap.get(paKey).play_result = r.PlayResult;
        paMap.get(paKey).pitches.push(r);
      });

      // Insert plate appearances
      const paInserts = Array.from(paMap.values()).map(({ pitches, ...pa }) => pa);
      for (let i = 0; i < paInserts.length; i += 100) {
        await supabase.from("plate_appearances").upsert(paInserts.slice(i, i + 100), { onConflict: "pa_id" });
      }

      // Insert pitches
      const pitchInserts: any[] = [];
      const battedBallInserts: any[] = [];
      for (const [paKey, paData] of paMap) {
        for (const r of paData.pitches) {
          if (!r.PitchUID) continue;
          pitchInserts.push({
            pitch_uid: r.PitchUID,
            pa_id: paKey,
            pitch_no: Number(r.PitchNo) || null,
            pitch_of_pa: Number(r.PitchofPA) || null,
            tagged_pitch_type: r.TaggedPitchType || null,
            auto_pitch_type: r.AutoPitchType || null,
            pitch_call: r.PitchCall || null,
            rel_speed: parseNum(r.RelSpeed),
            vert_rel_angle: parseNum(r.VertRelAngle),
            horz_rel_angle: parseNum(r.HorzRelAngle),
            spin_rate: parseNum(r.SpinRate),
            spin_axis: parseNum(r.SpinAxis),
            tilt: r.Tilt || null,
            rel_height: parseNum(r.RelHeight),
            rel_side: parseNum(r.RelSide),
            extension: parseNum(r.Extension),
            vert_break: parseNum(r.VertBreak),
            induced_vert_break: parseNum(r.InducedVertBreak),
            horz_break: parseNum(r.HorzBreak),
            plate_loc_height: parseNum(r.PlateLocHeight),
            plate_loc_side: parseNum(r.PlateLocSide),
            zone_speed: parseNum(r.ZoneSpeed),
            vert_appr_angle: parseNum(r.VertApprAngle),
            horz_appr_angle: parseNum(r.HorzApprAngle),
            zone_time: parseNum(r.ZoneTime),
          });

          // Batted ball data
          if (r.ExitSpeed || r.TaggedHitType) {
            battedBallInserts.push({
              pitch_uid: r.PitchUID,
              exit_speed: parseNum(r.ExitSpeed),
              angle: parseNum(r.Angle),
              direction: parseNum(r.Direction),
              hit_spin_rate: parseNum(r.HitSpinRate),
              distance: parseNum(r.Distance),
              hang_time: parseNum(r.HangTime),
              tagged_hit_type: r.TaggedHitType || null,
              play_result: r.PlayResult || null,
            });
          }
        }
      }

      for (let i = 0; i < pitchInserts.length; i += 100) {
        await supabase.from("pitches").upsert(pitchInserts.slice(i, i + 100), { onConflict: "pitch_uid" });
      }
      for (let i = 0; i < battedBallInserts.length; i += 100) {
        await supabase.from("batted_balls").upsert(battedBallInserts.slice(i, i + 100), { onConflict: "pitch_uid" });
      }

      // Track upload
      await supabase.from("csv_uploads").insert({
        file_name: file.name,
        uploaded_by: user.id,
        row_count: rows.length,
        game_ids: Array.from(gameMap.keys()),
      });

      const processedRows = rows.length - skippedRows;
      const skipNote = skippedRows > 0 ? ` · ${skippedRows} row(s) skipped (player not on roster)` : "";
      toast({
        title: "Upload complete",
        description: `${processedRows} of ${rows.length} rows processed from ${file.name}${skipNote}`,
      });
      loadUploads();
      loadPlayers();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteUpload = async (id: string, gameIds: string[] | null) => {
    // Delete associated data. Games cascade to PAs/pitches/batted_balls via FK.
    // Bulk delete by `.in(...)` so a single round-trip handles all games at once
    // (and so we don't silently skip cleanup if game_ids is empty).
    if (gameIds && gameIds.length > 0) {
      await supabase.from("games").delete().in("game_id", gameIds);
    }

    // Clean up players who are no longer referenced by any plate_appearances.
    // We can't enumerate which players belonged to this upload (not tracked),
    // so we sweep orphaned players globally — safe because PAs cascade-delete first.
    const { data: refPAs } = await supabase
      .from("plate_appearances")
      .select("batter_id, pitcher_id");
    const referenced = new Set<number>();
    refPAs?.forEach((pa) => {
      referenced.add(pa.batter_id);
      referenced.add(pa.pitcher_id);
    });
    const { data: allPlayers } = await supabase.from("players").select("player_id");
    const orphanedIds = (allPlayers ?? [])
      .map((p) => p.player_id)
      .filter((pid) => !referenced.has(pid));
    if (orphanedIds.length > 0) {
      await supabase.from("players").delete().in("player_id", orphanedIds);
    }

    await supabase.from("csv_uploads").delete().eq("id", id);
    toast({ title: "Upload deleted" });
    loadUploads();
    loadPlayers();
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.player_id || !newPlayer.player_name) return;
    const { error } = await supabase.from("players").insert({
      player_id: Number(newPlayer.player_id),
      player_name: newPlayer.player_name,
      pitcher_side: newPlayer.pitcher_side || null,
      batter_side: newPlayer.batter_side || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Player added" });
      setNewPlayer({ player_id: "", player_name: "", pitcher_side: "", batter_side: "" });
      loadPlayers();
    }
  };

  const handleDeletePlayer = async (pid: number) => {
    await supabase.from("players").delete().eq("player_id", pid);
    toast({ title: "Player removed" });
    loadPlayers();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin</h1>

        <Tabs defaultValue="uploads">
          <TabsList className="mb-6">
            <TabsTrigger value="uploads">CSV Uploads</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
          </TabsList>

          <TabsContent value="uploads">
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Upload Trackman CSV</h3>
              <div className="flex flex-wrap items-center gap-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploading ? "Processing..." : "Upload CSV"}
                </Button>
                <div className="flex items-center gap-3">
                  <Switch
                    id="update-roster"
                    checked={updateRoster}
                    onCheckedChange={setUpdateRoster}
                    disabled={uploading}
                  />
                  <Label htmlFor="update-roster" className="cursor-pointer">
                    <span className="font-medium text-foreground">Update roster from CSV</span>
                    <span className="block text-xs text-muted-foreground">
                      {updateRoster
                        ? "New players in the CSV will be added to the roster."
                        : "Only data for players already on the roster will be imported."}
                    </span>
                  </Label>
                </div>
              </div>
            </Card>

            <h3 className="text-lg font-semibold mb-3 text-foreground">Upload History</h3>
            {uploads.length === 0 ? (
              <p className="text-muted-foreground">No uploads yet.</p>
            ) : (
              <div className="space-y-2">
                {uploads.map((u) => (
                  <Card key={u.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{u.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(u.upload_date).toLocaleDateString()} · {u.row_count ?? 0} rows
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUpload(u.id, u.game_ids)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="roster">
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Add Player</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Player ID</Label>
                  <Input value={newPlayer.player_id} onChange={(e) => setNewPlayer({ ...newPlayer, player_id: e.target.value })} placeholder="e.g. 800744" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={newPlayer.player_name} onChange={(e) => setNewPlayer({ ...newPlayer, player_name: e.target.value })} placeholder="Last, First" />
                </div>
                <div>
                  <Label>Throws</Label>
                  <Input value={newPlayer.pitcher_side} onChange={(e) => setNewPlayer({ ...newPlayer, pitcher_side: e.target.value })} placeholder="Right/Left" />
                </div>
                <div>
                  <Label>Bats</Label>
                  <Input value={newPlayer.batter_side} onChange={(e) => setNewPlayer({ ...newPlayer, batter_side: e.target.value })} placeholder="Right/Left" />
                </div>
              </div>
              <Button className="mt-4" onClick={handleAddPlayer}>
                <Plus className="h-4 w-4 mr-2" /> Add Player
              </Button>
            </Card>

            <h3 className="text-lg font-semibold mb-3 text-foreground">Roster ({players.length})</h3>
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Throws</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bats</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.player_id} className="border-t border-border">
                      <td className="px-4 py-2">{p.player_id}</td>
                      <td className="px-4 py-2 font-medium">{p.player_name}</td>
                      <td className="px-4 py-2">{p.pitcher_side ?? "—"}</td>
                      <td className="px-4 py-2">{p.batter_side ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePlayer(p.player_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseDate(dateStr: string): string {
  // Handle M/D/YYYY format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return dateStr;
}

// parseCSVLine is imported from src/lib/scouting/csvParser — single quote-aware
// implementation shared with the Scouting page (handles "" escapes correctly).

export default Admin;
