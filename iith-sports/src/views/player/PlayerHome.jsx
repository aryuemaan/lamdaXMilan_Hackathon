import React from "react";
import { useApp } from "../../state/AppProvider";
import { ATTENDED, SESSION_SLOTS } from "../../config/app";
import { defaultFormationName } from "../../config/sports";
import { todayInSeason } from "../../lib/dates";
import DailySuggestions from "../../components/DailySuggestions";
import SelectionBoard from "../../components/SelectionBoard";
import { TeammateRatingForm } from "../../components/TeammateRating";
import { Empty, Kpi, SportBadge } from "../../components/ui";

export default function PlayerHome() {
  const { myPlayer, profile, statsById, sport, activeTeam, teamSessions, rosterPlayers, rankById, setView, refresh, sync } = useApp();
  if (!myPlayer) {
    return <Empty title="Your login isn't linked to an athlete" hint={`Ask your coach to check athlete ID ${profile.player_id || "—"}.`} />;
  }
  const s = statsById[myPlayer.id];
  const rank = rankById[myPlayer.id];
  const today = todayInSeason();
  const day = teamSessions[today];
  const attended = (pid) => !!day && SESSION_SLOTS.some((sl) => day[sl] && !day[sl].noPractice && day[sl].records[pid] && ATTENDED.includes(day[sl].records[pid].status));
  const trainedToday = attended(myPlayer.id);
  const mates = rosterPlayers.filter((p) => attended(p.id));

  return (
    <div className="stack">
      <div>
        <h1 className="h">Hi {myPlayer.name.split(" ")[0]}</h1>
        <p className="lede row wrap" style={{ gap: 6 }}><SportBadge sport={sport} /> {sport.name} {activeTeam && activeTeam.category} · {myPlayer.position}. Your score updates after every session the coach saves.</p>
      </div>

      <section className="panel score">
        <div className="big">{s.overall}<small>/100</small></div>
        <div>
          <div className="muted small" style={{ marginBottom: 6 }}>Overall score{rank ? ` · rank ${rank.current} of ${rosterPlayers.length}` : ""}</div>
          <div className="score-break">
            <div><b>{s.avgRating.toFixed(2)}</b><span>coach rating /5</span></div>
            <div><b>{s.avgTeam ? s.avgTeam.toFixed(2) : "—"}</b><span>team coordination /5</span></div>
            <div><b>{Math.round(s.attendancePct)}%</b><span>attendance</span></div>
            <div><b>{Math.round(s.punctualityPct)}%</b><span>punctuality</span></div>
            <div><b>{s.currentStreak}</b><span>session streak</span></div>
          </div>
        </div>
      </section>

      {s.matchDayMisses > 0 && <div className="note warn"><b>Match days matter.</b> You've missed {s.matchDayMisses} match-day session{s.matchDayMisses > 1 ? "s" : ""}, which takes {s.matchDayPenalty.toFixed(2)} off your coach rating.</div>}

      <div className="grid2">
        <DailySuggestions player={myPlayer} sport={sport} stats={s} />
        <div className="stack">
          <div className="counts">
            <Kpi label="present" value={s.counts.present} tone="var(--turf)" />
            <Kpi label="late" value={s.counts.late} tone="var(--amber)" />
            <Kpi label="absent" value={s.counts.absent} tone="var(--red)" />
            <Kpi label="left early" value={s.counts.escape} tone="var(--deep)" />
          </div>
          <section className="panel">
            <h2 className="h">Rate today's teammates</h2>
            {trainedToday
              ? <TeammateRatingForm teamId={myPlayer.teamId} playerId={myPlayer.id} date={today} teammates={mates} />
              : <p className="muted small">You can rate teammates on days the coach marks you present or late. Check back after practice.</p>}
          </section>
        </div>
      </div>

      <section className="panel">
        <h2 className="h">{sport.lineupName}</h2>
        <SelectionBoard sport={sport} formation={defaultFormationName(sport)} players={rosterPlayers} statsById={statsById} highlightId={myPlayer.id} />
      </section>

      <section className="panel">
        <p className="muted" style={{ marginTop: 0 }}>This is a view-only account. Rankings refresh after the coach saves a session.</p>
        {sync.last ? <p className="muted small">Last refreshed {new Date(sync.last).toLocaleTimeString()}.</p> : null}
        <div className="row wrap"><button className="btn primary" onClick={() => setView("rankings")}>Team rankings</button><button className="btn" onClick={() => setView("me")}>My full profile</button><button className="btn" onClick={refresh}>Refresh</button></div>
      </section>
    </div>
  );
}
