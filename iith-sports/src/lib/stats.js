import {
  ATTENDED, STATUS, WEIGHTS, PRESEASON_PRIOR, MATCH_DAY_MISS_PENALTY, MATCH_DAY_MISS_PENALTY_CAP, SESSION_SLOTS,
} from "../config/app";
import { GENERAL_SKILLS, formationGroups, lineupSize, skillKeys, skillLabel } from "../config/sports";
import { isMatchDay, weekdayIdx, WD_NAMES } from "./dates";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const avg = (a) => (a.length ? sum(a) / a.length : 0);

/* ============================================================
   SESSION SHAPES
   teamSessions = { [date]: { date, morning: Slot, evening: Slot } }
   Slot = { records: { [playerId]: Record }, noPractice, reason }
   ============================================================ */
export const emptySlot = () => ({ records: {}, noPractice: false, reason: "" });
export const emptySession = (date) => ({ date, morning: emptySlot(), evening: emptySlot() });
export function ensureSession(teamSessions, date) {
  const s = teamSessions && teamSessions[date];
  if (!s) return emptySession(date);
  return { date, morning: s.morning || emptySlot(), evening: s.evening || emptySlot() };
}
export const emptyRecord = () => ({ status: null, rating: 0, teamRating: 0, comments: [] });

/* ============================================================
   PER-PLAYER STATS
   ============================================================ */
export function playerMarks(player, teamSessions) {
  const from = player.joinedDate || "0000-00-00";
  const dates = Object.keys(teamSessions || {}).filter((d) => d >= from).sort();
  const marks = [];
  for (const d of dates) {
    const sess = teamSessions[d];
    if (!sess) continue;
    for (const slot of SESSION_SLOTS) {
      const so = sess[slot];
      if (!so || so.noPractice) continue;
      const rec = so.records && so.records[player.id];
      if (rec && rec.status && STATUS[rec.status]) marks.push({ date: d, slot, ...rec });
    }
  }
  return marks;
}

export function countMatchDayMisses(marks, upToDate, sport) {
  return marks.filter((m) => (upToDate == null || m.date <= upToDate) && isMatchDay(m.date, sport) && (m.status === "absent" || m.status === "escape")).length;
}
export function matchDayPenaltyFromCount(n) { return Math.min(n * MATCH_DAY_MISS_PENALTY, MATCH_DAY_MISS_PENALTY_CAP); }

export function computeStats(player, teamSessions, sport) {
  const marks = playerMarks(player, teamSessions);
  const markedSessions = marks.length;
  const counts = { present: 0, late: 0, absent: 0, escape: 0 };
  marks.forEach((m) => { counts[m.status]++; });
  const attended = counts.present + counts.late;
  const matchesPlayed = marks.filter((m) => ATTENDED.includes(m.status) && isMatchDay(m.date, sport)).length;
  const attendancePct = markedSessions ? (attended / markedSessions) * 100 : 0;
  const punctualityPct = attended ? (counts.present / attended) * 100 : 0;
  const avgDiscipline = markedSessions ? sum(marks.map((m) => STATUS[m.status].points)) / markedSessions : 0;
  const attendanceScore = avgDiscipline * 100;

  const live = marks.filter((m) => ATTENDED.includes(m.status) && m.rating > 0).map((m) => m.rating);
  const team = marks.filter((m) => ATTENDED.includes(m.status) && m.teamRating > 0).map((m) => m.teamRating);
  const pre = Number(player.preSeasonRating || 0);
  const blendedRating = live.length ? (pre * PRESEASON_PRIOR + sum(live)) / (PRESEASON_PRIOR + live.length) : pre;
  const matchDayMisses = countMatchDayMisses(marks, null, sport);
  const matchDayPenalty = matchDayPenaltyFromCount(matchDayMisses);
  const avgRating = Math.max(0, blendedRating - matchDayPenalty);
  const avgTeam = avg(team);
  const recentForm = live.length ? sum(live.slice(-3)) / Math.min(3, live.length) : 0;

  let longestStreak = 0, run = 0;
  marks.forEach((m) => { run = ATTENDED.includes(m.status) ? run + 1 : 0; longestStreak = Math.max(longestStreak, run); });
  let currentStreak = 0;
  for (let i = marks.length - 1; i >= 0; i--) { if (ATTENDED.includes(marks[i].status)) currentStreak++; else break; }

  const ratingScore = (avgRating / 5) * 100;
  const teamScore = (avgTeam / 5) * 100;
  const overall = clamp(Math.round(WEIGHTS.rating * ratingScore + WEIGHTS.team * teamScore + WEIGHTS.att * attendanceScore), 0, 100);

  return {
    markedSessions, attended, matchesPlayed, attendancePct, punctualityPct, avgDiscipline, attendanceScore,
    avgRating, blendedRating, matchDayMisses, matchDayPenalty, avgTeam, recentForm, ratingScore, overall,
    ratedCount: live.length, currentStreak, longestStreak, counts, marks,
  };
}

