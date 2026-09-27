import React, { useEffect, useState } from "react";
import { fetchMyTeammateRatings, fetchTeammateSummary, submitTeammateRatings } from "../lib/db";
import { Jersey, Stars } from "./ui";

export function TeammateRatingForm({ teamId, playerId, date, teammates, onDone }) {
  const [ratings, setRatings] = useState({});
  const [state, setState] = useState("loading"); // loading | open | done | error
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    fetchMyTeammateRatings(date, playerId)
      .then((rows) => { if (live) setState(rows.length ? "done" : "open"); })
      .catch((e) => { if (live) { setErr(e.message); setState("error"); } });
    return () => { live = false; };
  }, [date, playerId]);

  const others = teammates.filter((p) => p.id !== playerId);
  const rated = others.filter((p) => ratings[p.id] > 0).length;
  const submit = async () => {
    if (rated < others.length) { setErr(`Rate ${others.length - rated} more teammate${others.length - rated > 1 ? "s" : ""} before sending.`); return; }
    setSaving(true); setErr("");
    try {
      await submitTeammateRatings(teamId, date, playerId, others.map((p) => ({ playerId: p.id, rating: ratings[p.id] })));
      setState("done"); onDone && onDone();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  if (state === "loading") return <div className="muted small">Loading…</div>;
  if (state === "error") return <div className="note err">Couldn't load ratings: {err}</div>;
  if (state === "done") return <div className="note info">Ratings sent for today. They're anonymous and can't be changed.</div>;
  if (!others.length) return <div className="muted small">Nobody else trained with you today.</div>;
  return (
    <div>
      <p className="muted small" style={{ marginTop: 0 }}>Anonymous and one-time. Rate everyone who trained with you today.</p>
      {others.map((p) => (
        <div key={p.id} className="rate-row">
          <Jersey n={p.jersey} size="xs" /><span className="grow">{p.name}</span>
          <Stars value={ratings[p.id] || 0} onChange={(v) => setRatings((r) => ({ ...r, [p.id]: v }))} label={`Rate ${p.name}`} />
        </div>
      ))}
      {err && <div className="note err" style={{ marginTop: 8 }}>{err}</div>}
      <button className="btn primary" style={{ marginTop: 10 }} onClick={submit} disabled={saving}>{saving ? "Sending…" : `Send ratings (${rated}/${others.length})`}</button>
    </div>
  );
}

export function TeammateRatingSummary({ playerId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    fetchTeammateSummary(playerId).then((d) => live && setData(d)).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [playerId]);
  if (err) return <div className="muted small">Teammate ratings unavailable.</div>;
  if (!data) return <div className="muted small">Loading…</div>;
  if (!data.count) return <div className="muted small">No teammate ratings yet.</div>;
  return (
    <div className="row" style={{ gap: 10 }}>
      <span className="num" style={{ fontSize: 30, fontWeight: 700 }}>{data.avg.toFixed(1)}</span>
      <Stars value={Math.round(data.avg)} readOnly size={18} />
      <span className="muted small">from {data.count} anonymous rating{data.count > 1 ? "s" : ""}</span>
    </div>
  );
}
