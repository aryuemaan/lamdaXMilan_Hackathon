import React, { useEffect, useState } from "react";
import { useApp } from "../../state/AppProvider";
import { ROLES } from "../../config/app";
import { teamLabel } from "../../config/sports";
import { todayInSeason } from "../../lib/dates";
import { createAccount, listProfiles, updateProfileTeams } from "../../lib/db";
import { exportContingent, exportTeamSeason } from "../../lib/exports";
import { Confirm, SyncPill } from "../../components/ui";

export default function Manage() {
  const { role, sync, refresh, activeTeam, activeTeamId, teams, players, sessions, statsById, teamSessions, resetTeamSessions, flash, canEditTeam } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="stack">
      <h1 className="h">Manage</h1>

      <section className="panel">
        <div className="row between"><h3 className="h">Shared database</h3><SyncPill sync={sync} onClick={refresh} /></div>
        <p className="muted">Every change a coach makes — attendance, ratings, comments, no-practice days — is saved to Supabase within a second and appears for every athlete after they reload.</p>
        {sync.msg && <div className="note err">Database message: {sync.msg}</div>}
        {sync.last ? <div className="muted small">Last saved {new Date(sync.last).toLocaleTimeString()}.</div> : null}
        <button className="btn primary" style={{ marginTop: 10 }} onClick={refresh}>Reload latest data</button>
      </section>

      <section className="panel">
        <h3 className="h">Reports</h3>
        <div className="row wrap">
          {activeTeam && <button className="btn primary" onClick={() => { exportTeamSeason(activeTeam, players.filter((p) => p.teamId === activeTeamId), teamSessions); flash("Season report downloaded"); }}>Download {teamLabel(activeTeam)} season (Excel)</button>}
          {role === "council" && <button className="btn" onClick={() => { exportContingent(teams.filter((t) => t.active), players, sessions, statsById, todayInSeason()); flash("Contingent report downloaded"); }}>Download whole contingent (Excel)</button>}
        </div>
      </section>

      {activeTeam && canEditTeam(activeTeamId) && (
        <section className="panel">
          <h3 className="h">Team data</h3>
          <p className="muted">Deleting practice records for {teamLabel(activeTeam)} can't be undone. Download the season report first.</p>
          {confirmReset
            ? <Confirm text={`Delete every ${teamLabel(activeTeam)} session?`} confirmLabel="Delete all sessions" onConfirm={async () => { await resetTeamSessions(activeTeamId); setConfirmReset(false); }} onCancel={() => setConfirmReset(false)} />
            : <button className="btn danger" onClick={() => setConfirmReset(true)}>Delete all sessions for this team</button>}
        </section>
      )}

      {role === "council" && <Accounts />}

      <section className="panel prose">
        <h3 className="h">Who can do what</h3>
        <ul>
          <li><b>Sports council:</b> sees every team, creates teams and coach logins, and can edit any register.</li>
          <li><b>Coach / captain:</b> marks attendance, rates athletes, edits the roster and exports reports — only for their own teams.</li>
          <li><b>Athlete:</b> sees their own score, drills, team rankings and selection, and rates teammates on days they trained.</li>
          <li>These limits are enforced by Supabase row-level security, not just hidden in the app.</li>
        </ul>
      </section>
    </div>
  );
}

function Accounts() {
  const { teams, flash } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ kind: "coach", name: "", email: "", password: "", teamIds: [] });
  const [busy, setBusy] = useState(false);

  const load = () => listProfiles().then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const toggle = (arr, id) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const create = async () => {
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr("Enter a name and a valid email.");
    if (f.password.length < 8) return setErr("Use a password of at least 8 characters.");
    if (f.kind === "coach" && !f.teamIds.length) return setErr("Pick at least one team for the coach.");
    setBusy(true); setErr("");
    try {
      await createAccount({ kind: f.kind, name: f.name.trim(), email: f.email.trim(), password: f.password, teamIds: f.teamIds });
      flash(`Login created for ${f.name.trim()}`);
      setF({ kind: "coach", name: "", email: "", password: "", teamIds: [] });
      load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const saveTeams = async (p, ids) => {
    try { await updateProfileTeams(p.id, ids); setList((l) => l.map((x) => (x.id === p.id ? { ...x, team_ids: ids } : x))); flash("Teams updated"); }
    catch (e) { flash(`Not saved: ${e.message}`); }
  };

  const staff = (list || []).filter((p) => p.role !== "player");
  const athletes = (list || []).filter((p) => p.role === "player").length;

  return (
    <section className="panel">
      <h3 className="h">Accounts</h3>
      <p className="muted">Athlete logins are created from the Roster when you add an athlete with an email and WhatsApp number. Create coach and council logins here.</p>
      <div className="form-grid">
        <label>Account type<select className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="coach">Coach / captain</option><option value="council">Sports council</option></select></label>
        <label>Name<input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Email<input className="field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>First password<input className="field" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      </div>
      {f.kind === "coach" && (
        <div className="chips-pick">{teams.map((t) => <label key={t.id} className={"chip-pick" + (f.teamIds.includes(t.id) ? " on" : "")}><input type="checkbox" checked={f.teamIds.includes(t.id)} onChange={() => setF({ ...f, teamIds: toggle(f.teamIds, t.id) })} />{teamLabel(t)}</label>)}</div>
      )}
      {err && <div className="note err">{err}</div>}
      <button className="btn primary" style={{ marginTop: 10 }} onClick={create} disabled={busy}>{busy ? "Creating…" : "Create login"}</button>

      <h3 className="h" style={{ marginTop: 20 }}>Staff logins</h3>
      {!list ? <div className="muted small">Loading…</div> : (
        <div className="tw">
          <table className="t">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Teams</th></tr></thead>
            <tbody>
              {staff.map((p) => (
                <tr key={p.id}>
                  <td>{p.display_name || "—"}</td><td>{p.email || "—"}</td><td>{ROLES[p.role]}</td>
                  <td className="wrapcell">{p.role === "coach" ? (
                    <div className="chips-pick">{teams.map((t) => <label key={t.id} className={"chip-pick sm" + ((p.team_ids || []).includes(t.id) ? " on" : "")}><input type="checkbox" checked={(p.team_ids || []).includes(t.id)} onChange={() => saveTeams(p, toggle(p.team_ids || [], t.id))} />{teamLabel(t)}</label>)}</div>
                  ) : "All teams"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">{athletes} athlete login{athletes === 1 ? "" : "s"} exist.</p>
    </section>
  );
}
