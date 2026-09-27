import React, { useEffect, useState } from "react";
import { useApp } from "../../state/AppProvider";
import { GENDERS, SEASON_END, SEASON_START } from "../../config/app";
import { skillKeys, skillLabel } from "../../config/sports";
import { clampToSeason } from "../../lib/dates";
import { baselineAvg } from "../../lib/stats";
import { fetchPlayerPrivate, newId, savePlayerPrivate } from "../../lib/db";
import { importTemplate, readSheet } from "../../lib/exports";
import TeamHeader from "../../components/TeamHeader";
import { Empty, Jersey, Modal, SkillRow, Tabs } from "../../components/ui";

export default function Roster() {
  const { activeTeamId, sport, teamPlayers, statsById, savePlayers, createPlayerLogin, canEditTeam, openProfile } = useApp();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("cards");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const canEdit = canEditTeam(activeTeamId);

  const t = q.trim().toLowerCase();
  const list = teamPlayers
    .filter((p) => !p.graduated && (showInactive || p.active))
    .filter((p) => !t || p.name.toLowerCase().includes(t) || String(p.jersey ?? "").includes(t) || (p.position || "").toLowerCase().includes(t) || (p.department || "").toLowerCase().includes(t))
    .sort(mode === "skills" ? (a, b) => baselineAvg(b, sport) - baselineAvg(a, sport) : (a, b) => (a.jersey ?? 999) - (b.jersey ?? 999));

  const onSave = async (data) => {
    const { email, phone, ...fields } = data;
    const isNew = !fields.id;
    const player = isNew ? { ...fields, id: newId("p"), teamId: activeTeamId, active: true } : fields;
    const ok = await savePlayers([player]);
    if (!ok) return;
    if (isNew && email && phone) await createPlayerLogin({ playerId: player.id, name: player.name, email, phone });
    else if (!isNew && phone !== undefined) { try { await savePlayerPrivate(player.id, { phone }); } catch (e) { /* contact is optional */ } }
    setEditing(null);
  };

  return (
    <div className="stack">
      <TeamHeader />
      <div className="row between wrap">
        <h2 className="h">Roster · {teamPlayers.filter((p) => p.active && !p.graduated).length} active</h2>
        {canEdit && <div className="row"><button className="btn" onClick={() => setImporting(true)}>Import from sheet</button><button className="btn primary" onClick={() => setEditing({})}>Add athlete</button></div>}
      </div>
      <div className="row wrap">
        <input className="field" style={{ maxWidth: 320 }} placeholder="Search name, jersey, role or department" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search roster" />
        <Tabs items={[["cards", "Squad"], ["skills", "Sign-up skills"]]} value={mode} onChange={setMode} />
        <label className="check"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive</label>
      </div>

      {list.length === 0 ? (
        <Empty title="No athletes yet" hint={canEdit ? "Add athletes one by one, or import your sign-up sheet." : "Nobody matches this search."} />
      ) : (
        <div className="roster">
          {list.map((p) => {
            const s = statsById[p.id] || {};
            return (
              <article className={"pcard" + (p.active ? "" : " dim")} key={p.id}>
                <button className="who" onClick={() => openProfile(p.id)}>
                  <Jersey n={p.jersey} />
                  <span><b>{p.name}{p.health && <span className="health" title={p.health}> ⚕</span>}</b><span className="muted small">{p.position} · {p.year} {p.department}{!p.active && " · inactive"}</span></span>
                </button>
                {mode === "cards" ? (
                  <div className="pq">
                    <div><b>{s.overall || 0}</b><span>overall</span></div>
                    <div><b>{s.avgRating ? s.avgRating.toFixed(1) : "—"}</b><span>coach</span></div>
                    <div><b>{s.markedSessions ? Math.round(s.attendancePct) + "%" : "—"}</b><span>attendance</span></div>
                  </div>
                ) : (
                  <div className="skills">
                    {skillKeys(sport).map((k) => <SkillRow key={k} label={skillLabel(sport, k)} v={(p.baseline || {})[k]} />)}
                    <div className="row wrap" style={{ marginTop: 6 }}>
                      <span className="chip signal">Pre-season {p.preSeasonRating || 0}/5</span>
                      {p.availability && <span className="chip">{p.availability}</span>}
                      {p.playedBefore ? <span className="chip">Played before</span> : <span className="chip">New</span>}
                    </div>
                  </div>
                )}
                {canEdit && (
                  <div className="row">
                    <button className="btn sm grow" onClick={() => setEditing(p)}>Edit</button>
                    <button className="btn sm grow" onClick={() => savePlayers([{ ...p, active: !p.active }], { quiet: true })}>{p.active ? "Deactivate" : "Reactivate"}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {editing && <PlayerModal initial={editing} sport={sport} onSave={onSave} onClose={() => setEditing(null)} />}
      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </div>
  );
}

export function PlayerModal({ initial, sport, onSave, onClose }) {
  const isNew = !initial.id;
  const [f, setF] = useState({
    ...initial,
    name: initial.name || "", jersey: initial.jersey ?? "", position: initial.position || sport.roles[0], gender: initial.gender || "",
    year: initial.year || "", department: initial.department || "", age: initial.age ?? "",
    joinedDate: initial.joinedDate || SEASON_START, health: initial.health || "", availability: initial.availability || "",
    preSeasonRating: initial.preSeasonRating ?? 0, baseline: { ...(initial.baseline || {}) }, email: "", phone: undefined,
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (isNew) { setF((x) => ({ ...x, phone: "" })); return; }
    fetchPlayerPrivate(initial.id).then((d) => setF((x) => ({ ...x, phone: d.phone || "" }))).catch(() => {});
  }, [isNew, initial.id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    if (!f.name.trim()) return setErr("Enter the athlete's name.");
    if (isNew) {
      const email = f.email.trim();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("That email doesn't look right.");
      if (email && String(f.phone || "").replace(/\D/g, "").length < 6) return setErr("Add the WhatsApp number — it becomes the athlete's first password.");
    }
    setSaving(true);
    await onSave({ ...f, name: f.name.trim(), jersey: f.jersey === "" ? null : Number(f.jersey), age: f.age === "" ? null : Number(f.age), preSeasonRating: Math.max(0, Math.min(5, Number(f.preSeasonRating) || 0)) });
    setSaving(false);
  };

  return (
    <Modal title={isNew ? "Add athlete" : `Edit ${initial.name}`} onClose={onClose} wide
      actions={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save athlete"}</button></>}>
      <div className="form-grid">
        <label>Name<input className="field" value={f.name} onChange={set("name")} /></label>
        <label>Jersey / number<input className="field" type="number" value={f.jersey} onChange={set("jersey")} /></label>
        <label>Role<select className="field" value={f.position} onChange={set("position")}>{sport.roles.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>Gender<select className="field" value={f.gender} onChange={set("gender")}><option value="">—</option>{Object.entries(GENDERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Year / programme<input className="field" value={f.year} placeholder="e.g. B.Tech '24" onChange={set("year")} /></label>
        <label>Department<input className="field" value={f.department} onChange={set("department")} /></label>
        <label>Age<input className="field" type="number" value={f.age} onChange={set("age")} /></label>
        <label>Joined on<input className="field" type="date" value={f.joinedDate} min={SEASON_START} max={SEASON_END} onChange={(e) => setF({ ...f, joinedDate: clampToSeason(e.target.value || SEASON_START) })} /></label>
        <label>Pre-season rating (0–5)<input className="field" type="number" min="0" max="5" step="0.5" value={f.preSeasonRating} onChange={set("preSeasonRating")} /></label>
        <label>Availability<input className="field" value={f.availability} placeholder="Full / partial / limited" onChange={set("availability")} /></label>
        <label className="full">Health note<input className="field" value={f.health} placeholder="e.g. hamstring — light drills only" onChange={set("health")} /></label>
        {isNew && <label>IITH email (login)<input className="field" type="email" value={f.email} placeholder="rollno@iith.ac.in" onChange={set("email")} /></label>}
        {f.phone !== undefined && <label>WhatsApp number{isNew ? " (first password)" : ""}<input className="field" value={f.phone} placeholder="9876543210" onChange={set("phone")} /></label>}
      </div>
      <h3 className="h small-h">Self-assessment (1–5)</h3>
      <div className="form-grid three">
        {skillKeys(sport).map((k) => (
          <label key={k}>{skillLabel(sport, k)}
            <input className="field" type="number" min="0" max="5" value={f.baseline[k] ?? ""} onChange={(e) => setF({ ...f, baseline: { ...f.baseline, [k]: e.target.value === "" ? 0 : Math.max(0, Math.min(5, Number(e.target.value))) } })} />
          </label>
        ))}
      </div>
      {isNew && <p className="muted small">With an email and WhatsApp number, a login is created: email = the IITH email, password = the WhatsApp number. Athletes can change it under More → Account.</p>}
      {err && <div className="note err">{err}</div>}
    </Modal>
  );
}

const HEAD = {
  name: ["name", "full name", "athlete", "player"], jersey: ["jersey", "jersey number", "number", "#"], position: ["position", "role", "event", "positions", "preferred position"],
  gender: ["gender", "gender (m/f)", "sex"], year: ["year", "programme", "program", "year / program"], department: ["department", "dept", "branch"],
  age: ["age"], preSeasonRating: ["pre-season rating", "pre-season", "pre rating", "rating"], health: ["health note", "health", "injury", "injuries"],
  email: ["iith email", "email", "email address"], phone: ["whatsapp number", "whatsapp", "phone", "mobile", "phone number"], availability: ["availability"],
};

function ImportModal({ onClose }) {
  const { activeTeamId, sport, teamPlayers, savePlayers, createPlayerLogin, flash } = useApp();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [makeLogins, setMakeLogins] = useState(true);

  const parse = async (file) => {
    setErr("");
    try {
      const raw = await readSheet(file);
      const norm = (s) => String(s).trim().toLowerCase();
      const out = raw.map((r) => {
        const get = (keys) => { for (const [h, v] of Object.entries(r)) if (keys.includes(norm(h))) return v; return ""; };
        const baseline = {};
        skillKeys(sport).forEach((k) => {
          const label = norm(skillLabel(sport, k));
          for (const [h, v] of Object.entries(r)) if (norm(h) === label || norm(h) === k.toLowerCase() || norm(h).startsWith(label)) baseline[k] = Math.max(0, Math.min(5, Number(v) || 0));
        });
        let position = String(get(HEAD.position) || "").trim();
        const match = sport.roles.find((x) => position.toLowerCase().includes(x.toLowerCase()));
        const g = String(get(HEAD.gender) || "").trim().toUpperCase();
        return {
          name: String(get(HEAD.name) || "").trim(), jersey: get(HEAD.jersey) === "" ? null : Number(get(HEAD.jersey)),
          position: match || sport.roles[0], positionsRaw: position, gender: g.startsWith("F") ? "F" : g.startsWith("M") ? "M" : "",
          year: String(get(HEAD.year) || ""), department: String(get(HEAD.department) || ""), age: get(HEAD.age) === "" ? null : Number(get(HEAD.age)),
          preSeasonRating: Math.max(0, Math.min(5, Number(get(HEAD.preSeasonRating)) || 0)), health: String(get(HEAD.health) || ""), availability: String(get(HEAD.availability) || ""),
          email: String(get(HEAD.email) || "").trim(), phone: String(get(HEAD.phone) || "").replace(/\D/g, ""), baseline,
        };
      }).filter((r) => r.name);
      if (!out.length) throw new Error("No rows with a Name column were found.");
      setRows(out);
    } catch (e) { setErr(e.message); }
  };

  const run = async () => {
    setBusy(true);
    const existing = new Map(teamPlayers.map((p) => [p.name.toLowerCase(), p]));
    const players = rows.map((r) => {
      const { email, phone, ...fields } = r;
      const prev = existing.get(r.name.toLowerCase());
      return prev ? { ...prev, ...fields, baseline: { ...prev.baseline, ...fields.baseline } } : { ...fields, id: newId("p"), teamId: activeTeamId, active: true, joinedDate: SEASON_START };
    });
    const ok = await savePlayers(players);
    if (ok && makeLogins) {
      let made = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!existing.get(r.name.toLowerCase()) && r.email && r.phone.length >= 6) {
          if (await createPlayerLogin({ playerId: players[i].id, name: r.name, email: r.email, phone: r.phone })) made++;
        }
      }
      flash(`Imported ${players.length} athletes · ${made} logins created`);
    }
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal title={`Import ${sport.name} athletes`} onClose={onClose} wide
      actions={<><button className="btn" onClick={onClose}>Cancel</button>{rows && <button className="btn primary" onClick={run} disabled={busy}>{busy ? "Importing…" : `Import ${rows.length} athletes`}</button>}</>}>
      <p className="muted" style={{ marginTop: 0 }}>Upload the sign-up sheet as Excel or CSV. Columns are matched by name (Name, Jersey, Position, Gender, Year, Department, Health note, IITH email, WhatsApp number, plus one column per skill). Existing athletes with the same name are updated.</p>
      <div className="row wrap">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files[0] && parse(e.target.files[0])} aria-label="Sign-up sheet" />
        <button className="btn sm" onClick={() => importTemplate(sport)}>Download template</button>
      </div>
      {err && <div className="note err" style={{ marginTop: 10 }}>{err}</div>}
      {rows && (
        <>
          <label className="check" style={{ margin: "12px 0" }}><input type="checkbox" checked={makeLogins} onChange={(e) => setMakeLogins(e.target.checked)} /> Create logins for new athletes with an email and WhatsApp number</label>
          <div className="tw" style={{ maxHeight: 280, overflow: "auto" }}>
            <table className="t">
              <thead><tr><th>Name</th><th>No.</th><th>Role</th><th>Dept</th><th>Email</th><th>Skills found</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.jersey ?? "—"}</td><td>{r.position}</td><td>{r.department}</td><td>{r.email || "—"}</td><td>{Object.keys(r.baseline).length}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
