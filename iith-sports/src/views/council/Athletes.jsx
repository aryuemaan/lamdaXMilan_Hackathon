import React, { useMemo, useState } from "react";
import { useApp } from "../../state/AppProvider";
import { SPORTS, getSport } from "../../config/sports";
import { SportBadge, Empty } from "../../components/ui";

const SORTS = {
  overall: (a, b) => b.s.overall - a.s.overall,
  rating: (a, b) => b.s.avgRating - a.s.avgRating,
  attendance: (a, b) => b.s.attendancePct - a.s.attendancePct,
  misses: (a, b) => b.s.matchDayMisses - a.s.matchDayMisses,
};

export default function Athletes() {
  const { players, teamById, statsById, openProfile } = useApp();
  const [q, setQ] = useState("");
  const [sport, setSport] = useState("all");
  const [gender, setGender] = useState("all");
  const [sort, setSort] = useState("overall");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return players
      .filter((p) => p.active && !p.graduated && teamById[p.teamId])
      .filter((p) => sport === "all" || teamById[p.teamId].sport === sport)
      .filter((p) => gender === "all" || p.gender === gender)
      .filter((p) => !t || p.name.toLowerCase().includes(t) || (p.department || "").toLowerCase().includes(t) || (p.year || "").toLowerCase().includes(t))
      .map((p) => ({ p, s: statsById[p.id], team: teamById[p.teamId] }))
      .filter((x) => x.s)
      .sort(SORTS[sort]);
  }, [players, teamById, statsById, q, sport, gender, sort]);

  return (
    <div className="stack">
      <div>
        <h1 className="h">Athletes</h1>
        <p className="lede">One leaderboard for the whole contingent, scored the same way in every sport: 40% coach rating, 30% team coordination, 30% attendance.</p>
      </div>
      <div className="row wrap">
        <input className="field" style={{ maxWidth: 300 }} placeholder="Search name, department or year" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search athletes" />
        <select className="field" style={{ width: "auto" }} value={sport} onChange={(e) => setSport(e.target.value)} aria-label="Sport">
          <option value="all">All sports</option>{Object.entries(SPORTS).map(([k, s]) => <option key={k} value={k}>{s.name}</option>)}
        </select>
        <select className="field" style={{ width: "auto" }} value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
          <option value="all">All athletes</option><option value="F">Women</option><option value="M">Men</option>
        </select>
        <select className="field" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="overall">Sort by overall</option><option value="rating">Sort by coach rating</option><option value="attendance">Sort by attendance</option><option value="misses">Most match-day misses</option>
        </select>
        <span className="muted small">{rows.length} athletes</span>
      </div>
      {rows.length === 0 ? <Empty title="No athletes match" hint="Clear the search or choose another sport." /> : (
        <div className="tw">
          <table className="t">
            <thead><tr><th className="r">#</th><th>Athlete</th><th>Team</th><th>Role</th><th>Dept</th><th className="r">Overall</th><th className="r">Coach</th><th className="r">Team coord.</th><th className="r">Att.</th><th className="r">Match-day misses</th></tr></thead>
            <tbody>
              {rows.map(({ p, s, team }, i) => {
                const sp = getSport(team.sport);
                return (
                  <tr key={p.id}>
                    <td className="r">{i + 1}</td>
                    <td><button className="link" onClick={() => openProfile(p.id)}>{p.name}</button>{p.health && <span className="health" title={p.health}> ⚕</span>}</td>
                    <td><SportBadge sport={sp} /> {sp.name} {team.category}</td>
                    <td>{p.position}</td><td>{p.department}</td>
                    <td className="r big">{s.overall}</td>
                    <td className="r">{s.avgRating ? s.avgRating.toFixed(2) : "—"}</td>
                    <td className="r">{s.avgTeam ? s.avgTeam.toFixed(2) : "—"}</td>
                    <td className="r">{s.markedSessions ? Math.round(s.attendancePct) + "%" : "—"}</td>
                    <td className={"r" + (s.matchDayMisses ? " bad" : "")}>{s.matchDayMisses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