/* Current and best rank within one team. */
export function computeRanks(players, teamSessions, sport) {
  const active = players.filter((p) => p.active && !p.graduated);
  const rankMap = (arr) => { const r = {}; arr.slice().sort((a, b) => b.o - a.o).forEach((x, i) => { r[x.id] = i + 1; }); return r; };
  const current = rankMap(active.map((p) => ({ id: p.id, o: computeStats(p, teamSessions, sport).overall })));
  const best = {};
  active.forEach((p) => { best[p.id] = current[p.id] || active.length; });
  const dates = Object.keys(teamSessions || {}).sort();
  let cum = {};
  for (const d of dates) {
    cum = { ...cum, [d]: teamSessions[d] };
    const r = rankMap(active.map((p) => ({ id: p.id, o: computeStats(p, cum, sport).overall })));
    active.forEach((p) => { if (r[p.id] && r[p.id] < best[p.id]) best[p.id] = r[p.id]; });
  }
  const out = {};
  active.forEach((p) => { out[p.id] = { current: current[p.id], best: Math.min(best[p.id], current[p.id]) }; });
  return out;
}

export function ratingTrend(player, stats, sport) {
  const pre = Number(player.preSeasonRating || 0);
  const rated = stats.marks.filter((m) => ATTENDED.includes(m.status) && m.rating > 0);
  return rated.map((m, i) => {
    const arr = rated.slice(0, i + 1).map((x) => x.rating);
    const blend = (pre * PRESEASON_PRIOR + sum(arr)) / (PRESEASON_PRIOR + arr.length);
    return { date: m.date, val: Math.max(0, blend - matchDayPenaltyFromCount(countMatchDayMisses(stats.marks, m.date, sport))) };
  });
}

export function ratingBeforeAfter(player, stats, sport) {
  const pts = ratingTrend(player, stats, sport);
  const pre = Number(player.preSeasonRating || 0);
  if (!pts.length) return { before: pre, after: pre, delta: 0, lastDate: null };
  const after = pts[pts.length - 1].val;
  const before = pts.length > 1 ? pts[pts.length - 2].val : pre;
  return { before, after, delta: after - before, lastDate: pts[pts.length - 1].date };
}

/* ============================================================
   TEAM-LEVEL
   ============================================================ */
export function sessionCell(teamSessions, date, slot, squadSize) {
  const so = teamSessions && teamSessions[date] && teamSessions[date][slot];
  if (!so) return { kind: "pend" };
  if (so.noPractice) return { kind: "np", reason: so.reason };
  const recs = Object.values(so.records || {}).filter((r) => r && r.status);
  if (!recs.length) return { kind: "pend" };
  const a = recs.filter((r) => ATTENDED.includes(r.status)).length;
  return { kind: "val", pct: Math.round((a / recs.length) * 100), n: recs.length, partial: squadSize ? recs.length < squadSize : false };
}

export function teamSummary(team, sport, teamPlayers, teamSessions, statsById, today) {
  const ps = teamPlayers.filter((p) => p.active && !p.graduated);
  const ss = ps.map((p) => statsById[p.id]).filter(Boolean);
  const marked = sum(ss.map((s) => s.markedSessions));
  const attended = sum(ss.map((s) => s.attended));
  const rated = ss.filter((s) => s.ratedCount);
  const top = ss.map((s) => s.overall).sort((a, b) => b - a).slice(0, lineupSize(sport));
  const mo = teamSessions && teamSessions[today] && teamSessions[today].morning;
  const eligible = ps.filter((p) => (p.joinedDate || "") <= today);
  const pendingToday = mo && mo.noPractice ? 0 : eligible.filter((p) => !(mo && mo.records[p.id] && mo.records[p.id].status)).length;
  return {
    squad: ps.length,
    attPct: marked ? Math.round((attended / marked) * 100) : null,
    avgRating: rated.length ? avg(rated.map((s) => s.avgRating)) : 0,
    readiness: top.length ? Math.round(avg(top)) : 0,
    pendingToday, morningStarted: !!(mo && Object.keys(mo.records || {}).length),
    health: ps.filter((p) => p.health).length,
    mdMiss: sum(ss.map((s) => s.matchDayMisses)),
    markedTotal: marked,
  };
}

