import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import StrikeZone from "@/components/StrikeZone";

interface GameOption {
  game_id: string;
  game_date: string;
}

interface PAData {
  pa_id: string;
  inning: number;
  top_bottom: string;
  outs: number;
  pa_of_inning: number | null;
  play_result: string | null;
  k_or_bb: string | null;
  batter: { player_name: string } | null;
  pitcher: { player_name: string } | null;
}

interface PitchData {
  pitch_uid: string;
  pitch_of_pa: number | null;
  tagged_pitch_type: string | null;
  pitch_call: string | null;
  rel_speed: number | null;
  plate_loc_height: number | null;
  plate_loc_side: number | null;
  spin_rate: number | null;
}

const GameLog = () => {
  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [pas, setPas] = useState<PAData[]>([]);
  const [expandedInning, setExpandedInning] = useState<string | null>(null);
  const [selectedPA, setSelectedPA] = useState<string | null>(null);
  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [pasLoading, setPasLoading] = useState(false);
  const [pitchesLoading, setPitchesLoading] = useState(false);

  useEffect(() => {
    setGamesLoading(true);
    supabase
      .from("games")
      .select("game_id, game_date")
      .order("game_date", { ascending: false })
      .then(({ data }) => {
        setGames(data ?? []);
        setGamesLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedGame) return;
    setPasLoading(true);
    setPas([]);
    setExpandedInning(null);
    setSelectedPA(null);
    supabase
      .from("plate_appearances")
      .select("pa_id, inning, top_bottom, outs, pa_of_inning, play_result, k_or_bb, batter:players!plate_appearances_batter_id_fkey(player_name), pitcher:players!plate_appearances_pitcher_id_fkey(player_name)")
      .eq("game_id", selectedGame)
      .order("inning")
      .order("pa_of_inning")
      .then(({ data }) => {
        setPas((data as any) ?? []);
        setPasLoading(false);
      });
  }, [selectedGame]);

  useEffect(() => {
    if (!selectedPA) return;
    setPitchesLoading(true);
    setPitches([]);
    supabase
      .from("pitches")
      .select("pitch_uid, pitch_of_pa, tagged_pitch_type, pitch_call, rel_speed, plate_loc_height, plate_loc_side, spin_rate")
      .eq("pa_id", selectedPA)
      .order("pitch_of_pa")
      .then(({ data }) => {
        setPitches(data ?? []);
        setPitchesLoading(false);
      });
  }, [selectedPA]);

  // Group PAs by inning
  const inningGroups = useMemo(() => {
    const groups: Record<string, PAData[]> = {};
    pas.forEach((pa) => {
      const key = `${pa.top_bottom} ${pa.inning}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(pa);
    });
    return groups;
  }, [pas]);

  // Compute running count for each pitch
  const pitchCounts = useMemo(() => {
    let balls = 0;
    let strikes = 0;
    return pitches.map((p) => {
      const count = `${balls}-${strikes}`;
      if (p.pitch_call === "BallCalled" || p.pitch_call === "HitByPitch") {
        balls = Math.min(balls + 1, 4);
      } else if (
        p.pitch_call === "StrikeCalled" ||
        p.pitch_call === "StrikeSwinging" ||
        (p.pitch_call === "FoulBallNotFieldable" && strikes < 2)
      ) {
        strikes = Math.min(strikes + 1, 3);
      }
      return { ...p, count };
    });
  }, [pitches]);

  const getOutcome = (pa: PAData) => {
    if (pa.k_or_bb && pa.k_or_bb !== "Undefined") return pa.k_or_bb;
    if (pa.play_result && pa.play_result !== "Undefined") return pa.play_result;
    return "—";
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Game Log</h1>

        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger className="w-72 mb-6">
            <SelectValue placeholder="Select a game" />
          </SelectTrigger>
          <SelectContent>
            {games.map((g) => (
              <SelectItem key={g.game_id} value={g.game_id}>
                {new Date(g.game_date + "T00:00:00").toLocaleDateString()} — {g.game_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {gamesLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading games...
          </div>
        )}

        {selectedGame && pasLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading plate appearances...
          </div>
        )}

        {selectedGame && !pasLoading && Object.keys(inningGroups).length === 0 && (
          <p className="text-muted-foreground">No plate appearances recorded for this game.</p>
        )}

        <div className="space-y-2">
          {Object.entries(inningGroups).map(([inningKey, inningPas]) => {
            const isExpanded = expandedInning === inningKey;
            return (
              <Card key={inningKey} className="overflow-hidden">
                <button
                  onClick={() => setExpandedInning(isExpanded ? null : inningKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {inningKey}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {inningPas.map((pa) => (
                      <div key={pa.pa_id}>
                        <button
                          onClick={() => setSelectedPA(selectedPA === pa.pa_id ? null : pa.pa_id)}
                          className="w-full flex items-center justify-between px-6 py-2 text-sm hover:bg-muted/30 transition-colors"
                        >
                          <span>
                            <span className="font-medium">{(pa.pitcher as any)?.player_name}</span>
                            {" vs "}
                            <span className="font-medium">{(pa.batter as any)?.player_name}</span>
                          </span>
                          <span className="text-muted-foreground">{getOutcome(pa)}</span>
                        </button>

                        {selectedPA === pa.pa_id && pitchesLoading && (
                          <div className="flex items-center gap-2 px-6 py-3 bg-muted/20 border-t border-border text-muted-foreground text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading pitches...
                          </div>
                        )}

                        {selectedPA === pa.pa_id && !pitchesLoading && pitchCounts.length > 0 && (
                          <div className="px-6 py-4 bg-muted/20 border-t border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-foreground">Pitch Locations</h4>
                                <StrikeZone
                                  pitches={pitchCounts.map((p) => ({
                                    x: p.plate_loc_side ?? 0,
                                    y: p.plate_loc_height ?? 0,
                                    type: p.tagged_pitch_type ?? "Other",
                                    call: p.pitch_call ?? "",
                                  }))}
                                  width={250}
                                  height={300}
                                />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-foreground">Pitch Details</h4>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border text-muted-foreground">
                                      <th className="text-left py-1">#</th>
                                      <th className="text-left py-1">Count</th>
                                      <th className="text-left py-1">Type</th>
                                      <th className="text-left py-1">Velo</th>
                                      <th className="text-left py-1">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pitchCounts.map((p, i) => (
                                      <tr key={p.pitch_uid} className="border-b border-border/50">
                                        <td className="py-1">{i + 1}</td>
                                        <td className="py-1">{p.count}</td>
                                        <td className="py-1">{p.tagged_pitch_type ?? "—"}</td>
                                        <td className="py-1">{p.rel_speed ? p.rel_speed.toFixed(1) : "—"}</td>
                                        <td className="py-1">{p.pitch_call ?? "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default GameLog;
