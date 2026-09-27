import React, { useState } from "react";
import { useApp } from "../../state/AppProvider";
import { defaultFormationName, lineupSize } from "../../config/sports";
import TeamHeader from "../../components/TeamHeader";
import SelectionBoard from "../../components/SelectionBoard";

export default function Selection() {
  const { sport, rosterPlayers, statsById, openProfile, activeTeamId } = useApp();
  const [formation, setFormation] = useState(null);
  const f = formation && sport.formations[formation] ? formation : defaultFormationName(sport);
  const names = Object.keys(sport.formations);
  return (
    <div className="stack" key={activeTeamId}>
      <TeamHeader title="Selection" />
      <section className="panel">
        <div className="row between wrap">
          <h2 className="h">{sport.lineupName}</h2>
          {names.length > 1 && (
            <label className="row small">Shape
              <select className="field" style={{ width: "auto" }} value={f} onChange={(e) => setFormation(e.target.value)}>{names.map((n) => <option key={n}>{n}</option>)}</select>
            </label>
          )}
        </div>
        <p className="muted small">Picked automatically from live scores and the current attendance streak. {lineupSize(sport, f)} starters, squad of {sport.squad}.</p>
        <SelectionBoard sport={sport} formation={f} players={rosterPlayers} statsById={statsById} onOpen={openProfile} />
      </section>
      <p className="muted small">A dashed outline means the athlete fills a slot outside their listed role, so their fit is reduced by 10%. Goalkeepers are never swapped with outfield players. The selection updates after every session the coach saves.</p>
    </div>
  );
}