/* ============================================================
   SELECTION
   ============================================================ */
export function selectionScore(stats) {
  const s = stats || {};
  return clamp((s.overall || 0) + Math.min((s.currentStreak || 0) * 0.5, 10), 0, 100);
}
export function roleFit(player, group, sport) {
  if (!group.roles) return 1;
  const keepers = sport.keeperRoles || [];
  if (keepers.length) {
    const slotKeeper = group.roles.some((r) => keepers.includes(r));
    const playerKeeper = keepers.includes(player.position);
    if (slotKeeper !== playerKeeper) return 0.35;
  }
  return group.roles.includes(player.position) ? 1.08 : 0.9;
}
export function playerFit(player, stats, group, sport) {
  return clamp(Math.round(selectionScore(stats) * roleFit(player, group, sport)), 0, 100);
}
export function lineupSlots(groups) {
  const slots = [];
  groups.forEach((g, gi) => { for (let i = 0; i < g.n; i++) slots.push({ id: `g${gi}_${i}`, groupIdx: gi, label: g.label, roles: g.roles, side: g.side || (gi < groups.length / 2 ? "att" : "def") }); });
  return slots;
}
export function autoPickSlots(sport, groups, players, statsById) {
  const pool = players.filter((p) => p.active && !p.graduated);
  const used = new Set();
  return lineupSlots(groups).map((slot) => {
    const free = pool.filter((p) => !used.has(p.id));
    const exact = free.filter((p) => !slot.roles || slot.roles.includes(p.position));
    const allowed = free.filter((p) => roleFit(p, slot, sport) > 0.35);
    const cands = exact.length ? exact : allowed.length ? allowed : free;
    let best = null, bestFit = -1;
    for (const p of cands) { const f = playerFit(p, statsById[p.id], slot, sport); if (f > bestFit) { bestFit = f; best = p; } }
    if (best) used.add(best.id);
    return { ...slot, playerId: best ? best.id : null, fit: best ? bestFit : 0, off: !!best && !exact.length };
  });
}
export function pickBench(sport, slots, players, statsById) {
  const used = new Set(slots.map((s) => s.playerId).filter(Boolean));
  const benchN = Math.max(0, sport.squad - slots.length);
  const bench = players.filter((p) => p.active && !p.graduated && !used.has(p.id))
    .map((p) => ({ p, score: Math.round(selectionScore(statsById[p.id])) }))
    .sort((a, b) => b.score - a.score).slice(0, benchN);
  return { bench, benchN };
}
export function autoPickLineup(sport, formationName, players, statsById) {
  const groups = formationGroups(sport, formationName);
  const slots = autoPickSlots(sport, groups, players, statsById);
  const { bench, benchN } = pickBench(sport, slots, players, statsById);
  return { groups, slots, bench, benchN };
}

/* ============================================================
   MATCH SIMULATOR (goal sports only)
   ============================================================ */
export function lineupStrength(slots, players, statsById, sport) {
  const per = [];
  let atk = [], def = [];
  for (const s of slots) {
    if (!s.playerId) continue;
    const p = players.find((x) => x.id === s.playerId);
    if (!p) continue;
    const fit = playerFit(p, statsById[p.id], s, sport);
    per.push({ player: p, slot: s, fit });
    (s.side === "def" ? def : atk).push(fit);
  }
  const overall = per.length ? Math.round(avg(per.map((x) => x.fit))) : 0;
  return { overall, attack: atk.length ? Math.round(avg(atk)) : overall, defense: def.length ? Math.round(avg(def)) : overall, per, count: per.length };
}
function poissonSample(lambda) {
  // Knuth for small lambda, normal approximation for large (water polo)
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussian()));
  const L = Math.exp(-lambda); let k = 0, prod = 1;
  do { k++; prod *= Math.random(); } while (prod > L);
  return k - 1;
}
function gaussian() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
export function simulateMatch(lineup, opp, base, iters = 10000) {
  const a = Math.max(20, lineup.attack), d = Math.max(20, lineup.defense);
  const oa = Math.max(20, opp.attack), od = Math.max(20, opp.defense);
  const lamA = base * (a / od), lamB = base * (oa / d);
  let w = 0, dr = 0, l = 0, gd = 0;
  for (let i = 0; i < iters; i++) {
    const ga = poissonSample(lamA), gb = poissonSample(lamB);
    gd += ga - gb;
    if (ga > gb) w++; else if (ga === gb) dr++; else l++;
  }
  return { winPct: Math.round((w / iters) * 100), drawPct: Math.round((dr / iters) * 100), lossPct: Math.round((l / iters) * 100), expGD: gd / iters, lamA, lamB };
}

