import React from "react";
import { getDailySuggestions } from "../lib/stats";

const TAG = { role: "Role focus", weakness: "Weak spot", rating: "Rating boost", focus: "Keep sharp" };

export default function DailySuggestions({ player, sport, stats, compact, title = "Today's focus" }) {
  const list = getDailySuggestions(player, sport, stats || {});
  if (!list.length) return null;
  return (
    <section className="panel">
      <div className="row between wrap"><h2 className="h">{title}</h2><span className="muted small">From the sign-up self-assessment, coach ratings and role</span></div>
      <div className="stack" style={{ gap: 8, marginTop: 10 }}>
        {list.map((s) => (
          <div className="sug" key={s.key}>
            <span className="tag">{TAG[s.priority]}</span>
            <b>{s.label}</b>
            <span className="muted small">{s.why}</span>
            {!compact && <ul>{s.drills.map((d) => <li key={d}>{d}</li>)}</ul>}
            <div className="tip">{s.tip}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
