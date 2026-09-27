import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../state/AppProvider";
import { ATTENDED, MATCH_DAY_MISS_PENALTY, MATCH_DAY_MISS_PENALTY_CAP, SEASON_END, SEASON_START, SESSION_SLOTS, SLOT_LABEL, STATUS } from "../../config/app";
import { addDays, clampToSeason, isMatchDay, nowTime, prettyDate, weekdayName } from "../../lib/dates";
import { emptyRecord, emptySlot, ensureSession } from "../../lib/stats";
import { exportSlot, exportTeamSeason, slotPendingPlayers, slotPresentRows, slotUnratedAttendees } from "../../lib/exports";
import TeamHeader from "../../components/TeamHeader";
import { CommentBox, Empty, Jersey, Kpi, StatusBadge, Stars, TypeBadge } from "../../components/ui";

export default function Attendance() {
  const { activeTeam, activeTeamId, sport, players, rosterPlayers, teamSessions, selectedDate, setSelectedDate, updateSlot, canEditTeam, openProfile, flash, refresh, flush } = useApp();
  const [slot, setSlot] = useState("morning");
  const [blocked, setBlocked] = useState(null);
  const canEdit = canEditTeam(activeTeamId);

  useEffect(() => {
    const onSlot = (e) => SESSION_SLOTS.includes(e.detail) && setSlot(e.detail);
    window.addEventListener("iith:slot", onSlot);
    return () => window.removeEventListener("iith:slot", onSlot);
  }, []);
  useEffect(() => { setBlocked(null); }, [selectedDate, slot, activeTeamId]);

  const session = ensureSession(teamSessions, selectedDate);
  const slotObj = session[slot] || emptySlot();
  const squad = useMemo(() => rosterPlayers.filter((p) => (p.joinedDate || SEASON_START) <= selectedDate).sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999)), [rosterPlayers, selectedDate]);
  const teamPlayersForExport = players.filter((p) => p.teamId === activeTeamId);

  const edit = (fn) => updateSlot(activeTeamId, selectedDate, slot, fn);
  const recOf = (pid) => slotObj.records[pid] || emptyRecord();
  const setRecord = (pid, patch) => edit((so) => {
    const next = { ...(so.records[pid] || emptyRecord()), ...patch };
    if (!ATTENDED.includes(next.status)) { next.rating = 0; next.teamRating = 0; }
    return { ...so, records: { ...so.records, [pid]: next } };
  });
  const clearRecord = (pid) => edit((so) => { const r = { ...so.records }; delete r[pid]; return { ...so, records: r }; });
  const addComment = (pid, text) => { edit((so) => { const r = so.records[pid] || emptyRecord(); return { ...so, records: { ...so.records, [pid]: { ...r, comments: [...(r.comments || []), { text, date: selectedDate, time: nowTime(), slot }] } } }; }); flash("Comment added"); };
  const markRestPresent = () => {
    edit((so) => {
      const records = { ...so.records };
      squad.forEach((p) => { if (!records[p.id] || !records[p.id].status) { records[p.id] = { ...emptyRecord(), status: "present" }; } });
      return { ...so, records };
    });
    flash("Marked the remaining athletes present — add their ratings below");
  };
  const toggleNoPractice = (val) => { edit((so) => ({ ...so, noPractice: val })); flash(val ? `${SLOT_LABEL[slot]} marked as no practice` : `${SLOT_LABEL[slot]} practice is back on`); };

  const kpi = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, escape: 0 }; let marked = 0; const rated = [], team = [];
    squad.forEach((p) => {
      const r = slotObj.records[p.id];
      if (!r || !r.status) return;
      marked++; c[r.status]++;
      if (ATTENDED.includes(r.status) && r.rating > 0) rated.push(r.rating);
      if (ATTENDED.includes(r.status) && r.teamRating > 0) team.push(r.teamRating);
    });
    const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "—");
    return { ...c, marked, pending: squad.length - marked, pct: marked ? Math.round(((c.present + c.late) / marked) * 100) : 0, avg: avg(rated), avgTeam: avg(team) };
  }, [slotObj, squad]);

  const tryDownload = async (fmt) => {
    const pend = slotPendingPlayers(teamSessions, selectedDate, slot, teamPlayersForExport);
    if (pend.length) return setBlocked({ type: "pending", names: pend });
    const unrated = slotUnratedAttendees(teamSessions, selectedDate, slot, teamPlayersForExport);
    if (unrated.length) return setBlocked({ type: "rating", names: unrated });
    if (!slotPresentRows(teamSessions, selectedDate, slot, teamPlayersForExport).length) return flash("Nobody attended — nothing to export");
    await flush();
    const n = exportSlot(activeTeam, teamSessions, selectedDate, slot, teamPlayersForExport, fmt);
    flash(`Downloaded ${n} athletes`);
  };

  const md = isMatchDay(selectedDate, sport);
  const other = slot === "morning" ? "evening" : "morning";
  const slotMeta = (sl) => { const o = session[sl]; if (!o) return "Not started"; if (o.noPractice) return "No practice"; return `${squad.filter((p) => o.records[p.id] && o.records[p.id].status).length} of ${squad.length} marked`; };
  const step = (n) => setSelectedDate(clampToSeason(addDays(selectedDate, n)));

  return (
    <div className="stack">
      <TeamHeader />
      <div className="panel datebar">
        <button className="step" onClick={() => step(-1)} disabled={selectedDate <= SEASON_START} aria-label="Previous day">‹</button>
        <div className="d">
          <div className="row" style={{ justifyContent: "center" }}><b>{weekdayName(selectedDate)}, {prettyDate(selectedDate, false)}</b><TypeBadge date={selectedDate} sport={sport} /></div>
          <input type="date" className="field date" value={selectedDate} min={SEASON_START} max={SEASON_END} onChange={(e) => e.target.value && setSelectedDate(clampToSeason(e.target.value))} aria-label="Session date" />
        </div>
        <button className="step" onClick={() => step(1)} disabled={selectedDate >= SEASON_END} aria-label="Next day">›</button>
      </div>

      <div className="slots">
        {SESSION_SLOTS.map((sl) => (
          <button key={sl} className={slot === sl ? "on" : ""} onClick={() => setSlot(sl)} aria-pressed={slot === sl}>
            <b>{SLOT_LABEL[sl]} session</b><span>{slotMeta(sl)}</span>
          </button>
        ))}
      </div>

      {md && <div className="note warn"><b>Match day.</b> Absent or left early here lowers the coach rating by {MATCH_DAY_MISS_PENALTY.toFixed(2)} per session (capped at {MATCH_DAY_MISS_PENALTY_CAP.toFixed(2)}).</div>}
      {!canEdit && <div className="note">You can view this register but not change it.</div>}

      <section className="panel">
        <label className="check strong"><input type="checkbox" checked={!!slotObj.noPractice} disabled={!canEdit} onChange={(e) => toggleNoPractice(e.target.checked)} /> No practice this {SLOT_LABEL[slot].toLowerCase()} (weather, holiday, venue unavailable)</label>
        {slotObj.noPractice && (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <div className="note violet">Nothing in this session counts for or against anyone.</div>
            <input className="field" placeholder="Reason, e.g. heavy rain — ground waterlogged" value={slotObj.reason || ""} disabled={!canEdit} onChange={(e) => edit((so) => ({ ...so, reason: e.target.value }))} aria-label="Reason" />
          </div>
        )}
      </section>

      {!slotObj.noPractice && (
        <>
          <section className="panel">
            <div className="row between small" style={{ marginBottom: 6 }}><b>{kpi.marked} of {squad.length} marked</b><span className="muted">{kpi.pending ? `${kpi.pending} left` : "Register complete"}</span></div>
            <div className="progress"><i style={{ width: (squad.length ? (kpi.marked / squad.length) * 100 : 0) + "%" }} /></div>
            <div className="row wrap" style={{ marginTop: 10 }}>
              {canEdit && kpi.pending > 0 && <button className="btn sm" onClick={markRestPresent}>Mark the rest present</button>}
              <span className="muted small">The {SLOT_LABEL[other].toLowerCase()} session shows: {slotMeta(other)}</span>
            </div>
          </section>

          <div className="kpis">
            <Kpi label="present" value={kpi.present} tone="var(--turf)" />
            <Kpi label="late" value={kpi.late} tone="var(--amber)" />
            <Kpi label="absent" value={kpi.absent} tone="var(--red)" />
            <Kpi label="left early" value={kpi.escape} tone="var(--deep)" />
            <Kpi label="attended" value={kpi.pct + "%"} />
            <Kpi label="avg coach rating" value={kpi.avg} />
            <Kpi label="avg team coord." value={kpi.avgTeam} />
          </div>

          <section className="panel download">
            <div>
              <b>Download {SLOT_LABEL[slot].toLowerCase()} attendees</b>
              <div className="muted small">Mark everyone and give each attendee both ratings first. Absent and unmarked athletes are left out.</div>
            </div>
            <div className="row">
              <button className="btn primary" onClick={() => tryDownload("xlsx")}>Excel</button>
              <button className="btn" onClick={() => tryDownload("csv")}>CSV</button>
              <button className="btn" onClick={() => { exportTeamSeason(activeTeam, teamPlayersForExport, teamSessions); flash("Season report downloaded"); }}>Season report</button>
              <button className="btn" onClick={refresh}>Reload</button>
            </div>
          </section>
          {blocked && blocked.type === "pending" && <div className="note warn"><b>Mark every athlete before downloading.</b> Still unmarked: {blocked.names.join(", ")}</div>}
          {blocked && blocked.type === "rating" && <div className="note warn"><b>Add both ratings before downloading:</b> {blocked.names.join(", ")}</div>}

          <h2 className="h">Mark {SLOT_LABEL[slot].toLowerCase()} attendance</h2>
          {squad.length === 0 ? (
            <Empty title="No athletes for this date" hint="Add athletes in Roster, or pick a date on or after their join date." />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {squad.map((p) => {
                const rec = slotObj.records[p.id];
                const st = rec && rec.status;
                return (
                  <article className={"mc" + (st ? " done" : "")} key={p.id}>
                    <div className="mc-head">
                      <button className="who" onClick={() => openProfile(p.id)}>
                        <Jersey n={p.jersey} />
                        <span><b>{p.name}{p.health && <span className="health" title={p.health}> ⚕</span>}</b><span className="muted small">{p.position} · {p.year} {p.department} · pre-season {p.preSeasonRating || "—"}/5</span></span>
                      </button>
                      <StatusBadge status={st || "pending"} />
                    </div>
                    <div className="stbtns">
                      {Object.keys(STATUS).map((k) => {
                        const on = st === k;
                        return (
                          <button key={k} disabled={!canEdit} aria-pressed={on} style={on ? { background: STATUS[k].color, borderColor: STATUS[k].color, color: "#fff" } : undefined}
                            onClick={() => (on ? clearRecord(p.id) : setRecord(p.id, { status: k }))} title={on ? "Tap again to clear" : ""}>{STATUS[k].label}</button>
                        );
                      })}
                    </div>
                    {st && ATTENDED.includes(st) && (
                      <>
                        <div className={"rrow" + (rec.rating > 0 ? "" : " needs")}><span className="lbl">Coach rating</span><Stars value={rec.rating || 0} readOnly={!canEdit} onChange={(v) => setRecord(p.id, { rating: v })} label={`Coach rating for ${p.name}`} /></div>
                        <div className={"rrow" + (rec.teamRating > 0 ? "" : " needs")}><span className="lbl">Team coordination</span><Stars value={rec.teamRating || 0} readOnly={!canEdit} onChange={(v) => setRecord(p.id, { teamRating: v })} label={`Team coordination for ${p.name}`} /></div>
                      </>
                    )}
                    {st && canEdit && <CommentBox comments={rec.comments} onSend={(t) => addComment(p.id, t)} draftKey={`iith-draft-${activeTeamId}-${selectedDate}-${slot}-${p.id}`} />}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
