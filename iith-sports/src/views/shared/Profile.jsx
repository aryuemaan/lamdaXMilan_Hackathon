import React from "react";
import { useApp } from "../../state/AppProvider";
import { SLOT_LABEL, WEIGHTS } from "../../config/app";
import { defaultFormationName, getSport, skillKeys, skillLabel } from "../../config/sports";
import { prettyDate, weekdayName } from "../../lib/dates";
import { badgePoints } from "../../lib/stats";
import { commentsText } from "../../lib/exports";
import DailySuggestions from "../../components/DailySuggestions";
import SelectionBoard from "../../components/SelectionBoard";
import RatingChart from "../../components/RatingChart";
import Badges from "../../components/Badges";
import { TeammateRatingSummary } from "../../components/TeammateRating";
import { Empty, Jersey, Kpi, SkillRow, SportBadge, StatusBadge, Stars, TypeBadge } from "../../components/ui";

export default function Profile({ own }) {
  const { role, players, profileId, myPlayer, teamById, statsById, rankById, rosterPlayers, goBack, startCompare, setGraduated, canEditTeam, openProfile } = useApp();
  const player = own ? myPlayer : players.find((p) => p.id === profileId);
  if (!player) return <Empty title="Athlete not found" hint="They may have been removed." />;
  const team = teamById[player.teamId];
  const sport = getSport(team && team.sport);
  const s = statsById[player.id];
  const rank = rankById[player.id];
  const isPlayer = role === "player";
  const publicView = isPlayer && !own && (!myPlayer || myPlayer.id !== player.id);
  const staff = !isPlayer;
  const canEdit = staff && canEditTeam(player.teamId);
  const history = [...s.marks].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.slot < b.slot ? -1 : 1));

  return (
    <div className="stack">
      {!own && (
        <div className="row between wrap">
          <button className="btn sm" onClick={goBack}>‹ Back</button>
          <div className="row">
            <button className="btn sm" onClick={() => startCompare(player.id)}>Compare</button>
            {canEdit && (player.graduated
              ? <button className="btn sm" onClick={() => setGraduated(player.id, false)}>Restore to roster</button>
              : <button className="btn sm" onClick={() => { if (window.confirm(`Move ${player.name} to Alumni? They leave sessions and rankings, but their history is kept.`)) setGraduated(player.id, true); }}>Move to Alumni</button>)}
          </div>
        </div>
      )}
      {player.graduated && <div className="note violet">This athlete is in the Alumni archive{player.graduatedAt ? ` (since ${new Date(player.graduatedAt).toLocaleDateString()})` : ""}.</div>}

      <div className="teamhead">
        <Jersey n={player.jersey} size="lg" />
        <div>
          <div className="nm">{player.name}</div>
          <div className="muted small row wrap" style={{ gap: 6 }}><SportBadge sport={sport} /> {sport.name} {team && team.category} · {player.position} · {player.year} {player.department}{player.age ? ` · age ${player.age}` : ""}{!player.active && " · inactive"}</div>
          <div className="row" style={{ gap: 8, marginTop: 4 }}><Stars value={Math.round(s.avgRating)} readOnly size={16} /><span className="muted small">{s.avgRating.toFixed(2)} coach average · pre-season {player.preSeasonRating || 0}/5</span></div>
        </div>
      </div>

      {player.health && !publicView && <div className="note violet">Health note: {player.health}</div>}

      <section className="panel score">
        <div className="big">{s.overall}<small>/100</small></div>
        <div>
          <div className="muted small" style={{ marginBottom: 6 }}>Overall score{rank ? ` · rank ${rank.current} of ${rosterPlayers.length} (best ${rank.best})` : ""}</div>
          <div className="score-break">
            <div><b>{s.avgRating.toFixed(2)}</b><span>coach rating /5</span></div>
            <div><b>{s.avgTeam ? s.avgTeam.toFixed(2) : "—"}</b><span>team coordination /5</span></div>
            <div><b>{s.recentForm ? s.recentForm.toFixed(1) : "—"}</b><span>recent form</span></div>
            <div><b>{Math.round(s.attendancePct)}%</b><span>attendance</span></div>
            <div><b>{Math.round(s.punctualityPct)}%</b><span>punctuality</span></div>
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>{Math.round(WEIGHTS.rating * 100)}% coach rating · {Math.round(WEIGHTS.team * 100)}% team coordination · {Math.round(WEIGHTS.att * 100)}% attendance</div>
        </div>
      </section>

      {s.matchDayMisses > 0 && <div className="note warn"><b>{s.matchDayMisses} match-day miss{s.matchDayMisses > 1 ? "es" : ""}.</b> Coach rating reduced by {s.matchDayPenalty.toFixed(2)}.</div>}

      <div className="grid2">
        <DailySuggestions player={player} sport={sport} stats={s} compact={publicView} title={own ? "Today's focus" : "Suggested focus"} />
        <div className="stack">
          <div className="counts">
            <Kpi label="present" value={s.counts.present} tone="var(--turf)" />
            <Kpi label="late" value={s.counts.late} tone="var(--amber)" />
            <Kpi label="absent" value={s.counts.absent} tone="var(--red)" />
            <Kpi label="left early" value={s.counts.escape} tone="var(--deep)" />
          </div>
          <section className="panel">
            <h3 className="h">Teammate rating</h3>
            <TeammateRatingSummary playerId={player.id} />
          </section>
          <section className="panel">
            <h3 className="h">Coach-rating trend</h3>
            <RatingChart player={player} stats={s} sport={sport} />
          </section>
        </div>
      </div>

      {staff && (
        <section className="panel">
          <div className="row between"><h3 className="h">Trophy case</h3><span className="chip signal">{badgePoints(player, s)} pts</span></div>
          <Badges player={player} stats={s} showLocked />
        </section>
      )}

      {!publicView && (
        <section className="panel">
          <h3 className="h">{sport.lineupName}</h3>
          <SelectionBoard sport={sport} formation={defaultFormationName(sport)} players={rosterPlayers} statsById={statsById} highlightId={player.id} onOpen={staff ? openProfile : undefined} />
        </section>
      )}

      <div className="stat-grid">
        <Kpi label="current rank" value={rank ? "#" + rank.current : "—"} tone="var(--signal)" />
        <Kpi label="best rank" value={rank ? "#" + rank.best : "—"} tone="var(--turf)" />
        <Kpi label="matches played" value={s.matchesPlayed} />
        <Kpi label="match-day misses" value={s.matchDayMisses} tone="var(--deep)" />
        <Kpi label="current streak" value={s.currentStreak} />
        <Kpi label="longest streak" value={s.longestStreak} />
      </div>

      <section className="panel">
        <h3 className="h">Sign-up self-assessment</h3>
        <div className="skills two">{skillKeys(sport).map((k) => <SkillRow key={k} label={skillLabel(sport, k)} v={(player.baseline || {})[k]} />)}</div>
        {(player.experience || player.availability) && <p className="muted small">{player.experience && `Experience: ${player.experience}. `}{player.availability && `Availability: ${player.availability}.`}</p>}
      </section>

      <h2 className="h">Session history</h2>
      {history.length === 0 ? <Empty title="No sessions yet" hint="Marks appear here once the coach records attendance." /> : (
        <div className="tw">
          <table className="t">
            <thead><tr><th>Date</th><th>Session</th><th>Type</th><th>Status</th><th className="r">Coach</th><th className="r">Team</th>{!publicView && <th>Comments</th>}</tr></thead>
            <tbody>
              {history.map((m) => (
                <tr key={m.date + m.slot}>
                  <td>{prettyDate(m.date)}<div className="muted small">{weekdayName(m.date)}</div></td>
                  <td>{SLOT_LABEL[m.slot]}</td>
                  <td><TypeBadge date={m.date} sport={sport} /></td>
                  <td><StatusBadge status={m.status} /></td>
                  <td className="r">{m.rating > 0 ? m.rating + "★" : "—"}</td>
                  <td className="r">{m.teamRating > 0 ? m.teamRating + "★" : "—"}</td>
                  {!publicView && <td className="muted wrapcell">{commentsText(m.comments) || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
