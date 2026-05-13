CREATE POLICY "Anyone can view players for signup"
ON public.players
FOR SELECT
TO anon
USING (true);