import React, { useState } from "react";
import { useApp } from "../../state/AppProvider";
import { MATCH_DAY_MISS_PENALTY, MATCH_DAY_MISS_PENALTY_CAP, WEIGHTS } from "../../config/app";
import { badgePoints } from "../../lib/stats";
import TeamHeader from "../../components/TeamHeader";
import { Empty, Jersey, Tabs } from "../../components/ui";

export default function Rankings() {
  const { role, rosterPlayers, statsById, openProfile, myPlayer } = useApp();
  const [sortKey, setSortKey] = useState("overall");
  const rows = rosterPlayers.map((p) => {
    const s = statsById[p.id] || {};
    return { p, s, pts: badgePoints(p, s), rocket: (s.recentForm || 0) - (s.avgRating || 0) };
  });
  const sorters = {
    overall: (a, b) => b.s.overall - a.s.overall || b.s.avgRating - a.s.avgRating,
    points: (a, b) => b.pts - a.pts || b.s.overall - a.s.overall,
    attendance: (a, b) => b.s.attendancePct - a.s.attendancePct,
    rocket: (a, b) => b.rocket - a.rocket,
    streak: (a, b) => b.s.currentStreak - a.s.currentStreak,
    rating: (a, b) => b.s.avgRating - a.s.avgRating,
    team: (a, b) => b.s.avgTeam - a.s.avgTeam,
    punctuality: (a, b) => b.s.punctualityPct - a.s.punctualityPct,
  };
  const sorted = [...rows].sort(sorters[sortKey]);
  const tabs = [["overall", "Overall"], ["points", "Trophy points"], ["attendance", "Attendance"], ["rocket", "Rating rocket"], ["streak", "Streak"], ["rating", "Coach rating"], ["team", "Team coord."], ["punctuality", "Punctuality"]];
  const me = role === "player" && myPlayer ? myPlayer.id : null;

  return (
    <div className="stack">
      <TeamHeader title="Rankings" />
      <Tabs items={tabs} value={sortKey} onChange={setSortKey} />
      {sorted.length === 0 ? <Empty title="No active athletes yet" hint="Add athletes in Roster to see rankings." /> : (
        <div className="tw">
          <table className="t">
            <thead><tr><th className="r">#</th><th>Athlete</th><th>Role</th><th className="r">Overall</th><th className="r">Coach</th><th className="r">MD misses</th><th className="r">Team coord.</th><th className="r">Matches</th><th className="r">Att. %</th><th className="r">Streak</th><th className="r">Pts</th></tr></thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.p.id} className={(sortKey === "overall" && i === 0 ? "first " : "") + (r.p.id === me ? "me" : "")}>
                  <td className="r"><b>{i + 1}</b></td>
                  <td><button className="link" onClick={() => openProfile(r.p.id)}><Jersey n={r.p.jersey} size="xs" /> {r.p.name}</button></td>
                  <td>{r.p.position}</td>
                  <td className="r big">{r.s.overall}</td>
                  <td className="r">{r.s.avgRating ? r.s.avgRating.toFixed(2) : "—"}</td>
                  <td className={"r" + (r.s.matchDayMisses ? " bad" : "")}>{r.s.matchDayMisses || 0}</td>
                  <td className="r">{r.s.avgTeam ? r.s.avgTeam.toFixed(2) : "—"}</td>
                  <td className="r">{r.s.matchesPlayed || 0}</td>
                  <td className="r">{Math.round(r.s.attendancePct || 0)}</td>
                  <td className="r">{r.s.currentStreak}</td>
                  <td className="r"><b>{r.pts}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">Overall = {Math.round(WEIGHTS.rating * 100)}% coach rating + {Math.round(WEIGHTS.team * 100)}% team coordination + {Math.round(WEIGHTS.att * 100)}% attendance, 0–100. Attendance is signed: present counts fully, late counts half, absent counts against you, and leaving early counts double against. Each match-day absence or early exit also takes {MATCH_DAY_MISS_PENALTY.toFixed(2)} off the coach rating (up to {MATCH_DAY_MISS_PENALTY_CAP.toFixed(2)}). Morning and evening are separate sessions.</p>
    </div>
  );
}
