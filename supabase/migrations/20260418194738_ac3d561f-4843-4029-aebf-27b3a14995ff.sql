-- Prevent regular users from changing their own player_id (which would let them
-- claim another player's stats). Only creators can change player_id linkage.
-- Strategy: split the existing UPDATE policy so users may update non-link fields,
-- but any change to player_id is gated through a helper function that compares
-- the new value against the existing value.

-- 1. Helper that returns true if the supplied player_id equals the caller's
--    currently-stored player_id (or the caller is a creator).
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
      AND COALESCE(_new_player_id, -1) = COALESCE(
        (SELECT player_id FROM public.profiles WHERE id = _target_id), -1
      )
    )
$$;

-- 2. Replace the broad "Users can update their own profile" policy with one
--    that additionally requires player_id to be unchanged (unless caller is creator).
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING ((auth.uid() = id) OR public.is_creator(auth.uid()))
WITH CHECK (
  ((auth.uid() = id) OR public.is_creator(auth.uid()))
  AND public.can_set_profile_player_id(id, player_id)
);

-- 3. Same restriction for INSERT: a brand-new self-insert must have NULL player_id
--    (linkage is performed separately by signup flow / admin). Creators bypass.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  (auth.uid() = id AND player_id IS NULL)
  OR public.is_creator(auth.uid())
);