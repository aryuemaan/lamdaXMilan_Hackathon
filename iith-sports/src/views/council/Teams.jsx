import React, { useState } from "react";
import { useApp } from "../../state/AppProvider";
import { CATEGORIES } from "../../config/app";
import { SPORTS, getSport, lineupSize } from "../../config/sports";
import { todayInSeason } from "../../lib/dates";
import { teamSummary } from "../../lib/stats";
import { Modal, SportBadge } from "../../components/ui";

export default function Teams() {
  const { teams, players, sessions, statsById, openTeam, saveTeam, role } = useApp();
  const [editing, setEditing] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const today = todayInSeason();
  const list = teams.filter((t) => showInactive || t.active);

  return (
    <div className="stack">
      <div className="row between wrap">
        <div><h1 className="h">Teams</h1><p className="lede">Every InterIIT team, who coaches it and how prepared it is.</p></div>
        {role === "council" && <button className="btn primary" onClick={() => setEditing({})}>Add team</button>}
      </div>
      <label className="check"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive teams</label>
      <div className="teams">
        {list.map((t) => {
          const sport = getSport(t.sport);
          const tp = players.filter((p) => p.teamId === t.id && p.active && !p.graduated);
          const s = teamSummary(t, sport, tp, sessions[t.id] || {}, statsById, today);
          return (
            <article className={"tcard" + (t.active ? "" : " dim")} key={t.id} style={{ "--c": sport.color }}>
              <div className="row"><SportBadge sport={sport} size="lg" /><div><div className="nm">{sport.name}</div><div className="meta">{t.category}{t.coachName ? ` · Coach ${t.coachName}` : ""}</div></div></div>
              <div className="meta">{t.venue || "Venue not set"} · {sport.lineupName}: {lineupSize(sport)} of {sport.squad}</div>
              <div className="tstats">
                <div><b>{s.squad}</b><span>in squad</span></div>
                <div><b>{s.attPct != null ? s.attPct + "%" : "—"}</b><span>attendance</span></div>
                <div><b>{s.readiness}</b><span>readiness</span></div>
              </div>
              <div className="row wrap">
                {s.morningStarted ? (s.pendingToday ? <span className="chip amber">{s.pendingToday} unmarked today</span> : <span className="chip turf">Today's register done</span>) : <span className="chip">No register today</span>}
                {s.health > 0 && <span className="chip violet">{s.health} health note{s.health > 1 ? "s" : ""}</span>}
              </div>
              <div className="row">
                <button className="btn primary grow" onClick={() => openTeam(t.id)}>Open team</button>
                {role === "council" && <button className="btn" onClick={() => setEditing(t)}>Edit</button>}
              </div>
            </article>
          );
        })}
      </div>
      {editing && <TeamModal initial={editing} teams={teams} onClose={() => setEditing(null)} onSave={async (t) => { if (await saveTeam(t)) setEditing(null); }} />}
    </div>
  );
}

function TeamModal({ initial, teams, onClose, onSave }) {
  const isNew = !initial.id;
  const [f, setF] = useState({ sport: initial.sport || "hockey", category: initial.category || "Men", coachName: initial.coachName || "", venue: initial.venue || "", active: initial.active !== false, sortOrder: initial.sortOrder ?? 100 });
  const [err, setErr] = useState("");
  const submit = () => {
    let id = initial.id;
    if (isNew) {
      id = `${f.sport}-${f.category === "Men" ? "m" : f.category === "Women" ? "w" : "x"}`;
      if (teams.some((t) => t.id === id)) return setErr("This sport already has a team in that category.");
    }
    onSave({ ...initial, ...f, id, sortOrder: Number(f.sortOrder) || 100 });
  };
  return (
    <Modal title={isNew ? "Add team" : "Edit team"} onClose={onClose}
      actions={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={submit}>Save team</button></>}>
      <div className="form-grid">
        <label>Sport<select className="field" value={f.sport} disabled={!isNew} onChange={(e) => setF({ ...f, sport: e.target.value })}>{Object.entries(SPORTS).map(([k, s]) => <option key={k} value={k}>{s.name}</option>)}</select></label>
        <label>Category<select className="field" value={f.category} disabled={!isNew} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Coach / captain name<input className="field" value={f.coachName} onChange={(e) => setF({ ...f, coachName: e.target.value })} /></label>
        <label>Practice venue<input className="field" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></label>
        <label>Display order<input className="field" type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></label>
        <label className="check" style={{ alignSelf: "end" }}><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active this season</label>
      </div>
      <p className="muted small">Coach logins are linked to teams in Manage → Accounts.</p>
      {err && <div className="note err">{err}</div>}
    </Modal>
  );
}
