import React from "react";
import { ratingTrend } from "../lib/stats";

export default function RatingChart({ player, stats, sport }) {
  const pts = ratingTrend(player, stats, sport);
  if (pts.length < 2) return <div className="muted small">A trend appears after two rated sessions.</div>;
  const W = 300, H = 90, pad = 6;
  const xs = (i) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const ys = (v) => H - pad - (v / 5) * (H - 2 * pad);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.val).toFixed(1)}`).join(" ");
  const area = `${line} L${xs(pts.length - 1).toFixed(1)},${H - pad} L${xs(0).toFixed(1)},${H - pad} Z`;
  return (
    <svg className="rchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Coach rating trend, now ${pts[pts.length - 1].val.toFixed(2)}`}>
      {[1, 2, 3, 4].map((g) => <line key={g} x1={pad} x2={W - pad} y1={ys(g)} y2={ys(g)} stroke="var(--line)" strokeWidth="1" />)}
      <path d={area} fill="var(--signal-soft)" />
      <path d={line} fill="none" stroke="var(--signal)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={xs(i)} cy={ys(p.val)} r="2.4" fill="var(--signal)" />)}
    </svg>
  );
}
