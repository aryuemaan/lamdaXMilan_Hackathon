import React, { useMemo } from "react";
import { autoPickLineup } from "../lib/stats";
import { Jersey } from "./ui";

export default function SelectionBoard({ sport, formation, players, statsById, highlightId, onOpen }) {
  const sel = useMemo(() => autoPickLineup(sport, formation, players, statsById), [sport, formation, players, statsById]);
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const inXI = new Set(sel.slots.map((s) => s.playerId));
  const onBench = new Set(sel.bench.map((b) => b.p.id));
  const status = highlightId ? (inXI.has(highlightId) ? "in" : onBench.has(highlightId) ? "bench" : "out") : null;

  const chip = (p, fit, off, key) => (
    <button key={key} className={"sel-pl" + (off ? " off" : "") + (p.id === highlightId ? " me" : "")} onClick={() => onOpen && onOpen(p.id)} title={off ? "Filling a slot outside their listed role" : ""}>
      <Jersey n={p.jersey} size="xs" />{p.name}<span className="rl">{p.position}</span><span className="f">{fit}</span>
    </button>
  );

  return (
    <div>
      {sel.groups.map((g, gi) => {
        const picks = sel.slots.filter((s) => s.groupIdx === gi);
        return (
          <div className="sel-line" key={gi}>
            <div className="lbl">{g.label}</div>
            <div>{picks.some((s) => s.playerId) ? picks.map((s) => (s.playerId ? chip(byId[s.playerId], s.fit, s.off, s.id) : <span key={s.id} className="sel-pl empty">Open slot</span>)) : <span className="muted small">No eligible athlete</span>}</div>
          </div>
        );
      })}
      {sel.benchN > 0 && (
        <div className="sel-line">
          <div className="lbl">Reserves · {sel.benchN}</div>
          <div>{sel.bench.length ? sel.bench.map((b) => chip(b.p, b.score, false, b.p.id)) : <span className="muted small">No reserves yet</span>}</div>
        </div>
      )}
      {status && (
        <div className={"note " + (status === "in" ? "info" : status === "bench" ? "warn" : "")} style={{ marginTop: 10 }}>
          {status === "in" && `You're in the ${sport.lineupName} right now.`}
          {status === "bench" && "You're in the squad as a reserve."}
          {status === "out" && "Not in the squad yet — attendance, punctuality, streaks and strong coach and team ratings move you up."}
        </div>
      )}
    </div>
  );
}
