import React, { useMemo } from "react";
import { useApp } from "../../state/AppProvider";
import { SEASON_START } from "../../config/app";
import { prettyDate } from "../../lib/dates";
import { buildFeed, earnedBadges } from "../../lib/stats";
import TeamHeader from "../../components/TeamHeader";
import { Empty, Jersey } from "../../components/ui";

export default function Feed() {
  const { rosterPlayers, statsById, sport } = useApp();
  const events = useMemo(() => buildFeed(rosterPlayers, statsById, sport, SEASON_START), [rosterPlayers, statsById, sport]);
  const wall = rosterPlayers.map((p) => ({ p, badges: earnedBadges(p, statsById[p.id]) })).filter((x) => x.badges.length).sort((a, b) => b.badges.length - a.badges.length).slice(0, 8);
  return (
    <div className="stack">
      <TeamHeader title="Team pulse" />
      {wall.length > 0 && (
        <section className="panel">
          <h3 className="h">Wall of fame</h3>
          <div className="wall">{wall.map(({ p, badges }) => (
            <span className="wall-item" key={p.id}><Jersey n={p.jersey} size="xs" /><b>{p.name.split(" ")[0]}</b>{badges.map((b) => <span key={b.id} className="wall-mono" style={{ background: b.tone }} title={b.label}>{b.mono}</span>)}</span>
          ))}</div>
        </section>
      )}
      {events.length === 0 ? <Empty title="No activity yet" hint="Mark attendance and add ratings — updates show up here." /> : (
        <div className="stack" style={{ gap: 8 }}>
          {events.map((e, i) => (
            <div className="feed-item" key={i}>
              <span className="feed-ic" style={{ color: e.tone, background: e.tone + "1a" }}>{e.kind === "rating" ? (e.up ? "▲" : "▼") : e.mono}</span>
              <div><div className="feed-text">{e.text}</div><div className="muted small">{prettyDate(e.date)}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
