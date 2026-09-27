// Supabase Edge Function: create-account
// Creates a login (auth user) and its user_profiles row.
//   kind "player"  — council, or a coach of the athlete's team
//   kind "coach"   — council only (needs teamIds)
//   kind "council" — council only
// Deploy:  supabase functions deploy create-account
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is calling?
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Your session expired — sign in again." }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: me } = await admin.from("user_profiles").select("role, team_ids").eq("id", user.id).maybeSingle();
  if (!me) return json({ error: "Your account has no profile." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const kind = String(body.kind ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const playerId = body.playerId ? String(body.playerId) : null;
  const teamIds = Array.isArray(body.teamIds) ? (body.teamIds as unknown[]).map(String) : [];

  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid email." }, 400);
  if (password.length < 6) return json({ error: "The password must be at least 6 characters." }, 400);
  if (!["player", "coach", "council"].includes(kind)) return json({ error: "Unknown account type." }, 400);

  // Permission checks
  if (kind === "player") {
    if (!playerId) return json({ error: "Missing athlete." }, 400);
    const { data: pl } = await admin.from("players").select("id, team_id").eq("id", playerId).maybeSingle();
    if (!pl) return json({ error: "Athlete not found — save them first." }, 404);
    const ok = me.role === "council" || (me.role === "coach" && (me.team_ids ?? []).includes(pl.team_id));
    if (!ok) return json({ error: "You can only create logins for your own team." }, 403);
    const { data: taken } = await admin.from("user_profiles").select("id").eq("player_id", playerId).maybeSingle();
    if (taken) return json({ error: "This athlete already has a login." }, 409);
  } else if (me.role !== "council") {
    return json({ error: "Only the sports council can create staff logins." }, 403);
  }
  if (kind === "coach" && !teamIds.length) return json({ error: "Pick at least one team for the coach." }, 400);

  // Create the auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "Could not create the login.";
    return json({ error: /already/i.test(msg) ? "An account with this email already exists." : msg }, 400);
  }

  const { error: profErr } = await admin.from("user_profiles").insert({
    id: created.user.id, role: kind, display_name: name || null, email,
    player_id: kind === "player" ? playerId : null,
    team_ids: kind === "coach" ? teamIds : [],
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back
    return json({ error: profErr.message }, 400);
  }
  if (kind === "player" && playerId) {
    await admin.from("player_private").upsert({ player_id: playerId, email }, { onConflict: "player_id" });
  }
  return json({ ok: true, userId: created.user.id });
});
