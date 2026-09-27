import { supabase } from "../supabaseClient";
import { NOPRACTICE_ID, SEASON_START, SESSION_SLOTS } from "../config/app";
import { emptySession, emptySlot } from "./stats";

/* ============================================================
   HELPERS
   ============================================================ */
export function safeJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

// Supabase returns at most 1000 rows per request — page through everything.
async function fetchAllRows(build, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

export function newId(prefix = "p") { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

/* ============================================================
   MAPPERS
   ============================================================ */
export function dbTeamToApp(r) {
  return { id: r.id, sport: r.sport, category: r.category, coachName: r.coach_name || "", venue: r.venue || "", active: r.active !== false, sortOrder: r.sort_order ?? 100 };
}
export function appTeamToDb(t) {
  return { id: t.id, sport: t.sport, category: t.category, coach_name: t.coachName || null, venue: t.venue || null, active: t.active !== false, sort_order: t.sortOrder ?? 100 };
}
export function dbPlayerToApp(r) {
  return {
    id: r.id, teamId: r.team_id, name: r.name || "", jersey: r.jersey ?? null,
    position: r.position || "", positionsRaw: r.positions_raw || r.position || "", gender: r.gender || "",
    year: r.year || "", department: r.department || "", age: r.age ?? null,
    playedBefore: !!r.played_before, experience: r.experience || "", availability: r.availability || "", health: r.health || "",
    preSeasonRating: Number(r.pre_rating || 0), baseline: safeJson(r.baseline, {}) || {},
    active: r.active !== false, joinedDate: r.joined_date || SEASON_START,
    graduated: !!r.graduated, graduatedAt: r.graduated_at || null,
  };
}
export function appPlayerToDb(p) {
  return {
    id: p.id, team_id: p.teamId, name: p.name, jersey: p.jersey === "" || p.jersey == null ? null : Number(p.jersey),
    position: p.position || null, positions_raw: p.positionsRaw || p.position || null, gender: p.gender || null,
    year: p.year || null, department: p.department || null, age: p.age === "" || p.age == null ? null : Number(p.age),
    played_before: !!p.playedBefore, experience: p.experience || null, availability: p.availability || null, health: p.health || null,
    pre_rating: Number(p.preSeasonRating || 0), baseline: p.baseline || {},
    active: p.active !== false, joined_date: p.joinedDate || SEASON_START,
    graduated: !!p.graduated, graduated_at: p.graduatedAt || null,
  };
}

/* sessions rows → { [teamId]: { [date]: Session } } */
export function dbSessionsToApp(rows) {
  const out = {};
  for (const row of rows || []) {
    const { team_id: team, session_date: date } = row;
    if (!team || !date) continue;
    const slot = row.slot === "evening" ? "evening" : "morning";
    out[team] = out[team] || {};
    out[team][date] = out[team][date] || emptySession(date);
    const so = out[team][date][slot] || (out[team][date][slot] = emptySlot());
    if (row.player_id === NOPRACTICE_ID) {
      so.noPractice = true;
      so.reason = (safeJson(row.comments, {}) || {}).reason || "";
      continue;
    }
    so.records[row.player_id] = {
      status: row.status || null,
      rating: Number(row.coach_rating || 0),
      teamRating: Number(row.team_rating || 0),
      comments: safeJson(row.comments, []) || [],
    };
  }
  return out;
}
export function recordToRow(teamId, date, slot, playerId, rec) {
  return { team_id: teamId, session_date: date, slot, player_id: playerId, status: rec.status, coach_rating: Number(rec.rating || 0), team_rating: Number(rec.teamRating || 0), comments: rec.comments || [] };
}
export function noPracticeRow(teamId, date, slot, reason) {
  return { team_id: teamId, session_date: date, slot, player_id: NOPRACTICE_ID, status: "no_practice", coach_rating: 0, team_rating: 0, comments: { reason: reason || "" } };
}

/* Compare a slot before/after an edit and return the DB operations. */
export function diffSlot(teamId, date, slot, prev, next) {
  const ops = [];
  const a = (prev && prev.records) || {}, b = (next && next.records) || {};
  const key = (pid) => `${teamId}|${date}|${slot}|${pid}`;
  const match = (pid) => ({ team_id: teamId, session_date: date, slot, player_id: pid });
  for (const pid of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const ra = a[pid], rb = b[pid];
    if (rb && rb.status) {
      if (!ra || JSON.stringify(ra) !== JSON.stringify(rb)) ops.push({ key: key(pid), row: recordToRow(teamId, date, slot, pid, rb) });
    } else if (ra && ra.status) ops.push({ key: key(pid), row: null, match: match(pid) });
  }
  const pNP = !!(prev && prev.noPractice), nNP = !!(next && next.noPractice);
  if (nNP && (!pNP || (prev.reason || "") !== (next.reason || ""))) ops.push({ key: key(NOPRACTICE_ID), row: noPracticeRow(teamId, date, slot, next.reason) });
  else if (!nNP && pNP) ops.push({ key: key(NOPRACTICE_ID), row: null, match: match(NOPRACTICE_ID) });
  return ops;
}

/* ============================================================
   LOAD
   ============================================================ */
export async function loadSessions(teamIds) {
  // teamIds: null = every team, [] = none
  if (teamIds && !teamIds.length) return {};
  const rows = await fetchAllRows(() => {
    let q = supabase.from("sessions").select("team_id,session_date,slot,player_id,status,coach_rating,team_rating,comments")
      .gte("session_date", SEASON_START).order("session_date").order("id");
    if (teamIds) q = q.in("team_id", teamIds);
    return q;
  });
  return dbSessionsToApp(rows);
}
export async function loadAll({ sessionTeamIds }) {
  const [teamRows, playerRows, sessions] = await Promise.all([
    fetchAllRows(() => supabase.from("teams").select("*").order("sort_order", { ascending: true }).order("id")),
    fetchAllRows(() => supabase.from("players").select("*").order("team_id").order("jersey", { ascending: true, nullsFirst: false })),
    loadSessions(sessionTeamIds),
  ]);
  return { teams: teamRows.map(dbTeamToApp), players: playerRows.map(dbPlayerToApp), sessions };
}

/* ============================================================
   WRITE
   ============================================================ */
export async function applySessionOps(ops) {
  const upserts = ops.filter((o) => o.row).map((o) => o.row);
  const deletes = ops.filter((o) => !o.row);
  if (upserts.length) {
    const { error } = await supabase.from("sessions").upsert(upserts, { onConflict: "team_id,session_date,slot,player_id" });
    if (error) throw error;
  }
  for (const d of deletes) {
    const { error } = await supabase.from("sessions").delete().match(d.match);
    if (error) throw error;
  }
}
export async function deleteSessionDate(teamId, date) {
  const { error } = await supabase.from("sessions").delete().eq("team_id", teamId).eq("session_date", date);
  if (error) throw error;
}
export async function deleteTeamSessions(teamId) {
  const { error } = await supabase.from("sessions").delete().eq("team_id", teamId);
  if (error) throw error;
}
export async function upsertPlayers(players) {
  if (!players.length) return;
  const { error } = await supabase.from("players").upsert(players.map(appPlayerToDb), { onConflict: "id" });
  if (error) throw error;
}
export async function savePlayerPrivate(playerId, { phone, email }) {
  const row = { player_id: playerId };
  if (phone !== undefined) row.phone = phone || null;
  if (email !== undefined) row.email = email || null;
  const { error } = await supabase.from("player_private").upsert(row, { onConflict: "player_id" });
  if (error) throw error;
}
export async function fetchPlayerPrivate(playerId) {
  const { data, error } = await supabase.from("player_private").select("*").eq("player_id", playerId).maybeSingle();
  if (error) throw error;
  return data || {};
}
export async function upsertTeam(team) {
  const { error } = await supabase.from("teams").upsert(appTeamToDb(team), { onConflict: "id" });
  if (error) throw error;
}

/* ============================================================
   TEAMMATE RATINGS
   ============================================================ */
export async function fetchMyTeammateRatings(date, raterId) {
  const { data, error } = await supabase.from("teammate_ratings").select("rated_player_id,rating").eq("session_date", date).eq("rater_player_id", raterId);
  if (error) throw error;
  return data || [];
}
export async function submitTeammateRatings(teamId, date, raterId, ratings) {
  const rows = ratings.map((r) => ({ team_id: teamId, session_date: date, rater_player_id: raterId, rated_player_id: r.playerId, rating: r.rating }));
  const { error } = await supabase.from("teammate_ratings").insert(rows);
  if (error) throw error;
}
export async function fetchTeammateSummary(playerId) {
  const { data, error } = await supabase.rpc("teammate_rating_summary", { p_player: playerId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { avg: row && row.avg_rating != null ? Number(row.avg_rating) : null, count: row ? Number(row.rating_count || 0) : 0 };
}

/* ============================================================
   ACCOUNTS (edge function: supabase/functions/create-account)
   ============================================================ */
export async function createAccount(payload) {
  const { data, error } = await supabase.functions.invoke("create-account", { body: payload });
  if (error) {
    let msg = error.message || "Could not create the login.";
    try { const body = await error.context.json(); if (body && body.error) msg = body.error; } catch (e) { /* ignore */ }
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}
export async function listProfiles() {
  const { data, error } = await supabase.from("user_profiles").select("id,role,display_name,player_id,team_ids,email,created_at").order("role").order("display_name");
  if (error) throw error;
  return data || [];
}
export async function updateProfileTeams(id, teamIds) {
  const { error } = await supabase.from("user_profiles").update({ team_ids: teamIds }).eq("id", id);
  if (error) throw error;
}
export { SESSION_SLOTS };
