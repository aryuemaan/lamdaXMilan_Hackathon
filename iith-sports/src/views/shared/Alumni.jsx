import React from "react";
import { useApp } from "../../state/AppProvider";
import { Empty, Jersey } from "../../components/ui";

export default function Alumni() {
  const { teamPlayers, openProfile, activeTeam, sport } = useApp();
  const grads = teamPlayers.filter((p) => p.graduated).sort((a, b) => (b.graduatedAt || "").localeCompare(a.graduatedAt || "") || (a.jersey ?? 0) - (b.jersey ?? 0));
  return (
    <div className="stack">
      <div><h1 className="h">Alumni · {grads.length}</h1><p className="lede">Graduated {sport.name} {activeTeam ? activeTeam.category.toLowerCase() : ""} athletes. They're out of sessions and rankings, but their history is kept.</p></div>
      {grads.length === 0 ? <Empty title="No alumni yet" hint="Open an athlete's profile and choose Move to Alumni when they graduate." /> : (
        <div className="roster">
          {grads.map((p) => (
            <button className="pcard" key={p.id} onClick={() => openProfile(p.id)}>
              <span className="who"><Jersey n={p.jersey} /><span><b>{p.name}</b><span className="muted small">{p.position} · {p.year} {p.department}</span></span></span>
              {p.graduatedAt && <span className="muted small">Graduated {new Date(p.graduatedAt).toLocaleDateString()}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
