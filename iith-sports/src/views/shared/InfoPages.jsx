import React, { useState } from "react";
import { useApp } from "../../state/AppProvider";
import { APP_NAME, MATCH_DAY_MISS_PENALTY, MEET_NAME, WEIGHTS } from "../../config/app";
import { GENERAL_SKILLS } from "../../config/sports";
import { updatePassword } from "../../authService";
import { Tabs } from "../../components/ui";

export default function InfoPages() {
  const { sport } = useApp();
  const [tab, setTab] = useState("about");
  return (
    <div className="stack">
      <h1 className="h">More</h1>
      <Tabs items={[["about", "About"], ["rules", "Practice code"], ["library", `${sport.name} drills`], ["account", "Account"]]} value={tab} onChange={setTab} />
      {tab === "about" && (
        <section className="panel prose">
          <h3 className="h">{APP_NAME}</h3>
          <p>Practice management for the IIT Hyderabad {MEET_NAME} contingent: morning and evening attendance for every team, coach and team-coordination ratings, rankings, line-up selection and personal improvement drills for each sport.</p>
          <p>The overall score is {Math.round(WEIGHTS.rating * 100)}% coach rating, {Math.round(WEIGHTS.team * 100)}% team coordination and {Math.round(WEIGHTS.att * 100)}% attendance, out of 100. Match-day (Saturday and Sunday) absences also reduce the coach rating. Every rating a coach enters updates the rankings straight away.</p>
        </section>
      )}
      {tab === "rules" && (
        <section className="panel prose">
          <h3 className="h">Practice code</h3>
          <ul>
            <li><b>Two sessions a day.</b> Morning and evening are marked separately.</li>
            <li><b>Be on time.</b> Present counts fully; late counts half.</li>
            <li><b>Stay till the end.</b> Absent counts against you; leaving early counts double against you.</li>
            <li><b>Match days matter most.</b> Each Saturday or Sunday absence also takes {MATCH_DAY_MISS_PENALTY.toFixed(2)} off your coach rating.</li>
            <li><b>Weather and holidays</b> are marked “No practice” by the coach — nothing counts for or against anyone.</li>
            <li><b>Rate teammates honestly.</b> Ratings are anonymous, once per day, and can't be changed.</li>
          </ul>
        </section>
      )}
      {tab === "library" && (
        <div className="stack" style={{ gap: 10 }}>
          {[GENERAL_SKILLS.fitness, ...sport.skills, ...Object.values(sport.roleFocus || {}), GENERAL_SKILLS.communication].map((s) => (
            <div className="sug" key={s.key}><b>{s.label}</b><ul>{s.drills.map((d) => <li key={d}>{d}</li>)}</ul><div className="tip">{s.tip}</div></div>
          ))}
          {sport.tactics && sport.tactics.map(([t, d]) => <section className="panel" key={t}><b>{t}</b><p className="muted" style={{ margin: "4px 0 0" }}>{d}</p></section>)}
        </div>
      )}
      {tab === "account" && <Account />}
    </div>
  );
}

function Account() {
  const { user, flash } = useApp();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const save = async () => {
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true); setErr("");
    try { await updatePassword(pw); setPw(""); setPw2(""); flash("Password changed"); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <section className="panel stack" style={{ gap: 10, maxWidth: 420 }}>
      <div className="muted small">Signed in as {user.email}</div>
      <label className="lbl">New password<input className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <label className="lbl">Repeat new password<input className="field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
      {err && <div className="note err">{err}</div>}
      <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
    </section>
  );
}
