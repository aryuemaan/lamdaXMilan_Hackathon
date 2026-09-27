import React, { useMemo, useState } from "react";
import { useApp } from "../../state/AppProvider";
import { ATTENDANCE_TARGET, MEET_DATE, MEET_NAME, SEASON_START, SESSION_SLOTS, SLOT_LABEL } from "../../config/app";
import { getSport, teamLabel } from "../../config/sports";
import { addDays, daysBetween, isMatchDay, parseDate, prettyDate, todayInSeason, weekStart, WD_NAMES, weekdayIdx } from "../../lib/dates";
import { sessionCell, teamSummary } from "../../lib/stats";
import { SportBadge, Empty } from "../../components/ui";

const bucket = (pct) => (pct < 50 ? "b0" : pct < 70 ? "b1" : pct < 85 ? "b2" : "b3");

export default function Board() {
  const { accessibleTeams, players, sessions, statsById, openTeam, openProfile, setView } = useApp();
  const today = todayInSeason();
  const [week, setWeek] = useState(weekStart(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const teams = accessibleTeams.filter((t) => t.active);

  const byTeam = useMemo(() => {
    const m = {};
    teams.forEach((t) => {
      const tp = players.filter((p) => p.teamId === t.id && p.active && !p.graduated);
      m[t.id] = { tp, sum: teamSummary(t, getSport(t.sport), tp, sessions[t.id] || {}, statsById, today) };
    });
    return m;
  }, [teams, players, sessions, statsById, today]);

  const athletes = players.filter((p) => p.active && !p.graduated && byTeam[p.teamId]);
  const allStats = athletes.map((p) => statsById[p.id]).filter(Boolean);
  const marked = allStats.reduce((a, s) => a + s.markedSessions, 0);
  const attended = allStats.reduce((a, s) => a + s.attended, 0);
  let sessionsLogged = 0;
  teams.forEach((t) => Object.values(sessions[t.id] || {}).forEach((d) => SESSION_SLOTS.forEach((sl) => { if (d[sl] && Object.keys(d[sl].records || {}).length) sessionsLogged++; })));

  const alerts = [];
  teams.forEach((t) => {
    const s = byTeam[t.id].sum;
    if (s.morningStarted && s.pendingToday > 0) alerts.push({ tone: "var(--amber)", text: <><b>{teamLabel(t)}</b>: this morning's register has {s.pendingToday} athlete{s.pendingToday > 1 ? "s" : ""} unmarked.</>, action: () => openTeam(t.id, today, "morning"), label: "Open register" });
  });
  teams.forEach((t) => {
    const s = byTeam[t.id].sum;
    if (s.attPct != null && s.markedTotal >= 10 && s.attPct < ATTENDANCE_TARGET) alerts.push({ tone: "var(--red)", text: <><b>{teamLabel(t)}</b> attendance is {s.attPct}% this season, below the {ATTENDANCE_TARGET}% target.</>, action: () => openTeam(t.id), label: "View team" });
  });
  const notStarted = teams.filter((t) => !byTeam[t.id].sum.morningStarted && !(sessions[t.id] && sessions[t.id][today] && sessions[t.id][today].morning.noPractice));
  if (notStarted.length) alerts.push({ tone: "var(--muted)", text: <>No morning register yet today for {notStarted.length} team{notStarted.length > 1 ? "s" : ""}: {notStarted.map((t) => teamLabel(t)).join(", ")}.</> });
  const mdHeavy = athletes.filter((p) => (statsById[p.id] || {}).matchDayMisses >= 2);
  if (mdHeavy.length) alerts.push({ tone: "var(--red)", text: <>{mdHeavy.length} athlete{mdHeavy.length > 1 ? "s have" : " has"} missed 2 or more match-day sessions.</>, action: () => setView("athletes"), label: "See athletes" });
  const injured = athletes.filter((p) => p.health);
  if (injured.length) alerts.push({ tone: "var(--violet)", text: <>{injured.length} athlete{injured.length > 1 ? "s carry" : " carries"} a health note across {new Set(injured.map((p) => p.teamId)).size} team{new Set(injured.map((p) => p.teamId)).size > 1 ? "s" : ""}.</> });

  const ready = teams.map((t) => ({ t, s: byTeam[t.id].sum, sport: getSport(t.sport) })).sort((a, b) => b.s.readiness - a.s.readiness);
  const top = athletes.map((p) => ({ p, s: statsById[p.id] })).filter((x) => x.s && x.s.markedSessions).sort((a, b) => b.s.overall - a.s.overall).slice(0, 10);
  const daysLeft = daysBetween(today, MEET_DATE);

  if (!teams.length) return <Empty title="No active teams yet" hint="Create teams in the Teams tab to start tracking." />;

  return (
    <div className="stack">
      <section className="board">
        <div className="board-head">
          <div>
            <div className="board-title">InterIIT readiness board</div>
            <div className="board-sub">Attendance for every team and session. Tap a cell to open that register.</div>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <div className="weeknav">
              <button onClick={() => setWeek(addDays(week, -7))} disabled={addDays(week, 6) < SEASON_START} aria-label="Previous week">‹</button>
              <span>{prettyDate(week, false)} – {prettyDate(addDays(week, 6), false)}</span>
              <button onClick={() => setWeek(addDays(week, 7))} disabled={week >= weekStart(today)} aria-label="Next week">›</button>
            </div>
            {daysLeft >= 0 && <div className="clock"><b>{daysLeft}</b><span>days to the {MEET_NAME}</span></div>}
          </div>
        </div>
        <div className="hm-wrap">
          <table className="hm">
            <thead>
              <tr><th />{days.map((d) => <th key={d} colSpan={2} className={"day" + (isMatchDay(d) ? " md" : "")}>{WD_NAMES[weekdayIdx(d)].slice(0, 3)} {parseDate(d).getDate()}</th>)}</tr>
              <tr><th />{days.map((d) => SESSION_SLOTS.map((sl) => <th key={d + sl}>{sl === "morning" ? "AM" : "PM"}</th>))}</tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const sport = getSport(t.sport);
                const squad = byTeam[t.id].tp.length;
                return (
                  <tr key={t.id}>
                    <td className="team"><button onClick={() => openTeam(t.id)}><SportBadge sport={sport} /><span>{sport.name} <small>{t.category}</small></span></button></td>
                    {days.map((d) => SESSION_SLOTS.map((sl) => {
                      const future = d > today;
                      const c = future ? { kind: "future" } : sessionCell(sessions[t.id], d, sl, squad);
                      const cls = c.kind === "val" ? bucket(c.pct) + (c.partial ? " part" : "") : c.kind;
                      const label = c.kind === "val" ? c.pct : c.kind === "np" ? "off" : c.kind === "future" ? "" : "–";
                      const title = c.kind === "val" ? `${c.pct}% attended (${c.n} of ${squad} marked)` : c.kind === "np" ? `No practice${c.reason ? ": " + c.reason : ""}` : c.kind === "future" ? "Upcoming" : "Not marked";
                      return (
                        <td key={d + sl} className="c">
                          <button className={cls} disabled={future} title={`${teamLabel(t)} · ${prettyDate(d, false)} ${SLOT_LABEL[sl]} — ${title}`} onClick={() => openTeam(t.id, d, sl)}>{label}</button>
                        </td>
                      );
                    }))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="legend">
          <span><i style={{ background: "#3fa46d" }} />85%+</span><span><i style={{ background: "#a9d8b7" }} />70–84%</span><span><i style={{ background: "#f0c86b" }} />50–69%</span><span><i style={{ background: "#e38a7c" }} />Below 50%</span>
          <span><i className="lg-np" />No practice</span><span><i className="lg-pend" />Not marked</span><span><i className="lg-part" />Register incomplete</span>
        </div>
      </section>

      <div className="figures">
        <div className="fig"><b>{athletes.length}</b><span>athletes</span></div>
        <div className="fig"><b>{teams.length}</b><span>active teams</span></div>
        <div className="fig"><b>{marked ? Math.round((attended / marked) * 100) + "%" : "—"}</b><span>season attendance</span></div>
        <div className="fig"><b>{sessionsLogged}</b><span>sessions logged</span></div>
        <div className="fig"><b>{athletes.filter((p) => p.gender === "F").length}</b><span>women athletes</span></div>
      </div>

      <div className="grid2">
        <section className="panel">
          <h2 className="h">Needs attention</h2>
          {alerts.length === 0 ? <p className="muted">Nothing needs attention right now.</p> : alerts.map((a, i) => (
            <div className="alert" key={i}><span className="dot" style={{ background: a.tone }} /><p>{a.text}</p>{a.action && <button className="btn sm" onClick={a.action}>{a.label}</button>}</div>
          ))}
        </section>
        <section className="panel">
          <div className="row between wrap"><h2 className="h">Team readiness</h2><span className="muted small">Average score of each first-choice line-up</span></div>
          {ready.map(({ t, s, sport }) => (
            <button className="rbar" key={t.id} onClick={() => openTeam(t.id)}>
              <SportBadge sport={sport} />
              <span className="grow"><span className="name"><span>{sport.name} · {t.category}</span><span className="muted small">{s.attPct != null ? `${s.attPct}% att.` : "no data"}</span></span>
                <span className="track"><i style={{ width: s.readiness + "%", background: sport.color }} /></span></span>
              <span className="v">{s.readiness}</span>
            </button>
          ))}
        </section>
      </div>

      <section>
        <div className="row between wrap"><h2 className="h">Top athletes across sports</h2><button className="btn sm" onClick={() => setView("athletes")}>See all athletes</button></div>
        {top.length === 0 ? <Empty title="No sessions marked yet" hint="Rankings appear once coaches start marking attendance." /> : (
          <div className="tw" style={{ marginTop: 8 }}>
            <table className="t">
              <thead><tr><th className="r">#</th><th>Athlete</th><th>Team</th><th>Role</th><th className="r">Overall</th><th className="r">Coach</th><th className="r">Att.</th><th className="r">Streak</th></tr></thead>
              <tbody>
                {top.map(({ p, s }, i) => {
                  const t = accessibleTeams.find((x) => x.id === p.teamId); const sport = getSport(t.sport);
                  return (
                    <tr key={p.id} className={i === 0 ? "first" : ""}>
                      <td className="r">{i + 1}</td>
                      <td><button className="link" onClick={() => openProfile(p.id)}>{p.name}</button></td>
                      <td><SportBadge sport={sport} /> {sport.name} {t.category}</td>
                      <td>{p.position}</td>
                      <td className="r big">{s.overall}</td><td className="r">{s.avgRating.toFixed(2)}</td><td className="r">{Math.round(s.attendancePct)}%</td><td className="r">{s.currentStreak}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