/* ============================================================
   DAILY IMPROVEMENT SUGGESTIONS
   ============================================================ */
export function getDailySuggestions(player, sport, stats) {
  if (!player) return [];
  const lib = { fitness: GENERAL_SKILLS.fitness, communication: GENERAL_SKILLS.communication };
  sport.skills.forEach((s) => { lib[s.key] = s; });
  const b = player.baseline || {};
  const list = skillKeys(sport).map((k) => ({ k, v: Number(b[k] || 0) })).sort((x, y) => x.v - y.v);
  const out = [], seen = new Set();
  const focus = sport.roleFocus && sport.roleFocus[player.position];
  if (focus) { out.push({ ...focus, priority: "role", why: `Core work for a ${player.position}.` }); seen.add(focus.key); }
  for (const x of list) {
    if (out.length >= 3) break;
    if (x.v > 0 && x.v <= 3 && !seen.has(x.k) && lib[x.k]) { out.push({ ...lib[x.k], priority: "weakness", why: `You rated yourself ${x.v}/5 here.` }); seen.add(x.k); }
  }
  const s = stats || {};
  if (s.ratedCount && s.avgRating < 3 && !seen.has("communication") && out.length < 3) {
    out.push({ ...lib.communication, priority: "rating", why: `Coach rating is ${s.avgRating.toFixed(2)} — team play lifts it fastest.` });
    seen.add("communication");
  }
  for (const x of list) {
    if (out.length >= 2) break;
    if (!seen.has(x.k) && lib[x.k]) { out.push({ ...lib[x.k], priority: "focus", why: x.v ? `Currently ${x.v}/5.` : "Not self-rated yet." }); seen.add(x.k); }
  }
  return out.slice(0, 3);
}

/* ============================================================
   BADGES & FEED
   ============================================================ */
export function computeBadges(player, stats) {
  const s = stats || {};
  const c = s.counts || { present: 0, late: 0, absent: 0, escape: 0 };
  const misses = (c.absent || 0) + (c.escape || 0);
  const improved = (s.recentForm || 0) - (s.avgRating || 0);
  const b = player.baseline || {};
  const topSkill = Math.max(0, ...Object.values(b).map(Number).filter((x) => !isNaN(x)));
  return [
    { id: "ironman", mono: "IM", pts: 30, tone: "#1b1f2a", label: "Iron Man", desc: "10+ session attendance streak", earned: (s.longestStreak || 0) >= 10 },
    { id: "elite", mono: "EL", pts: 25, tone: "#e8521a", label: "Elite", desc: "Overall score 80+", earned: (s.overall || 0) >= 80 },
    { id: "perfect", mono: "PA", pts: 20, tone: "#1c7a4a", label: "Perfect Attendance", desc: "No absences all season (4+ sessions)", earned: (s.markedSessions || 0) >= 4 && misses === 0 },
    { id: "streak", mono: "SM", pts: 15, tone: "#b87d00", label: "Streak Master", desc: "5+ session streak", earned: (s.longestStreak || 0) >= 5 },
    { id: "team", mono: "TP", pts: 15, tone: "#117a8b", label: "Team Player", desc: "3+ five-star team-coordination marks", earned: (s.marks || []).filter((m) => m.teamRating === 5).length >= 3 },
    { id: "improved", mono: "MI", pts: 15, tone: "#2f5fb3", label: "Most Improved", desc: "Recent form up 1.0+ on season", earned: improved >= 1.0 },
    { id: "specialist", mono: "SP", pts: 10, tone: "#7a2320", label: "Specialist", desc: "Rated 5/5 in a sport skill", earned: topSkill >= 5 },
    { id: "ontime", mono: "OT", pts: 10, tone: "#8a5a00", label: "Always On Time", desc: "5+ present marks, no lates", earned: (c.present || 0) >= 5 && (c.late || 0) === 0 },
  ];
}
export const earnedBadges = (p, s) => computeBadges(p, s).filter((b) => b.earned);
export const badgePoints = (p, s) => sum(earnedBadges(p, s).map((b) => b.pts));

