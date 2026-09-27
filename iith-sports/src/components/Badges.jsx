import React from "react";
import { computeBadges, earnedBadges } from "../lib/stats";

export default function Badges({ player, stats, showLocked }) {
  const list = showLocked ? computeBadges(player, stats) : earnedBadges(player, stats);
  if (!list.length) return <div className="muted small">No badges yet — attend and get rated to earn some.</div>;
  return (
    <div className="badge-wrap">
      {list.map((b) => (
        <span key={b.id} className={"pbadge" + (b.earned ? "" : " locked")} title={b.desc}>
          <span className="pbadge-mono" style={b.earned ? { background: b.tone } : undefined}>{b.mono}</span>{b.label}
        </span>
      ))}
    </div>
  );
}
