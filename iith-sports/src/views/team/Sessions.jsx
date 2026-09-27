import React, { useState } from "react";
import { useApp } from "../../state/AppProvider";
import { SEASON_END, SEASON_START, SESSION_SLOTS } from "../../config/app";
import { clampToSeason, prettyDate, todayInSeason, weekdayName } from "../../lib/dates";
import TeamHeader from "../../components/TeamHeader";
import { Confirm, Empty, TypeBadge } from "../../components/ui";

export default function Sessions() {
  const { activeTeamId, sport, teamSessions, setSelectedDate, setView, deleteDate, canEditTeam } = useApp();
  const [newDate, setNewDate] = useState(todayInSeason());
  const [confirm, setConfirm] = useState(null);
  const canEdit = canEditTeam(activeTeamId);

  const list = Object.keys(teamSessions).sort((a, b) => (a < b ? 1 : -1)).map((d) => {
    const summary = {};
    SESSION_SLOTS.forEach((sl) => {
      const so = teamSessions[d][sl];
      const c = { present: 0, late: 0, absent: 0, escape: 0 };
      Object.values((so && so.records) || {}).forEach((r) => { if (c[r.status] != null) c[r.status]++; });
      summary[sl] = { np: !!(so && so.noPractice), reason: so && so.reason, marked: Object.values((so && so.records) || {}).filter((r) => r.status).length, ...c };
    });
    return { date: d, summary };
  }).filter((r) => r.summary.morning.marked || r.summary.evening.marked || r.summary.morning.np || r.summary.evening.np);

  const open = (d) => { setSelectedDate(clampToSeason(d)); setView("attendance"); };
  const cell = (s) => (s.np ? <span className="chip violet" title={s.reason}>No practice</span> : s.marked ? <span><span className="good">{s.present}</span> / <span className="warnc">{s.late}</span> / <span className="bad">{s.absent + s.escape}</span></span> : <span className="muted">—</span>);

  return (
    <div className="stack">
      <TeamHeader />
      <section className="panel row between wrap">
        <label className="lbl">Open or start a session
          <input type="date" className="field" value={newDate} min={SEASON_START} max={SEASON_END} onChange={(e) => e.target.value && setNewDate(clampToSeason(e.target.value))} />
          <span className="muted small">{weekdayName(newDate)} · <TypeBadge date={newDate} sport={sport} /></span>
        </label>
        <button className="btn primary" onClick={() => open(newDate)}>{teamSessions[newDate] ? "Open session" : "Start session"}</button>
      </section>
      {list.length === 0 ? <Empty title="No sessions recorded yet" hint="Start one above to begin marking attendance." /> : (
        <div className="tw">
          <table className="t">
            <thead><tr><th>Date</th><th>Type</th><th className="r">Morning marked</th><th className="r">Morning P / L / A</th><th className="r">Evening marked</th><th className="r">Evening P / L / A</th><th /></tr></thead>
            <tbody>
              {list.map(({ date, summary: { morning: am, evening: pm } }) => (
                <tr key={date}>
                  <td><button className="link" onClick={() => open(date)}>{prettyDate(date)}</button><div className="muted small">{weekdayName(date)}</div></td>
                  <td><TypeBadge date={date} sport={sport} /></td>
                  <td className="r">{am.np ? "—" : am.marked}</td><td className="r">{cell(am)}</td>
                  <td className="r">{pm.np ? "—" : pm.marked}</td><td className="r">{cell(pm)}</td>
                  <td className="r">{canEdit && (confirm === date
                    ? <Confirm text="Delete both sessions?" confirmLabel="Delete" onConfirm={() => { deleteDate(activeTeamId, date); setConfirm(null); }} onCancel={() => setConfirm(null)} />
                    : <button className="btn sm" onClick={() => setConfirm(date)}>Delete</button>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