export function buildFeed(players, statsById, sport, seasonStart) {
  const events = [];
  for (const p of players) {
    if (!p.active || p.graduated) continue;
    const s = statsById[p.id];
    if (!s) continue;
    const last = s.marks[s.marks.length - 1];
    const rb = ratingBeforeAfter(p, s, sport);
    if (rb.lastDate && Math.abs(rb.delta) >= 0.15) {
      const up = rb.delta > 0;
      events.push({ date: rb.lastDate, kind: "rating", up, tone: up ? "#1c7a4a" : "#c23b30", text: `${p.name}'s coach rating ${up ? "rose" : "dipped"} from ${rb.before.toFixed(2)} to ${rb.after.toFixed(2)}.` });
    }
    if (s.matchDayMisses > 0) {
      const lastMiss = [...s.marks].reverse().find((m) => isMatchDay(m.date, sport) && (m.status === "absent" || m.status === "escape"));
      events.push({ date: lastMiss ? lastMiss.date : seasonStart, kind: "matchmiss", mono: "MM", tone: "#7a2320", text: `${p.name} has missed ${s.matchDayMisses} match-day session${s.matchDayMisses > 1 ? "s" : ""} — coach rating penalty −${s.matchDayPenalty.toFixed(2)}.` });
    }
    if (s.currentStreak >= 3) events.push({ date: last ? last.date : seasonStart, kind: "streak", mono: "ST", tone: "#b87d00", text: `${p.name} is on a ${s.currentStreak}-session attendance streak.` });
    for (const bd of earnedBadges(p, s)) events.push({ date: last ? last.date : seasonStart, kind: "badge", mono: bd.mono, tone: bd.tone, text: `${p.name} holds the “${bd.label}” badge — ${bd.desc}.` });
  }
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return events.slice(0, 40);
}

/* ============================================================
   TEAM ANALYTICS
   ============================================================ */
export function weekdayAttendance(teamSessions) {
  const present = [0, 0, 0, 0, 0, 0, 0], total = [0, 0, 0, 0, 0, 0, 0];
  for (const d in teamSessions || {}) {
    const wd = weekdayIdx(d);
    for (const slot of SESSION_SLOTS) {
      const s = teamSessions[d][slot];
      if (!s || s.noPractice) continue;
      for (const pid in s.records) { const st = s.records[pid].status; if (!st) continue; total[wd]++; if (ATTENDED.includes(st)) present[wd]++; }
    }
  }
  return WD_NAMES.map((name, i) => ({ name, pct: total[i] ? Math.round((present[i] / total[i]) * 100) : 0, total: total[i] }));
}
export function ratingDistribution(players, statsById) {
  const buckets = [0, 0, 0, 0, 0];
  players.forEach((p) => { if (!p.active || p.graduated) return; const o = (statsById[p.id] || {}).overall || 0; buckets[Math.min(4, Math.floor(o / 20))]++; });
  return buckets;
}
export function roleBalance(players, sport) {
  const m = {}; sport.roles.forEach((r) => { m[r] = 0; });
  players.forEach((p) => { if (p.active && !p.graduated) m[p.position] = (m[p.position] || 0) + 1; });
  return m;
}
export function weakestSkillCounts(players, sport) {
  const m = {};
  players.forEach((p) => {
    if (!p.active || p.graduated || !p.baseline) return;
    const keys = skillKeys(sport).filter((k) => Number(p.baseline[k]) > 0);
    if (!keys.length) return;
    const k = keys.sort((a, b) => p.baseline[a] - p.baseline[b])[0];
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).map(([k, n]) => ({ key: k, label: skillLabel(sport, k), n })).sort((a, b) => b.n - a.n);
}
export function topPairs(players, teamSessions) {
  const active = players.filter((p) => p.active && !p.graduated);
  const pairs = [];
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const a = active[i], b = active[j]; let together = 0, total = 0;
    for (const d in teamSessions || {}) for (const slot of SESSION_SLOTS) {
      const s = teamSessions[d][slot];
      if (!s || s.noPractice) continue;
      const ra = s.records[a.id], rb = s.records[b.id];
      if (ra && rb && ATTENDED.includes(ra.status) && ATTENDED.includes(rb.status)) { together++; total += ((ra.teamRating || 0) + (rb.teamRating || 0)) / 2; }
    }
    if (together >= 2) pairs.push({ a, b, together, avgTeam: total / together });
  }
  pairs.sort((x, y) => y.avgTeam - x.avgTeam || y.together - x.together);
  return pairs.slice(0, 5);
}
export function baselineAvg(p, sport) {
  const b = p.baseline || {};
  const vals = sport.skills.map((s) => Number(b[s.key] || 0)).filter((x) => x > 0);
  return avg(vals);
}
