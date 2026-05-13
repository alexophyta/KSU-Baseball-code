
-- Add 'coach' role to existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coach';

-- Games table
CREATE TABLE public.games (
  game_id TEXT NOT NULL PRIMARY KEY,
  game_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view games" ON public.games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert games" ON public.games FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can delete games" ON public.games FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'creator'));

-- Players table (roster)
CREATE TABLE public.players (
  player_id INT NOT NULL PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  pitcher_side VARCHAR(10),
  batter_side VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view players" ON public.players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage players" ON public.players FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can update players" ON public.players FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can delete players" ON public.players FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'creator'));

-- Link players to auth users (for player accounts)
ALTER TABLE public.profiles ADD COLUMN player_id INT REFERENCES public.players(player_id);

-- Plate Appearances table
CREATE TABLE public.plate_appearances (
  pa_id TEXT NOT NULL PRIMARY KEY,
  inning INT NOT NULL,
  top_bottom VARCHAR(10) NOT NULL,
  outs INT NOT NULL,
  game_id TEXT NOT NULL REFERENCES public.games(game_id) ON DELETE CASCADE,
  batter_id INT NOT NULL REFERENCES public.players(player_id),
  pitcher_id INT NOT NULL REFERENCES public.players(player_id),
  pa_of_inning INT,
  k_or_bb VARCHAR(20),
  play_result VARCHAR(50),
  outs_on_play INT DEFAULT 0,
  runs_scored INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plate_appearances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view PAs" ON public.plate_appearances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert PAs" ON public.plate_appearances FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can delete PAs" ON public.plate_appearances FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'creator'));

-- Pitches table
CREATE TABLE public.pitches (
  pitch_uid TEXT NOT NULL PRIMARY KEY,
  pa_id TEXT NOT NULL REFERENCES public.plate_appearances(pa_id) ON DELETE CASCADE,
  pitch_no INT,
  pitch_of_pa INT,
  tagged_pitch_type VARCHAR(50),
  auto_pitch_type VARCHAR(50),
  pitch_call VARCHAR(50),
  rel_speed DECIMAL(11,6),
  vert_rel_angle DECIMAL(11,6),
  horz_rel_angle DECIMAL(11,6),
  spin_rate DECIMAL(11,6),
  spin_axis DECIMAL(11,6),
  tilt VARCHAR(20),
  rel_height DECIMAL(11,6),
  rel_side DECIMAL(11,6),
  extension DECIMAL(11,6),
  vert_break DECIMAL(11,6),
  induced_vert_break DECIMAL(11,6),
  horz_break DECIMAL(11,6),
  plate_loc_height DECIMAL(11,6),
  plate_loc_side DECIMAL(11,6),
  zone_speed DECIMAL(11,6),
  vert_appr_angle DECIMAL(11,6),
  horz_appr_angle DECIMAL(11,6),
  zone_time DECIMAL(11,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view pitches" ON public.pitches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert pitches" ON public.pitches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can delete pitches" ON public.pitches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'creator'));

-- Batted Balls table
CREATE TABLE public.batted_balls (
  pitch_uid TEXT NOT NULL PRIMARY KEY REFERENCES public.pitches(pitch_uid) ON DELETE CASCADE,
  exit_speed DECIMAL(11,6),
  angle DECIMAL(11,6),
  direction DECIMAL(11,6),
  hit_spin_rate DECIMAL(11,6),
  distance DECIMAL(11,6),
  hang_time DECIMAL(11,6),
  tagged_hit_type VARCHAR(50),
  play_result VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.batted_balls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view batted balls" ON public.batted_balls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert batted balls" ON public.batted_balls FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can delete batted balls" ON public.batted_balls FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'creator'));

-- CSV uploads tracking
CREATE TABLE public.csv_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  row_count INT,
  game_ids TEXT[]
);
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view uploads" ON public.csv_uploads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can insert uploads" ON public.csv_uploads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY "Admins can delete uploads" ON public.csv_uploads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'creator'));

-- Indexes
CREATE INDEX idx_plate_appearances_game ON public.plate_appearances(game_id);
CREATE INDEX idx_plate_appearances_batter ON public.plate_appearances(batter_id);
CREATE INDEX idx_plate_appearances_pitcher ON public.plate_appearances(pitcher_id);
CREATE INDEX idx_pitches_pa ON public.pitches(pa_id);
CREATE INDEX idx_games_date ON public.games(game_date);
