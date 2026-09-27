import React from "react";
import { useApp } from "../state/AppProvider";
import { todayInSeason } from "../lib/dates";
import { teamSummary } from "../lib/stats";
import { SportBadge } from "./ui";

export default function TeamHeader({ title }) {
  const { activeTeam, sport, rosterPlayers, teamSessions, statsById } = useApp();
  if (!activeTeam) return null;
  const s = teamSummary(activeTeam, sport, rosterPlayers, teamSessions, statsById, todayInSeason());
  return (
    <div className="teamhead">
      <SportBadge sport={sport} size="lg" />
      <div>
        <div className="nm">{title || `${sport.name} · ${activeTeam.category}`}</div>
        <div className="muted small">{title ? `${sport.name} · ${activeTeam.category} · ` : ""}{activeTeam.coachName ? `Coach ${activeTeam.coachName}` : "No coach listed"}{activeTeam.venue ? ` · ${activeTeam.venue}` : ""}</div>
      </div>
      <div className="facts">
        <div><b>{s.squad}</b><span>squad</span></div>
        <div><b>{s.attPct != null ? s.attPct + "%" : "—"}</b><span>attendance</span></div>
        <div><b>{s.avgRating ? s.avgRating.toFixed(2) : "—"}</b><span>avg coach rating</span></div>
        <div><b>{s.readiness}</b><span>readiness</span></div>
      </div>
    </div>
  );
}
