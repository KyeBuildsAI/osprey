"use client";

import { useState } from "react";
import {
  demoAgents,
  demoCoursesOfAction,
  demoEvidence,
  demoIncident,
} from "@/lib/incident";

export default function Home() {
  const [mapLayer, setMapLayer] = useState<"Risk" | "Impact" | "Assets">("Risk");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("COA-02");

  return (
    <main className="command-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Osprey home">
          <span className="brand-glyph">O</span>
          <span>OSPREY</span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <a className="nav-item nav-active" href="#command"><span>01</span>Command</a>
          <a className="nav-item" href="#intelligence"><span>02</span>Intelligence</a>
          <a className="nav-item" href="#actions"><span>03</span>Actions</a>
          <a className="nav-item" href="#audit"><span>04</span>Audit</a>
        </nav>

        <div className="sidebar-footer">
          <div className="connection"><i />All systems nominal</div>
          <div className="user-block">
            <span className="avatar">KH</span>
            <span><strong>Kye Hussain</strong><small>Incident commander</small></span>
          </div>
        </div>
      </aside>

      <section className="workspace" id="command">
        <header className="topbar">
          <div className="incident-id"><span>{demoIncident.id}</span><i />ACTIVE INCIDENT</div>
          <div className="topbar-meta"><span>Last sync 10:44:18</span><button aria-label="Open notifications">3</button></div>
        </header>

        <div className="incident-heading">
          <div>
            <p className="eyebrow">{demoIncident.hazard.toUpperCase()} · {demoIncident.region.toUpperCase()}</p>
            <h1>{demoIncident.name}</h1>
            <p className="heading-copy">A live operational picture assembled from specialist agents, verified sources and human decisions.</p>
          </div>
          <div className="severity-card">
            <span>SEVERITY</span>
            <strong>Major</strong>
            <small>Escalated 32 min ago</small>
          </div>
        </div>

        <section className="metric-row" aria-label="Current incident summary">
          <article><span>PRIMARY RISK</span><strong>River flooding</strong><small>Confidence 87%</small></article>
          <article><span>PEOPLE EXPOSED</span><strong>14,280</strong><small>Across 6 priority zones</small></article>
          <article><span>CRITICAL WINDOW</span><strong>2h 16m</strong><small>Peak level forecast</small></article>
          <article><span>EVIDENCE</span><strong>38 items</strong><small>7 added this hour</small></article>
        </section>

        <div className="command-grid">
          <section className="map-card" aria-label="Operational map of incident area">
            <div className="panel-header">
              <div><span className="panel-kicker">OPERATIONAL MAP</span><strong>Priority exposure zones</strong></div>
              <div className="map-controls">
                {(["Risk", "Impact", "Assets"] as const).map((layer) => (
                  <button
                    className={mapLayer === layer ? "selected" : ""}
                    key={layer}
                    onClick={() => setMapLayer(layer)}
                    aria-pressed={mapLayer === layer}
                  >
                    {layer}
                  </button>
                ))}
              </div>
            </div>
            <div className="map-surface">
              <div className="map-grid-lines" />
              <div className="terrain terrain-one" />
              <div className="terrain terrain-two" />
              <div className="water-line water-one" />
              <div className="water-line water-two" />
              <div className="risk-area risk-high"><span>EDEN</span></div>
              <div className="risk-area risk-medium"><span>LOWTHER</span></div>
              <div className="place place-penrith"><i /><strong>Penrith</strong><small>High exposure</small></div>
              <div className="place place-carlisle"><i /><strong>Carlisle</strong><small>Monitoring</small></div>
              <div className="place place-appleby"><i /><strong>Appleby</strong><small>Rising rapidly</small></div>
              <div className="map-time"><span>{mapLayer.toUpperCase()} LAYER · FORECAST VALID</span><strong>16 AUG · 12:00–18:00</strong></div>
              <div className="map-legend"><span><i className="legend-high" />High</span><span><i className="legend-medium" />Elevated</span><span><i className="legend-river" />River</span></div>
            </div>
          </section>

          <aside className="agent-panel" id="intelligence">
            <div className="panel-header">
              <div><span className="panel-kicker">AGENT TEAM</span><strong>4 specialists</strong></div>
              <span className="live-pulse"><i />LIVE</span>
            </div>
            <div className="agent-list">
              {demoAgents.map((agent, index) => (
                <article className="agent-row" key={agent.name}>
                  <span className={`agent-number ${agent.state === "working" ? "active" : agent.state}`}>0{index + 1}</span>
                  <div><strong>{agent.name}</strong><small>{agent.remit}</small></div>
                  <span className={`agent-status ${agent.state === "working" ? "active" : agent.state}`}>{agent.status}</span>
                </article>
              ))}
            </div>
            <div className="decision-card">
              <span className="decision-label">NEXT DECISION</span>
              <h2>Protect three exposed care facilities</h2>
              <p>The operations agent is preparing response options from 12 verified findings.</p>
              <button onClick={() => setOptionsOpen(true)}>Review options <span>→</span></button>
            </div>
          </aside>
        </div>

        <section className="signal-panel" id="audit">
          <div className="panel-header signal-title">
            <div><span className="panel-kicker">LATEST SIGNALS</span><strong>What changed</strong></div>
            <button>View full timeline</button>
          </div>
          <div className="signal-list">
            {demoEvidence.map((evidence) => (
              <article className="signal-row" key={evidence.id}>
                <time>{evidence.observedAt}</time><i />
                <div><strong>{evidence.title}</strong><p>{evidence.summary}</p></div>
                <span>{evidence.source}</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      {optionsOpen && (
        <div className="decision-overlay" role="presentation">
          <section
            className="decision-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
          >
            <header>
              <div>
                <span className="panel-kicker">HUMAN DECISION REQUIRED</span>
                <h2 id="decision-title">Protect exposed care facilities</h2>
                <p>Review the operational choices. No external action will occur in this demonstration.</p>
              </div>
              <button className="close-button" onClick={() => setOptionsOpen(false)} aria-label="Close options">×</button>
            </header>
            <div className="option-list">
              {demoCoursesOfAction.map((option) => (
                <button
                  className={`option-card ${selectedOption === option.id ? "option-selected" : ""}`}
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  aria-pressed={selectedOption === option.id}
                >
                  <span className={`posture posture-${option.posture}`}>{option.posture}</span>
                  <strong>{option.title}</strong>
                  <p>{option.summary}</p>
                  <dl>
                    <div><dt>Benefit</dt><dd>{option.benefit}</dd></div>
                    <div><dt>Trade-off</dt><dd>{option.tradeoff}</dd></div>
                  </dl>
                  <small>{option.evidenceCount} supporting evidence items</small>
                </button>
              ))}
            </div>
            <footer>
              <p><strong>Prototype boundary:</strong> selecting an option records no real-world action.</p>
              <button className="secondary-action" onClick={() => setOptionsOpen(false)}>Request more analysis</button>
              <button className="primary-action" onClick={() => setOptionsOpen(false)}>Select for review</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
