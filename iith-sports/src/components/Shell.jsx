import React, { useEffect } from "react";
import { useApp } from "../state/AppProvider";
import { APP_NAME, ROLES } from "../config/app";
import { teamLabel } from "../config/sports";
import { signOut } from "../authService";
import { SyncPill } from "./ui";

import Board from "../views/council/Board";
import Teams from "../views/council/Teams";
import Athletes from "../views/council/Athletes";
import Attendance from "../views/team/Attendance";
import Roster from "../views/team/Roster";
import Sessions from "../views/team/Sessions";
import Rankings from "../views/team/Rankings";
import Selection from "../views/team/Selection";
import MatchSim from "../views/team/MatchSim";
import Analytics from "../views/team/Analytics";
import Compare from "../views/team/Compare";
import Feed from "../views/team/Feed";
import Alumni from "../views/shared/Alumni";
import Profile from "../views/shared/Profile";
import InfoPages from "../views/shared/InfoPages";
import Manage from "../views/shared/Manage";
import PlayerHome from "../views/player/PlayerHome";

const COUNCIL = [["board", "Board"], ["teams", "Teams"], ["athletes", "Athletes"]];
const TEAM = [["attendance", "Attendance"], ["roster", "Roster"], ["sessions", "Sessions"], ["rankings", "Rankings"], ["selection", "Selection"], ["matchsim", "Match sim"], ["analytics", "Analytics"], ["compare", "Compare"], ["feed", "Feed"], ["alumni", "Alumni"]];
const TAIL = [["manage", "Manage"], ["more", "More"]];
const PLAYER = [["home", "My dashboard"], ["rankings", "Rankings"], ["compare", "Compare"], ["alumni", "Alumni"], ["me", "My profile"], ["more", "More"]];
const TEAM_VIEWS = new Set(TEAM.map(([k]) => k).concat("profile"));

export default function Shell() {
  const app = useApp();
  const { role, view, setView, sport, sync, refresh, profile, accessibleTeams, activeTeamId, setActiveTeamId, toast, loading } = app;

  const teamNav = TEAM.filter(([k]) => k !== "matchsim" || sport.sim);
  const nav = role === "player" ? PLAYER : role === "council" ? [...COUNCIL, ...teamNav, ...TAIL] : [...teamNav, ...TAIL];
  const showTeamPicker = role !== "player" && TEAM_VIEWS.has(view) && accessibleTeams.length > 0;

  // If the sport has no simulator, leave that view.
  useEffect(() => { if (view === "matchsim" && !sport.sim) setView("selection"); }, [view, sport, setView]);

  if (loading) return <div className="splash"><div className="spinner" />Loading team data…</div>;

  let body;
  if (role !== "player" && !activeTeamId && TEAM_VIEWS.has(view)) {
    body = <div className="empty"><div className="empty-title">No team assigned</div><div className="muted small">{role === "coach" ? "Ask the sports council to link your login to a team." : "Create a team in Teams first."}</div></div>;
  } else {
    switch (view) {
      case "board": body = <Board />; break;
      case "teams": body = <Teams />; break;
      case "athletes": body = <Athletes />; break;
      case "attendance": body = <Attendance />; break;
      case "roster": body = <Roster />; break;
      case "sessions": body = <Sessions />; break;
      case "rankings": body = <Rankings />; break;
      case "selection": body = <Selection />; break;
      case "matchsim": body = <MatchSim />; break;
      case "analytics": body = <Analytics />; break;
      case "compare": body = <Compare />; break;
      case "feed": body = <Feed />; break;
      case "alumni": body = <Alumni />; break;
      case "profile": body = <Profile />; break;
      case "me": body = <Profile own />; break;
      case "manage": body = <Manage />; break;
      case "more": body = <InfoPages />; break;
      default: body = role === "player" ? <PlayerHome /> : <Attendance />;
    }
    if (role === "player" && view === "home") body = <PlayerHome />;
  }

  const who = profile.display_name || (app.myPlayer && app.myPlayer.name) || app.user.email;

  return (
    <div className="app">
      <header className="top">
        <div className="top-in">
          <div className="mark">
            <span className="mark-box">IITH</span>
            <div><div className="mark-t">{APP_NAME}</div><div className="mark-s">{ROLES[role]} · {who}</div></div>
          </div>
          <SyncPill sync={sync} onClick={refresh} />
          <button className="topbtn" onClick={signOut}>Sign out</button>
        </div>
        <nav className="sub" aria-label="Sections">
          <div className="sub-in">
            {nav.map(([k, l], i) => (
              <React.Fragment key={k}>
                {role === "council" && (i === COUNCIL.length || i === COUNCIL.length + teamNav.length) && <span className="sub-sep" aria-hidden="true" />}
                <button className={"tab" + (view === k || (view === "profile" && k === "roster" && role !== "player") ? " on" : "")} onClick={() => setView(k)}>{l}</button>
              </React.Fragment>
            ))}
          </div>
        </nav>
        {showTeamPicker && (
          <div className="teambar">
            <div className="teambar-in">
              <label className="small" htmlFor="team-pick">Team</label>
              <select id="team-pick" className="field" value={activeTeamId || ""} onChange={(e) => setActiveTeamId(e.target.value)}>
                {accessibleTeams.map((t) => <option key={t.id} value={t.id}>{teamLabel(t)}{t.active ? "" : " (inactive)"}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>
      <main className="main">{body}</main>
      <nav className="bottom" aria-label="Sections">
        {nav.map(([k, l]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>)}
      </nav>
      <div className={"toast" + (toast ? " show" : "")} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
