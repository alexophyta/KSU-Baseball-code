-- Loosen the rule slightly so signup / account-reset can set player_id from NULL,
-- but still block users from re-pointing an already-linked profile at someone else.
CREATE OR REPLACE FUNCTION public.can_set_profile_player_id(_target_id uuid, _new_player_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_creator(auth.uid())
    OR (
      auth.uid() = _target_id
      AND (
        -- New value matches existing value → no change, allowed.
        COALESCE(_new_player_id, -1) = COALESCE(
          (SELECT player_id FROM public.profiles WHERE id = _target_id), -1
        )
        OR
        -- Existing value is NULL (initial linkage at signup / reset) → allowed.
        (SELECT player_id FROM public.profiles WHERE id = _target_id) IS NULL
      )
    )
$$;

-- Allow self-insert with any player_id again (signup edge cases). The UPDATE
-- policy combined with the helper still prevents post-link tampering.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK ((auth.uid() = id) OR public.is_creator(auth.uid()));