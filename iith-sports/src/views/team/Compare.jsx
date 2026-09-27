import React, { useState } from "react";
import { useApp } from "../../state/AppProvider";
import { Jersey, PlayerPicker } from "../../components/ui";

const ROWS = [
  ["Overall", (x) => x.overall], ["Coach rating", (x) => (x.avgRating ? x.avgRating.toFixed(2) : "—")], ["Match-day misses", (x) => x.matchDayMisses || 0, true],
  ["Team coordination", (x) => (x.avgTeam ? x.avgTeam.toFixed(2) : "—")], ["Matches played", (x) => x.matchesPlayed || 0], ["Attendance %", (x) => Math.round(x.attendancePct)],
  ["Punctuality %", (x) => Math.round(x.punctualityPct)], ["Current streak", (x) => x.currentStreak], ["Longest streak", (x) => x.longestStreak], ["Present", (x) => x.counts.present], ["Sessions", (x) => x.markedSessions],
];

export default function Compare() {
  const { rosterPlayers, statsById, compareSeed, myPlayer, role } = useApp();
  const pool = [...rosterPlayers].sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999));
  const seed = (pool.find((p) => p.id === compareSeed) || (role === "player" && myPlayer) || pool[0] || {}).id;
  const [aId, setA] = useState(seed);
  const [bId, setB] = useState((pool.find((p) => p.id !== seed) || {}).id);
  const A = pool.find((p) => p.id === aId), B = pool.find((p) => p.id === bId);
  const sA = A && statsById[A.id], sB = B && statsById[B.id];

  return (
    <div className="stack">
      <h1 className="h">Compare athletes</h1>
      <div className="cmp-pick"><PlayerPicker players={pool} value={aId} onChange={setA} placeholder="First athlete" /><span className="muted">vs</span><PlayerPicker players={pool} value={bId} onChange={setB} placeholder="Second athlete" /></div>
      {A && B && sA && sB && (
        <section className="panel">
          <div className="row between"><span className="row"><Jersey n={A.jersey} /><b>{A.name}</b></span><span className="row"><b>{B.name}</b><Jersey n={B.jersey} /></span></div>
          <table className="cmp"><tbody>
            {ROWS.map(([label, f, lowerBetter]) => {
              const va = f(sA), vb = f(sB), na = parseFloat(va), nb = parseFloat(vb);
              let w = 0;
              if (!isNaN(na) && !isNaN(nb) && na !== nb) w = (lowerBetter ? na < nb : na > nb) ? -1 : 1;
              return <tr key={label}><td className={"a" + (w === -1 ? " win" : "")}>{va}</td><td className="lbl">{label}</td><td className={"b" + (w === 1 ? " win" : "")}>{vb}</td></tr>;
            })}
          </tbody></table>
        </section>
      )}
    </div>
  );
}
