import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "creator" | "coach" | "user";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setPlayerId(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole((roleData?.role as AppRole) ?? "user");

      // Get linked player_id from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("player_id")
        .eq("id", user.id)
        .maybeSingle();

      setPlayerId(profileData?.player_id ?? null);
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isAdmin = role === "creator";
  const isCoach = role === "coach";
  const isPlayer = role === "user";
  const isStaff = isAdmin || isCoach;

  return { role, playerId, loading, isAdmin, isCoach, isPlayer, isStaff };
}
