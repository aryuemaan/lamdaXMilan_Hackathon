import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSport } from "../config/sports";
import { todayInSeason } from "../lib/dates";
import { computeRanks, computeStats, ensureSession } from "../lib/stats";
import { cacheGet, cacheSet } from "../lib/storage";
import * as db from "../lib/db";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const DEFAULT_VIEW = { council: "board", coach: "attendance", player: "home" };

export function AppProvider({ user, profile, children }) {
  const role = profile.role;
  const cacheKey = `iith-sports-cache-${user.id}`;

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState({ status: "syncing", msg: "", last: 0 });
  const [toast, setToast] = useState("");

  const [activeTeamId, setActiveTeamId] = useState(null);
  const [view, setViewRaw] = useState(DEFAULT_VIEW[role] || "home");
  const [selectedDate, setSelectedDate] = useState(todayInSeason());
  const [profileId, setProfileId] = useState(null);
  const [backView, setBackView] = useState(null);
  const [compareSeed, setCompareSeed] = useState(null);

  const dataRef = useRef({ teams: [], players: [], sessions: {} });
  const pendingRef = useRef(new Map());
  const flushTimer = useRef(null);
  const toastTimer = useRef(null);

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const setView = useCallback((v) => { setViewRaw(v); window.scrollTo(0, 0); }, []);

  /* ---------- who can see / edit what ---------- */
  const myPlayer = useMemo(() => players.find((p) => p.id === profile.player_id) || null, [players, profile.player_id]);
  const accessibleTeams = useMemo(() => {
    const list = teams.filter((t) => t.active || role === "council");
    if (role === "council") return list;
    if (role === "coach") return list.filter((t) => (profile.team_ids || []).includes(t.id));
    return myPlayer ? list.filter((t) => t.id === myPlayer.teamId) : [];
  }, [teams, role, profile.team_ids, myPlayer]);
  const canEditTeam = useCallback((teamId) => role === "council" || (role === "coach" && (profile.team_ids || []).includes(teamId)), [role, profile.team_ids]);

  /* ---------- load ---------- */
  const commit = useCallback((next) => {
    dataRef.current = { ...dataRef.current, ...next };
    if (next.teams) setTeams(next.teams);
    if (next.players) setPlayers(next.players);
    if (next.sessions) setSessions(next.sessions);
    cacheSet(cacheKey, dataRef.current);
  }, [cacheKey]);

  const load = useCallback(async (quiet) => {
    setSync((s) => ({ ...s, status: "syncing" }));
    try {
      const sessionTeamIds = role === "council" ? null : role === "coach" ? (profile.team_ids || []) : undefined;
      let data;
      if (role === "player") {
        // Players: load teams + players first, then only their own team's sessions.
        const base = await db.loadAll({ sessionTeamIds: [] });
        const me = base.players.find((p) => p.id === profile.player_id);
        data = { ...base, sessions: me ? await db.loadSessions([me.teamId]) : {} };
      } else {
        data = await db.loadAll({ sessionTeamIds });
      }
      commit(data);
      setSync({ status: "synced", msg: "", last: Date.now() });
      if (quiet === false) flash("Latest data loaded");
    } catch (e) {
      console.error(e);
      const cached = cacheGet(cacheKey);
      if (cached && cached.players && !dataRef.current.players.length) commit(cached);
      setSync({ status: "error", msg: e.message || "Could not reach the database", last: 0 });
    } finally { setLoading(false); }
  }, [role, profile.team_ids, profile.player_id, commit, cacheKey, flash]);

  useEffect(() => { load(); }, [load]);

  // Pick a sensible active team once data arrives.
  useEffect(() => {
    if (activeTeamId && accessibleTeams.some((t) => t.id === activeTeamId)) return;
    if (accessibleTeams.length) setActiveTeamId(accessibleTeams[0].id);
  }, [accessibleTeams, activeTeamId]);

  /* ---------- session sync queue ---------- */
  const flush = useCallback(async () => {
    clearTimeout(flushTimer.current);
    const pending = pendingRef.current;
    if (!pending.size) return;
    const ops = [...pending.values()];
    pendingRef.current = new Map();
    setSync((s) => ({ ...s, status: "syncing" }));
    try {
      await db.applySessionOps(ops);
      setSync({ status: pendingRef.current.size ? "syncing" : "synced", msg: "", last: Date.now() });
    } catch (e) {
      console.error(e);
      // put failed ops back unless a newer edit replaced them
      ops.forEach((o) => { if (!pendingRef.current.has(o.key)) pendingRef.current.set(o.key, o); });
      setSync({ status: "error", msg: e.message || "Save failed — will retry", last: 0 });
      flushTimer.current = setTimeout(flush, 5000);
    }
  }, []);
  const queueOps = useCallback((ops) => {
    if (!ops.length) return;
    ops.forEach((o) => pendingRef.current.set(o.key, o));
    setSync((s) => ({ ...s, status: "syncing" }));
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 500);
  }, [flush]);
  useEffect(() => {
    const warn = (e) => { if (pendingRef.current.size) { flush(); e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  /* ---------- actions ---------- */
  const updateSlot = useCallback((teamId, date, slot, updater) => {
    if (!canEditTeam(teamId)) return;
    const cur = dataRef.current.sessions;
    const teamS = cur[teamId] || {};
    const sess = ensureSession(teamS, date);
    const prevSlot = sess[slot];
    const nextSlot = updater(prevSlot);
    commit({ sessions: { ...cur, [teamId]: { ...teamS, [date]: { ...sess, [slot]: nextSlot } } } });
    queueOps(db.diffSlot(teamId, date, slot, prevSlot, nextSlot));
  }, [canEditTeam, commit, queueOps]);

  const deleteDate = useCallback(async (teamId, date) => {
    const cur = dataRef.current.sessions;
    const teamS = { ...(cur[teamId] || {}) };
    delete teamS[date];
    commit({ sessions: { ...cur, [teamId]: teamS } });
    for (const k of [...pendingRef.current.keys()]) if (k.startsWith(`${teamId}|${date}|`)) pendingRef.current.delete(k);
    try { await db.deleteSessionDate(teamId, date); flash("Session deleted"); }
    catch (e) { setSync({ status: "error", msg: e.message, last: 0 }); flash("Could not delete — check your connection"); }
  }, [commit, flash]);

  const resetTeamSessions = useCallback(async (teamId) => {
    const cur = dataRef.current.sessions;
    commit({ sessions: { ...cur, [teamId]: {} } });
    for (const k of [...pendingRef.current.keys()]) if (k.startsWith(`${teamId}|`)) pendingRef.current.delete(k);
    try { await db.deleteTeamSessions(teamId); flash("All sessions for this team deleted"); }
    catch (e) { setSync({ status: "error", msg: e.message, last: 0 }); flash("Reset failed"); }
  }, [commit, flash]);

  const savePlayers = useCallback(async (list, { quiet } = {}) => {
    const byId = new Map(dataRef.current.players.map((p) => [p.id, p]));
    list.forEach((p) => byId.set(p.id, p));
    commit({ players: [...byId.values()] });
    setSync((s) => ({ ...s, status: "syncing" }));
    try {
      await db.upsertPlayers(list);
      setSync({ status: "synced", msg: "", last: Date.now() });
      if (!quiet) flash(list.length > 1 ? `${list.length} athletes saved` : "Saved");
      return true;
    } catch (e) {
      setSync({ status: "error", msg: e.message, last: 0 });
      flash(`Not saved: ${e.message}`);
      return false;
    }
  }, [commit, flash]);

  const createPlayerLogin = useCallback(async ({ playerId, name, email, phone }) => {
    try {
      await db.savePlayerPrivate(playerId, { phone, email });
      await db.createAccount({ kind: "player", playerId, name, email: email.trim(), password: String(phone).replace(/\D/g, "") });
      flash(`Login created for ${name}`);
      return true;
    } catch (e) {
      flash(`Athlete saved, but login not created: ${e.message}`);
      return false;
    }
  }, [flash]);

  const setGraduated = useCallback((id, val) => {
    const p = dataRef.current.players.find((x) => x.id === id);
    if (!p) return;
    savePlayers([{ ...p, graduated: val, graduatedAt: val ? new Date().toISOString() : null }], { quiet: true });
    flash(val ? "Moved to Alumni" : "Restored to roster");
  }, [savePlayers, flash]);

  const saveTeam = useCallback(async (team) => {
    const list = dataRef.current.teams.filter((t) => t.id !== team.id).concat(team).sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.id.localeCompare(b.id));
    commit({ teams: list });
    try { await db.upsertTeam(team); flash("Team saved"); return true; }
    catch (e) { setSync({ status: "error", msg: e.message, last: 0 }); flash(`Team not saved: ${e.message}`); return false; }
  }, [commit, flash]);

  const refresh = useCallback(async () => { await flush(); await load(false); }, [flush, load]);

  /* ---------- derived ---------- */
  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const statsById = useMemo(() => {
    const m = {};
    for (const p of players) m[p.id] = computeStats(p, sessions[p.teamId] || {}, getSport((teamById[p.teamId] || {}).sport));
    return m;
  }, [players, sessions, teamById]);

  const activeTeam = teamById[activeTeamId] || null;
  const sport = getSport(activeTeam && activeTeam.sport);
  const teamPlayers = useMemo(() => players.filter((p) => p.teamId === activeTeamId), [players, activeTeamId]);
  const rosterPlayers = useMemo(() => teamPlayers.filter((p) => p.active && !p.graduated), [teamPlayers]);
  const teamSessions = sessions[activeTeamId] || {};
  const rankById = useMemo(() => (activeTeam ? computeRanks(teamPlayers, teamSessions, sport) : {}), [activeTeam, teamPlayers, teamSessions, sport]);

  const openProfile = useCallback((id) => {
    const p = dataRef.current.players.find((x) => x.id === id);
    if (p && p.teamId !== activeTeamId) setActiveTeamId(p.teamId);
    setBackView(view); setProfileId(id); setView("profile");
  }, [view, activeTeamId, setView]);
  const openTeam = useCallback((teamId, date, slot) => {
    setActiveTeamId(teamId);
    if (date) setSelectedDate(date);
    setView("attendance");
    if (slot) setTimeout(() => window.dispatchEvent(new CustomEvent("iith:slot", { detail: slot })), 0);
  }, [setView]);
  const startCompare = useCallback((id) => { setCompareSeed(id); setView("compare"); }, [setView]);
  const goBack = useCallback(() => setView(backView && backView !== "profile" ? backView : DEFAULT_VIEW[role]), [backView, role, setView]);

  const value = {
    user, profile, role, loading, sync, toast, flash,
    teams, players, sessions, teamById, statsById, accessibleTeams, canEditTeam, myPlayer,
    activeTeamId, setActiveTeamId, activeTeam, sport, teamPlayers, rosterPlayers, teamSessions, rankById,
    view, setView, selectedDate, setSelectedDate, profileId, openProfile, goBack, openTeam, compareSeed, startCompare,
    updateSlot, deleteDate, resetTeamSessions, savePlayers, createPlayerLogin, setGraduated, saveTeam, refresh, flush,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
