import { SEASON_START, SEASON_END, DEFAULT_MATCH_DAYS } from "../config/app";

export function parseDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function toKey(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
export function addDays(s, n) { const dt = parseDate(s); dt.setDate(dt.getDate() + n); return toKey(dt); }
export function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
export function datesBetween(a, b) { const out = []; let d = a; while (d <= b) { out.push(d); d = addDays(d, 1); } return out; }

export const WD_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function weekdayIdx(s) { return parseDate(s).getDay(); }
export function weekdayName(s) { return WD_NAMES[weekdayIdx(s)]; }
export function isMatchDay(s, sport) {
  const days = (sport && sport.matchDays) || DEFAULT_MATCH_DAYS;
  return days.includes(weekdayIdx(s));
}
export function sessionType(s, sport) { return isMatchDay(s, sport) ? "Match day" : "Practice"; }

export function todayKey() { return toKey(new Date()); }
export function clampToSeason(s) { if (s < SEASON_START) return SEASON_START; if (s > SEASON_END) return SEASON_END; return s; }
export function todayInSeason() { return clampToSeason(todayKey()); }
export function prettyDate(s, withYear = true) {
  return parseDate(s).toLocaleDateString("en-IN", withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}
export function nowTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
// Monday of the week containing `s`
export function weekStart(s) { const w = weekdayIdx(s); return addDays(s, w === 0 ? -6 : 1 - w); }
