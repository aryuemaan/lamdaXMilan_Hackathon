import * as XLSX from "xlsx";
import { ATTENDED, SESSION_SLOTS, SLOT_LABEL, STATUS, SEASON_START } from "../config/app";
import { getSport, skillKeys, skillLabel, teamLabel } from "../config/sports";
import { prettyDate, sessionType, weekdayName } from "./dates";
import { computeStats } from "./stats";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function writeWorkbook(wb, filename) {
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
const safeName = (s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export function commentsText(comments) {
  if (!Array.isArray(comments) || !comments.length) return "";
  return comments.map((c) => (typeof c === "string" ? c : c && c.text)).filter(Boolean).join(" · ");
}

/* ---------- one slot: present players only ---------- */
export function slotPresentRows(teamSessions, date, slot, players) {
  const so = teamSessions && teamSessions[date] && teamSessions[date][slot];
  if (!so || so.noPractice) return [];
  return players.filter((p) => p.active && !p.graduated).map((p) => {
    const r = so.records[p.id];
    return r && ATTENDED.includes(r.status) ? { p, status: r.status, rating: r.rating || 0, teamRating: r.teamRating || 0, comments: r.comments || [] } : null;
  }).filter(Boolean).sort((a, b) => b.rating - a.rating || (a.p.jersey || 0) - (b.p.jersey || 0));
}
export function slotPendingPlayers(teamSessions, date, slot, players) {
  const so = teamSessions && teamSessions[date] && teamSessions[date][slot];
  if (so && so.noPractice) return [];
  const recs = so ? so.records : {};
  return players.filter((p) => p.active && !p.graduated && p.joinedDate <= date && !(recs[p.id] && recs[p.id].status)).map((p) => p.name);
}
export function slotUnratedAttendees(teamSessions, date, slot, players) {
  return slotPresentRows(teamSessions, date, slot, players).filter((r) => !(r.rating > 0) || !(r.teamRating > 0)).map((r) => r.p.name);
}
function presentAoa(team, date, slot, rows) {
  const sport = getSport(team.sport);
  const aoa = [
    [`IIT Hyderabad ${teamLabel(team)} — ${SLOT_LABEL[slot]} ${sessionType(date, sport)} (present players)`],
    [`${weekdayName(date)}, ${prettyDate(date)}`], [],
    ["#", "Athlete", "Jersey", "Role", "Status", "Coach rating (/5)", "Team coordination (/5)", "Comments"],
  ];
  rows.forEach((r, i) => aoa.push([i + 1, r.p.name, r.p.jersey ?? "", r.p.position, STATUS[r.status].label, r.rating, r.teamRating, commentsText(r.comments)]));
  const avg = (k) => (rows.length ? (rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(2) : "—");
  aoa.push([], ["Summary"], ["Present", rows.filter((r) => r.status === "present").length], ["Late", rows.filter((r) => r.status === "late").length],
    ["Total attended", rows.length], ["Average coach rating", avg("rating")], ["Average team coordination", avg("teamRating")]);
  return aoa;
}
export function exportSlot(team, teamSessions, date, slot, players, format = "xlsx") {
  const rows = slotPresentRows(teamSessions, date, slot, players);
  const ws = XLSX.utils.aoa_to_sheet(presentAoa(team, date, slot, rows));
  const name = `IITH-${safeName(teamLabel(team))}_${SLOT_LABEL[slot]}_${date}`;
  if (format === "csv") {
    downloadBlob(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: "text/csv;charset=utf-8;" }), `${name}.csv`);
  } else {
    ws["!cols"] = [{ wch: 4 }, { wch: 26 }, { wch: 8 }, { wch: 16 }, { wch: 11 }, { wch: 16 }, { wch: 20 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Present");
    writeWorkbook(wb, `${name}.xlsx`);
  }
  return rows.length;
}

/* ---------- a team's season ---------- */
function teamSheets(team, players, teamSessions) {
  const sport = getSport(team.sport);
  const tp = players.filter((p) => p.teamId === team.id);
  const summaryHeader = ["Athlete", "Jersey", "Role", "Overall", "Coach rating", "Team coord.", "Pre-season", "Match-day misses", "Attendance %", "Present", "Late", "Absent", "Left early", "Current streak"];
  const summary = tp.filter((p) => p.active && !p.graduated).map((p) => {
    const s = computeStats(p, teamSessions || {}, sport);
    return [p.name, p.jersey ?? "", p.position, s.overall, Number(s.avgRating.toFixed(2)), s.avgTeam ? Number(s.avgTeam.toFixed(2)) : "", p.preSeasonRating || 0,
      s.matchDayMisses, Math.round(s.attendancePct), s.counts.present, s.counts.late, s.counts.absent, s.counts.escape, s.currentStreak];
  }).sort((a, b) => b[3] - a[3]);

  const byId = Object.fromEntries(tp.map((p) => [p.id, p]));
  const recHeader = ["Date", "Session", "Weekday", "Type", "Athlete", "Jersey", "Role", "Status", "Coach rating", "Team coord.", "Comments"];
  const recs = [];
  Object.keys(teamSessions || {}).sort().forEach((d) => {
    for (const slot of SESSION_SLOTS) {
      const so = teamSessions[d][slot];
      if (!so) continue;
      if (so.noPractice) { recs.push([d, SLOT_LABEL[slot], weekdayName(d), "No practice", "", "", "", "NO PRACTICE", "", "", so.reason || ""]); continue; }
      for (const pid of Object.keys(so.records || {})) {
        const p = byId[pid]; const r = so.records[pid];
        if (!p || !r.status) continue;
        recs.push([d, SLOT_LABEL[slot], weekdayName(d), sessionType(d, sport), p.name, p.jersey ?? "", p.position, STATUS[r.status] ? STATUS[r.status].label : r.status,
          r.rating > 0 ? r.rating : "", r.teamRating > 0 ? r.teamRating : "", commentsText(r.comments)]);
      }
    }
  });

  const keys = skillKeys(sport);
  const profHeader = ["Athlete", "Jersey", "Role", "Gender", "Year", "Dept", "Age", "Pre-season", "Experience", "Played before", "Availability", ...keys.map((k) => skillLabel(sport, k)), "Health note", "Status"];
  const prof = tp.map((p) => [p.name, p.jersey ?? "", p.positionsRaw || p.position, p.gender, p.year, p.department, p.age || "", p.preSeasonRating || 0, p.experience,
    p.playedBefore ? "Yes" : "No", p.availability, ...keys.map((k) => (p.baseline || {})[k] || ""), p.health, p.graduated ? "Alumni" : p.active ? "Active" : "Inactive"]);

  return {
    summary: XLSX.utils.aoa_to_sheet([summaryHeader, ...summary]),
    records: XLSX.utils.aoa_to_sheet([recHeader, ...recs]),
    profiles: XLSX.utils.aoa_to_sheet([profHeader, ...prof]),
  };
}
export function exportTeamSeason(team, players, teamSessions) {
  const s = teamSheets(team, players, teamSessions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, s.summary, "Summary");
  XLSX.utils.book_append_sheet(wb, s.records, "All records");
  XLSX.utils.book_append_sheet(wb, s.profiles, "Sign-up profiles");
  writeWorkbook(wb, `IITH-${safeName(teamLabel(team))}_Season_from_${SEASON_START}.xlsx`);
}

/* ---------- whole contingent (council) ---------- */
export function exportContingent(teams, players, sessions, statsById, today) {
  const wb = XLSX.utils.book_new();
  const overview = [["Team", "Coach", "Squad", "Attendance %", "Avg coach rating", "Readiness"]];
  const athletes = [["Athlete", "Team", "Role", "Gender", "Dept", "Overall", "Coach rating", "Team coord.", "Attendance %", "Match-day misses"]];
  teams.forEach((t) => {
    const sport = getSport(t.sport);
    const tp = players.filter((p) => p.teamId === t.id && p.active && !p.graduated);
    const ss = tp.map((p) => statsById[p.id]).filter(Boolean);
    const marked = ss.reduce((a, s) => a + s.markedSessions, 0), att = ss.reduce((a, s) => a + s.attended, 0);
    const rated = ss.filter((s) => s.ratedCount);
    const n = Object.values(sport.formations)[0].reduce((a, g) => a + g.n, 0);
    const top = ss.map((s) => s.overall).sort((a, b) => b - a).slice(0, n);
    overview.push([teamLabel(t), t.coachName, tp.length, marked ? Math.round((att / marked) * 100) : "", rated.length ? Number((rated.reduce((a, s) => a + s.avgRating, 0) / rated.length).toFixed(2)) : "",
      top.length ? Math.round(top.reduce((a, b) => a + b, 0) / top.length) : ""]);
    tp.forEach((p) => { const s = statsById[p.id]; if (s) athletes.push([p.name, teamLabel(t), p.position, p.gender, p.department, s.overall, Number(s.avgRating.toFixed(2)), s.avgTeam ? Number(s.avgTeam.toFixed(2)) : "", Math.round(s.attendancePct), s.matchDayMisses]); });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), "Teams");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(athletes), "All athletes");
  teams.forEach((t) => {
    const s = teamSheets(t, players, sessions[t.id] || {});
    XLSX.utils.book_append_sheet(wb, s.records, getSport(t.sport).code + "-" + t.category.slice(0, 1) + " records");
  });
  writeWorkbook(wb, `IITH-InterIIT-Contingent_${today}.xlsx`);
}

/* ---------- import (Google Form / Excel sign-up sheet) ---------- */
export function readSheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsArrayBuffer(file);
  });
}
export function importTemplate(sport) {
  const keys = skillKeys(sport);
  const header = ["Name", "Jersey", "Position", "Gender (M/F)", "Year", "Department", "Age", "Pre-season rating", "Health note", "IITH email", "WhatsApp number", ...keys.map((k) => skillLabel(sport, k))];
  const example = ["Example Athlete", 7, sport.roles[0], "M", "B.Tech '25", "CSE", 19, 3, "", "cs25btech11001@iith.ac.in", "9876543210", ...keys.map(() => 3)];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, example]), "Athletes");
  writeWorkbook(wb, `IITH-${safeName(sport.name)}-import-template.xlsx`);
}
