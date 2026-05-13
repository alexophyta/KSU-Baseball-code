// Edge function: assign-role
// Assigns a role (creator/coach/user) to a user and optionally links a player_id
// to their profile. Uses the service-role key to bypass RLS, but only acts on
// the authenticated caller's own user_id (verified via the JWT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole = "creator" | "coach" | "user";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller via their JWT using the service-role client (works with
    // both legacy HS256 and new ES256 signing keys).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const role = body.role as AppRole | undefined;
    const playerId =
      typeof body.player_id === "number" ? body.player_id : null;

    if (!role || !["creator", "coach", "user"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow self-assignment at signup if no role exists yet.
    const { data: existing } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertErr) {
        return new Response(
          JSON.stringify({ error: insertErr.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Link player_id on profile if provided (service role bypasses RLS check)
    if (playerId !== null) {
      // Ensure profile row exists, then update player_id.
      await admin
        .from("profiles")
        .upsert(
          { id: userId, player_id: playerId },
          { onConflict: "id" },
        );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
