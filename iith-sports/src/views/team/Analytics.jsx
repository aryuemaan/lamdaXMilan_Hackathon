import React, { useMemo } from "react";
import { useApp } from "../../state/AppProvider";
import { defaultFormationName } from "../../config/sports";
import { autoPickLineup, ratingDistribution, roleBalance, topPairs, weakestSkillCounts, weekdayAttendance } from "../../lib/stats";
import TeamHeader from "../../components/TeamHeader";
import { Bar } from "../../components/ui";

export default function Analytics() {
  const { sport, rosterPlayers, teamSessions, statsById } = useApp();
  const wd = useMemo(() => weekdayAttendance(teamSessions), [teamSessions]);
  const dist = useMemo(() => ratingDistribution(rosterPlayers, statsById), [rosterPlayers, statsById]);
  const bal = useMemo(() => roleBalance(rosterPlayers, sport), [rosterPlayers, sport]);
  const pairs = useMemo(() => topPairs(rosterPlayers, teamSessions), [rosterPlayers, teamSessions]);
  const weak = useMemo(() => weakestSkillCounts(rosterPlayers, sport), [rosterPlayers, sport]);
  const xi = useMemo(() => autoPickLineup(sport, defaultFormationName(sport), rosterPlayers, statsById), [sport, rosterPlayers, statsById]);
  const maxDist = Math.max(1, ...dist), maxBal = Math.max(1, ...Object.values(bal));
  const byId = Object.fromEntries(rosterPlayers.map((p) => [p.id, p]));

  return (
    <div className="stack">
      <TeamHeader title="Insights" />
      <div className="grid2">
        <section className="panel">
          <h3 className="h">Attendance by weekday</h3>
          {wd.filter((d) => d.total).length === 0 ? <div className="muted small">No sessions yet.</div> : wd.filter((d) => d.total).map((d) => <Bar key={d.name} label={d.name.slice(0, 3)} value={d.pct} suffix="%" color={d.pct < 70 ? "var(--red)" : undefined} />)}
        </section>
        <section className="panel">
          <h3 className="h">Overall score spread</h3>
          {["0–19", "20–39", "40–59", "60–79", "80–100"].map((l, i) => <Bar key={l} label={l} value={dist[i]} max={maxDist} color="var(--turf)" />)}
        </section>
        <section className="panel">
          <h3 className="h">Squad balance by role</h3>
          {Object.entries(bal).map(([r, n]) => <Bar key={r} label={r} value={n} max={maxBal} color={sport.color} labelWidth={120} />)}
        </section>
        <section className="panel">
          <h3 className="h">Most common weak spot</h3>
          <p className="muted small" style={{ marginTop: 0 }}>Lowest self-rated skill per athlete — useful for planning group drills.</p>
          {weak.length === 0 ? <div className="muted small">No self-assessments yet.</div> : weak.slice(0, 5).map((w) => <Bar key={w.key} label={w.label} value={w.n} max={rosterPlayers.length} labelWidth={150} />)}
        </section>
        <section className="panel">
          <h3 className="h">Best coordination pairs</h3>
          {pairs.length === 0 ? <div className="muted small">Needs a few sessions with team-coordination ratings.</div> : pairs.map((pr, i) => (
            <div className="pair" key={i}><span>{pr.a.name} + {pr.b.name}</span><span className="muted small">{pr.avgTeam.toFixed(1)}★ · {pr.together} sessions</span></div>
          ))}
        </section>
        <section className="panel">
          <h3 className="h">Suggested {sport.lineupName.toLowerCase()}</h3>
          {xi.slots.map((s) => { const p = byId[s.playerId]; return <div className="pair" key={s.id}><span className="muted small" style={{ width: 110 }}>{s.label}</span><span className="grow">{p ? p.name : "—"}</span><b className="fit">{p ? s.fit : ""}</b></div>; })}
        </section>
      </div>
    </div>
  );
}
