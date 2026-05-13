
-- Create helper function for coach or creator check
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('creator', 'coach')
  )
$$;

-- Allow coaches to also insert/delete data (same as creators)
-- Games
CREATE POLICY "Coaches can insert games" ON public.games FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete games" ON public.games FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

-- Players
CREATE POLICY "Coaches can manage players insert" ON public.players FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can update players" ON public.players FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete players" ON public.players FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

-- Plate appearances
CREATE POLICY "Coaches can insert PAs" ON public.plate_appearances FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete PAs" ON public.plate_appearances FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

-- Pitches
CREATE POLICY "Coaches can insert pitches" ON public.pitches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete pitches" ON public.pitches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

-- Batted balls
CREATE POLICY "Coaches can insert batted balls" ON public.batted_balls FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete batted balls" ON public.batted_balls FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

-- CSV uploads
CREATE POLICY "Coaches can view uploads" ON public.csv_uploads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can insert uploads" ON public.csv_uploads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete uploads" ON public.csv_uploads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));
