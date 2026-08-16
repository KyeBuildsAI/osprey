"use client";

import { useMemo, useState } from "react";
import {
  demoActionChain,
  demoAgents,
  demoConnectors,
  demoCoursesOfAction,
  demoEvidence,
  demoHazardViews,
  demoIncident,
  demoOperationalMeasures,
} from "@/lib/incident";

const exposureQueries = {
  Radius: "6 priority zones · 14,280 people",
  Polygon: "3 care facilities · 2 access routes",
  Assets: "11 critical assets · 4 owners",
} as const;

type ExposureQuery = keyof typeof exposureQueries;

export default function Home() {
  const [mapLayer, setMapLayer] = useState<"Risk" | "Impact" | "Assets">("Risk");
  const [activeHazardId, setActiveHazardId] = useState("flood");
  const [exposureQuery, setExposureQuery] = useState<ExposureQuery>("Polygon");
  const [forecastHour, setForecastHour] = useState(14);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("COA-02");
  const [packetStatus, setPacketStatus] = useState<"draft" | "queued">("draft");

  const activeHazard = useMemo(
    () => demoHazardViews.find((hazard) => hazard.id === activeHazardId) ?? demoHazardViews[0],
    [activeHazardId],
  );

  const selectedCourse = useMemo(
    () => demoCoursesOfAction.find((option) => option.id === selectedOption) ?? demoCoursesOfAction[1],
    [selectedOption],
  );

  const queueDecisionPacket = () => {
    setPacketStatus("queued");
    setOptionsOpen(false);
  };

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
          <div className="connection"><i />Source mesh operational</div>
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

        <section className="hazard-strip" aria-label="Hazard-specific operational views">
          <span className="strip-label">OPERATIONAL VIEW</span>
          <div className="hazard-tabs">
            {demoHazardViews.map((hazard) => (
              <button
                className={`hazard-tab hazard-${hazard.tone} ${activeHazard.id === hazard.id ? "hazard-selected" : ""}`}
                key={hazard.id}
                onClick={() => setActiveHazardId(hazard.id)}
                aria-pressed={activeHazard.id === hazard.id}
              >
                <span>{hazard.label}</span>
                <small>{hazard.status}</small>
              </button>
            ))}
          </div>
          <div className="compound-status"><i />Compound incident · 3 active hazards</div>
        </section>

        <div className="incident-heading">
          <div>
            <p className="eyebrow">{activeHazard.label.toUpperCase()} OPERATIONS · {demoIncident.region.toUpperCase()}</p>
            <h1>{demoIncident.name}</h1>
            <p className="heading-copy">Evidence-led incident command: specialist agents turn live operational data into challenged decisions, approved actions and measurable outcomes.</p>
          </div>
          <div className="severity-card">
            <span>{activeHazard.label.toUpperCase()} POSTURE</span>
            <strong>{activeHazard.status}</strong>
            <small>{activeHazard.focus}</small>
          </div>
        </div>

        <section className="metric-row" aria-label="Current incident summary">
          <article><span>OPERATIONAL FOCUS</span><strong>{activeHazard.focus}</strong><small>{activeHazard.label} specialist view</small></article>
          <article><span>EXPOSURE QUERY</span><strong>{activeHazard.exposed}</strong><small>{exposureQuery} selection active</small></article>
          <article><span>FORECAST WINDOW</span><strong>{forecastHour}:00</strong><small>Ensemble confidence 87%</small></article>
          <article><span>DECISION READINESS</span><strong>12 / 14</strong><small>Verified findings in packet</small></article>
        </section>

        <section className="connector-strip" aria-label="Connected operational data sources">
          <div className="connector-intro"><span>LIVE SOURCE MESH</span><strong>5 operational connectors</strong></div>
          {demoConnectors.map((connector) => (
            <article className="connector" key={connector.name}>
              <i className={`connector-${connector.state}`} />
              <div><strong>{connector.name}</strong><small>{connector.detail}</small></div>
              <time>{connector.freshness}</time>
            </article>
          ))}
        </section>

        <div className="command-grid">
          <section className="map-card" aria-label="Operational map of incident area">
            <div className="panel-header">
              <div><span className="panel-kicker">{activeHazard.label.toUpperCase()} OPERATIONAL MAP</span><strong>Exposure and forecast workspace</strong></div>
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
            <div className={`map-surface map-hour-${forecastHour}`}>
              <div className="map-grid-lines" />
              <div className="terrain terrain-one" />
              <div className="terrain terrain-two" />
              <div className="water-line water-one" />
              <div className="water-line water-two" />
              <div className="risk-area risk-high"><span>EDEN</span></div>
              <div className="risk-area risk-medium"><span>LOWTHER</span></div>
              <div className="query-shape"><span>SELECTED AREA</span></div>
              <div className="place place-penrith"><i /><strong>Penrith</strong><small>High exposure</small></div>
              <div className="place place-carlisle"><i /><strong>Carlisle</strong><small>Monitoring</small></div>
              <div className="place place-appleby"><i /><strong>Appleby</strong><small>Rising rapidly</small></div>
              <div className="map-time"><span>{mapLayer.toUpperCase()} · FORECAST VALID</span><strong>16 AUG · {forecastHour}:00</strong></div>
              <div className="query-toolbar" aria-label="Map exposure query">
                <span>EXPOSURE QUERY</span>
                <div>
                  {(Object.keys(exposureQueries) as ExposureQuery[]).map((query) => (
                    <button
                      key={query}
                      className={exposureQuery === query ? "query-selected" : ""}
                      onClick={() => setExposureQuery(query)}
                      aria-pressed={exposureQuery === query}
                    >{query}</button>
                  ))}
                </div>
              </div>
              <div className="exposure-result">
                <span>SELECTION RESULT</span>
                <strong>{exposureQueries[exposureQuery]}</strong>
                <small>Joined across GIS, asset and community records</small>
              </div>
              <div className="map-legend"><span><i className="legend-high" />High</span><span><i className="legend-medium" />Elevated</span><span><i className="legend-river" />River</span></div>
            </div>
            <div className="forecast-control">
              <div><span className="panel-kicker">TIME-BASED FORECAST</span><strong>Model ensemble · {forecastHour}:00</strong></div>
              <div className="forecast-track">
                <input
                  aria-label="Forecast hour"
                  type="range"
                  min="12"
                  max="18"
                  step="1"
                  value={forecastHour}
                  onChange={(event) => setForecastHour(Number(event.target.value))}
                />
                <div><span>12:00</span><span>15:00</span><span>18:00</span></div>
              </div>
              <div className="forecast-confidence"><span>87%</span><small>ensemble agreement</small></div>
            </div>
          </section>

          <aside className="agent-panel" id="intelligence">
            <div className="panel-header">
              <div><span className="panel-kicker">COLLABORATIVE AGENT TEAM</span><strong>4 specialists · 1 challenge gate</strong></div>
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
            <div className="collaboration-note">
              <span>ACTIVE CHALLENGE</span>
              <strong>Forecast timing vs. road-access assumption</strong>
              <p>The challenge agent has asked Meteorology and Infrastructure to reconcile a 22-minute discrepancy.</p>
              <small>CH-014 · opened 10:41 · blocks approval</small>
            </div>
            <div className="decision-card">
              <span className="decision-label">{packetStatus === "queued" ? "PACKET QUEUED" : "HUMAN DECISION REQUIRED"}</span>
              <h2>{packetStatus === "queued" ? selectedCourse.title : "Protect three exposed care facilities"}</h2>
              <p>{packetStatus === "queued" ? "The selected course is held for commander approval. No task or communication has been released." : "A decision packet is ready with evidence, challenge findings, options and reversible first actions."}</p>
              <button onClick={() => setOptionsOpen(true)}>{packetStatus === "queued" ? "Reopen packet" : "Review decision packet"} <span>→</span></button>
            </div>
          </aside>
        </div>

        <section className="evidence-panel" aria-label="Incident evidence graph">
          <div className="panel-header">
            <div><span className="panel-kicker">INCIDENT EVIDENCE GRAPH</span><strong>From source to governed decision</strong></div>
            <div className="graph-status"><i />38 evidence records · 3 challenged · 12 in packet</div>
          </div>
          <div className="evidence-flow">
            <article className="flow-node flow-sources">
              <span className="flow-step">01 · SOURCES</span>
              {demoEvidence.map((evidence) => (
                <div className="source-record" key={evidence.id}>
                  <i className={`confidence-${evidence.confidence}`} />
                  <span><strong>{evidence.source}</strong><small>{evidence.receivedAt} · {evidence.provenance}</small></span>
                </div>
              ))}
            </article>
            <article className="flow-node">
              <span className="flow-step">02 · CLAIM</span>
              <strong>Peak arrives before all care-site access routes are verified</strong>
              <p>Supported by forecast, road observation and asset exposure records.</p>
              <small>CL-021 · confidence 87% · updated 10:43</small>
            </article>
            <article className="flow-node flow-challenge">
              <span className="flow-step">03 · CHALLENGE</span>
              <strong>One access-time assumption remains unresolved</strong>
              <p>Approval is gated until the 22-minute discrepancy is accepted or corrected.</p>
              <small>CH-014 · owner: Challenge agent</small>
            </article>
            <article className="flow-node flow-decision">
              <span className="flow-step">04 · DECISION</span>
              <strong>Prepare targeted support</strong>
              <p>Reversible mobilisation proposed; public communication remains held.</p>
              <small>COA-02 · commander approval required</small>
            </article>
          </div>
        </section>

        <section className="action-panel" id="actions">
          <div className="panel-header">
            <div><span className="panel-kicker">DECISION-TO-OUTCOME CHAIN</span><strong>One governed operational thread</strong></div>
            <span className="action-gate">External effects held at approval gate</span>
          </div>
          <div className="action-chain">
            {demoActionChain.map((item, index) => (
              <article className="action-stage" key={item.id}>
                <div className="stage-index">0{index + 1}</div>
                <span>{item.stage}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <small className={`stage-${item.status}`}>{item.status}</small>
              </article>
            ))}
          </div>
          <div className="measure-row" aria-label="Operational performance measures">
            <div className="measure-intro"><span>OPERATIONAL IMPACT</span><strong>Measure the command system, not screen activity</strong></div>
            {demoOperationalMeasures.map((measure) => (
              <article key={measure.label}>
                <span>{measure.label}</span>
                <div><strong>{measure.value}</strong><em>{measure.change}</em></div>
                <small>{measure.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="signal-panel" id="audit">
          <div className="panel-header signal-title">
            <div><span className="panel-kicker">PROVENANCE TIMELINE</span><strong>What changed and why it is trusted</strong></div>
            <button>View complete audit trail</button>
          </div>
          <div className="signal-list">
            {demoEvidence.map((evidence) => (
              <article className="signal-row" key={evidence.id}>
                <time>{evidence.observedAt}</time><i />
                <div><strong>{evidence.title}</strong><p>{evidence.summary}</p><small>{evidence.provenance}</small></div>
                <span className={`evidence-${evidence.challengeStatus}`}>{evidence.challengeStatus}</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      {optionsOpen && (
        <div className="decision-overlay" role="presentation">
          <section className="decision-drawer" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <header>
              <div>
                <span className="panel-kicker">GOVERNED DECISION PACKET · DP-007</span>
                <h2 id="decision-title">Protect exposed care facilities</h2>
                <p>Compare operational choices against the same evidence set. No task, message or external action is released without a human approval.</p>
              </div>
              <button className="close-button" onClick={() => setOptionsOpen(false)} aria-label="Close decision packet">×</button>
            </header>
            <div className="packet-summary">
              <div><span>EVIDENCE</span><strong>12 verified</strong><small>latest 10:43</small></div>
              <div><span>CHALLENGE</span><strong>1 unresolved</strong><small>approval warning</small></div>
              <div><span>TIME WINDOW</span><strong>76 minutes</strong><small>before forecast peak</small></div>
              <div><span>AUTHORITY</span><strong>Commander</strong><small>named approval required</small></div>
            </div>
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
                  <small>{option.evidenceCount} supporting evidence items · evidence state v18</small>
                </button>
              ))}
            </div>
            <footer>
              <p><strong>Simulation boundary:</strong> queuing this packet records no real-world action.</p>
              <button className="secondary-action" onClick={() => setOptionsOpen(false)}>Request more analysis</button>
              <button className="primary-action" onClick={queueDecisionPacket}>Queue for commander approval</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
