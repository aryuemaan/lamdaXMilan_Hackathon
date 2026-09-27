import React, { useEffect, useState } from "react";
import { STATUS } from "../config/app";
import { getSport } from "../config/sports";
import { isMatchDay } from "../lib/dates";
import { draftGet, draftSet } from "../lib/storage";

export function SportBadge({ sport, sportKey, size }) {
  const s = sport || getSport(sportKey);
  return <span className={"sbadge" + (size ? " " + size : "")} style={{ background: s.color }} title={s.name}>{s.code}</span>;
}
export function Jersey({ n, size }) {
  return <span className={"jn" + (size ? " " + size : "")}>{n ?? "–"}</span>;
}
export function PosTag({ position }) { return position ? <span className="chip">{position}</span> : null; }

export function StatusBadge({ status }) {
  if (!status || status === "pending") return <span className="chip">Not marked</span>;
  if (status === "no_practice") return <span className="chip violet">No practice</span>;
  const s = STATUS[status];
  if (!s) return <span className="chip">{String(status)}</span>;
  return <span className="chip" style={{ background: s.color, color: "#fff" }}>{s.label}</span>;
}
export function TypeBadge({ date, sport }) {
  const md = isMatchDay(date, sport);
  return <span className={"chip" + (md ? " signal" : "")}>{md ? "Match day" : "Practice"}</span>;
}
export function Stars({ value = 0, onChange, size = 22, readOnly = false, label = "rating" }) {
  return (
    <span className="stars" role={readOnly ? "img" : "radiogroup"} aria-label={readOnly ? `${value} out of 5` : label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" tabIndex={readOnly ? -1 : 0} disabled={readOnly}
          className={n <= value ? "on" : ""} style={{ fontSize: size }}
          onClick={() => !readOnly && onChange && onChange(n === value ? 0 : n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}>★</button>
      ))}
    </span>
  );
}
export function Empty({ title, hint, children }) {
  return <div className="empty"><div className="empty-title">{title}</div>{hint && <div className="muted small">{hint}</div>}{children}</div>;
}
export function SyncPill({ sync, onClick }) {
  const map = { syncing: ["Saving…", "amber"], synced: ["Saved", "turf"], error: ["Not saved — tap to retry", "red"], off: ["Offline", ""] };
  const [t, c] = map[sync.status] || map.off;
  return <button className={"syncpill " + c} onClick={onClick} title={sync.msg || "Tap to reload the latest data"}><span className="syncdot" />{t}</button>;
}
export function Kpi({ label, value, tone }) {
  return <div className="kpi"><b style={tone ? { color: tone } : undefined}>{value}</b><span>{label}</span></div>;
}
export function SkillRow({ label, v }) {
  const pct = (Math.max(0, Math.min(5, Number(v) || 0)) / 5) * 100;
  return <div className="skillrow"><span>{label}</span><span className="track"><i style={{ width: pct + "%" }} /></span><b>{v || "—"}</b></div>;
}
export function Bar({ label, value, max = 100, suffix = "", color, labelWidth }) {
  return (
    <div className="bar" style={labelWidth ? { gridTemplateColumns: `${labelWidth}px 1fr 48px` } : undefined}>
      <span>{label}</span>
      <span className="track"><i style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} /></span>
      <b>{value}{suffix}</b>
    </div>
  );
}

export function Modal({ title, onClose, children, actions, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3 className="h" style={{ marginBottom: 12 }}>{title}</h3>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function CommentBox({ comments, onSend, draftKey }) {
  const [text, setText] = useState(() => (draftKey ? draftGet(draftKey) : ""));
  useEffect(() => { setText(draftKey ? draftGet(draftKey) : ""); }, [draftKey]);
  const list = Array.isArray(comments) ? comments : [];
  const update = (v) => { setText(v); if (draftKey) draftSet(draftKey, v); };
  const send = () => { const t = text.trim(); if (!t) return; onSend(t); update(""); };
  return (
    <div className="cbox">
      {list.length > 0 && (
        <div className="cmts">
          {list.map((c, i) => { const item = typeof c === "string" ? { text: c } : c || {}; return <div className="cmt" key={i}><span>{item.text}</span>{item.time && <span className="muted">{item.time}</span>}</div>; })}
        </div>
      )}
      <div className="cin">
        <input className="field" placeholder="Add a coach comment" value={text} onChange={(e) => update(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} aria-label="Coach comment" />
        <button className="btn sm" onClick={send}>Add comment</button>
      </div>
      {text.trim() && <div className="muted small">Draft saved on this device.</div>}
    </div>
  );
}

export function PlayerPicker({ players, value, onChange, placeholder }) {
  const chosen = players.find((p) => p.id === value) || null;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const t = q.trim().toLowerCase();
  const matches = (t ? players.filter((p) => p.name.toLowerCase().includes(t) || String(p.jersey ?? "").includes(t)) : players).slice(0, 8);
  return (
    <div className="picker">
      <input className="field" placeholder={placeholder || "Search athlete"} value={open ? q : chosen ? chosen.name : q}
        onFocus={() => { setOpen(true); setQ(""); }} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && matches.length > 0 && (
        <div className="picker-list">
          {matches.map((p) => (
            <button key={p.id} className="picker-row" onMouseDown={() => { onChange(p.id); setOpen(false); setQ(""); }}>
              <Jersey n={p.jersey} size="xs" /><span className="grow">{p.name}</span><span className="muted small">{p.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tabs({ items, value, onChange }) {
  return <div className="tabs">{items.map(([k, l]) => <button key={k} className={"tab" + (value === k ? " on" : "")} onClick={() => onChange(k)}>{l}</button>)}</div>;
}

export function Confirm({ text, confirmLabel = "Confirm", onConfirm, onCancel, danger = true }) {
  return (
    <span className="confirm">
      <span className="small">{text}</span>
      <button className={"btn sm " + (danger ? "danger" : "primary")} onClick={onConfirm}>{confirmLabel}</button>
      <button className="btn sm" onClick={onCancel}>Cancel</button>
    </span>
  );
}
