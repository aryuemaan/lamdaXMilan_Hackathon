import React, { useMemo, useState } from "react";
import { useApp } from "../../state/AppProvider";
import { defaultFormationName, formationGroups } from "../../config/sports";
import { autoPickSlots, lineupSlots, lineupStrength, playerFit, simulateMatch } from "../../lib/stats";
import TeamHeader from "../../components/TeamHeader";
import { Jersey, Modal, Tabs } from "../../components/ui";

export default function MatchSim() {
  const { sport, rosterPlayers, statsById, activeTeamId } = useApp();
  return <Sim key={activeTeamId} sport={sport} players={rosterPlayers} statsById={statsById} />;
}

function Sim({ sport, players, statsById }) {
  const [formation, setFormation] = useState(defaultFormationName(sport));
  const groups = formationGroups(sport, formation);
  const slots = useMemo(() => lineupSlots(groups), [groups]);
  const [assign, setAssign] = useState({});
  const [pick, setPick] = useState(null);
  const [oppMode, setOppMode] = useState("average");
  const [opp, setOpp] = useState({ attack: 60, defense: 60 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const filled = slots.map((s) => ({ ...s, playerId: assign[s.id] || null }));
  const strength = useMemo(() => lineupStrength(filled, players, statsById, sport), [assign, slots, players, statsById, sport]); // eslint-disable-line react-hooks/exhaustive-deps
  const used = new Set(Object.values(assign).filter(Boolean));
  const minFill = Math.ceil(slots.length / 2);

  const autoPick = () => { const next = {}; autoPickSlots(sport, groups, players, statsById).forEach((s) => { if (s.playerId) next[s.id] = s.playerId; }); setAssign(next); setResult(null); };
  const choose = (pid) => { setAssign((a) => { const n = { ...a }; Object.keys(n).forEach((k) => { if (n[k] === pid) delete n[k]; }); if (pid) n[pick.id] = pid; else delete n[pick.id]; return n; }); setPick(null); setResult(null); };
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const r = simulateMatch(strength, oppMode === "average" ? { attack: 60, defense: 60 } : opp, sport.sim.base, 10000);
      const motm = strength.per.slice().sort((a, b) => b.fit - a.fit)[0];
      setResult({ ...r, motm }); setBusy(false);
    }, 30);
  };

  return (
    <div className="stack">
      <TeamHeader title="Match simulator" />
      <section className="panel">
        <div className="row between wrap">
          <label className="row small">Shape
            <select className="field" style={{ width: "auto" }} value={formation} onChange={(e) => { setFormation(e.target.value); setAssign({}); setResult(null); }}>{Object.keys(sport.formations).map((f) => <option key={f}>{f}</option>)}</select>
          </label>
          <div className="row"><button className="btn primary" onClick={autoPick}>Pick the strongest line-up</button><button className="btn" onClick={() => { setAssign({}); setResult(null); }}>Clear</button></div>
        </div>
        <div className="pitch" style={{ "--c": sport.color }}>
          {groups.map((g, gi) => (
            <div className="pitch-row" key={gi}>
              <span className="pitch-lbl">{g.label}</span>
              <div className="pitch-slots">
                {filled.filter((s) => s.groupIdx === gi).map((s) => {
                  const p = s.playerId ? players.find((x) => x.id === s.playerId) : null;
                  return (
                    <button key={s.id} className={"slot" + (p ? " filled" : "")} onClick={() => setPick(s)}>
                      {p ? <><Jersey n={p.jersey} size="xs" /><span className="slot-name">{p.name.split(" ")[0]}</span><span className="slot-fit">{playerFit(p, statsById[p.id], s, sport)}</span></> : <span className="muted small">Add</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="stack" style={{ gap: 6, marginTop: 12 }}>
          {[["Overall", strength.overall], ["Attack", strength.attack], ["Defence", strength.defense]].map(([l, v]) => (
            <div className="bar" key={l}><span>{l}</span><span className="track"><i style={{ width: v + "%" }} /></span><b>{v}</b></div>
          ))}
          <span className="muted small">{strength.count} of {slots.length} places filled.</span>
        </div>
      </section>

      <section className="panel">
        <h3 className="h">Opponent</h3>
        <Tabs items={[["average", "Average opponent"], ["custom", "Custom opponent"]]} value={oppMode} onChange={setOppMode} />
        {oppMode === "custom" && (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <label className="lbl">Attack: {opp.attack}<input type="range" min="20" max="100" value={opp.attack} onChange={(e) => setOpp({ ...opp, attack: Number(e.target.value) })} /></label>
            <label className="lbl">Defence: {opp.defense}<input type="range" min="20" max="100" value={opp.defense} onChange={(e) => setOpp({ ...opp, defense: Number(e.target.value) })} /></label>
          </div>
        )}
        <button className="btn primary" style={{ marginTop: 12 }} disabled={busy || strength.count < minFill} onClick={run}>{busy ? "Simulating…" : "Simulate 10,000 matches"}</button>
        {strength.count < minFill && <div className="muted small">Fill at least {minFill} places to simulate.</div>}
      </section>

      {result && (
        <section className="panel">
          <div className="probs">
            <div className="prob win"><b>{result.winPct}%</b><span>Win</span></div>
            <div className="prob draw"><b>{result.drawPct}%</b><span>Draw</span></div>
            <div className="prob loss"><b>{result.lossPct}%</b><span>Loss</span></div>
          </div>
          <div className="probbar"><span style={{ width: result.winPct + "%", background: "var(--turf)" }} /><span style={{ width: result.drawPct + "%", background: "var(--amber)" }} /><span style={{ width: result.lossPct + "%", background: "var(--red)" }} /></div>
          <div className="figs3">
            <div><b>{result.expGD > 0 ? "+" : ""}{result.expGD.toFixed(2)}</b><span>expected goal difference</span></div>
            <div><b>{result.motm ? result.motm.player.name : "—"}</b><span>player of the match</span></div>
            <div><b>{result.lamA.toFixed(1)} – {result.lamB.toFixed(1)}</b><span>expected goals (us – them)</span></div>
          </div>
        </section>
      )}

      {pick && (
        <Modal title={`Choose for ${pick.label}`} onClose={() => setPick(null)}
          actions={<>{assign[pick.id] && <button className="btn" onClick={() => choose(null)}>Remove</button>}<button className="btn" onClick={() => setPick(null)}>Close</button></>}>
          <div className="pick-list">
            {players.map((p) => ({ p, fit: playerFit(p, statsById[p.id], pick, sport) })).sort((a, b) => b.fit - a.fit).map(({ p, fit }) => (
              <button key={p.id} className={"pick-row" + (used.has(p.id) ? " used" : "")} onClick={() => choose(p.id)}>
                <Jersey n={p.jersey} size="xs" /><span className="grow">{p.name}{used.has(p.id) ? " (in line-up — will move)" : ""}</span><span className="muted small">{p.position}</span><b className="fit">{fit}</b>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
