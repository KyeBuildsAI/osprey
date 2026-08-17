"use client";

import { useCallback, useEffect, useState } from "react";
import {
  demoIntelligence,
  type AgentAssessment,
  type AgentId,
  type IncidentIntelligence,
  type RiskLevel,
} from "@/lib/intelligence";

const agentOrder: AgentId[] = ["weather", "infrastructure", "operations", "communications"];

const agentNumbers: Record<AgentId, string> = {
  weather: "01",
  infrastructure: "02",
  operations: "03",
  communications: "04",
};

function formatTime(value: string, includeDate = false) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    ...(includeDate ? { day: "2-digit", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    second: includeDate ? undefined : "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function riskClass(risk: RiskLevel) {
  return `risk-${risk.toLowerCase()}`;
}

function AssessmentCard({ assessment, active, onOpen }: { assessment: AgentAssessment; active: boolean; onOpen: () => void }) {
  return (
    <article className={`assessment-card ${active ? "assessment-active" : ""}`}>
      <button className="assessment-main" onClick={onOpen} aria-expanded={active}>
        <span className="agent-index">{agentNumbers[assessment.agent]}</span>
        <span className="agent-copy">
          <span className="agent-name">{assessment.label} Agent</span>
          <span className="agent-remit">{assessment.remit}</span>
        </span>
        <span className={`risk-badge ${riskClass(assessment.risk)}`}>{assessment.state}</span>
        <strong>{assessment.headline}</strong>
        <p>{assessment.summary}</p>
        <span className="confidence-row">
          <span><b>{assessment.confidence}%</b> confidence</span>
          <span>{assessment.evidence.length} evidence records</span>
          <span className="open-detail">{active ? "Close detail" : "View evidence"} →</span>
        </span>
      </button>
    </article>
  );
}

export default function Home() {
  const [intelligence, setIntelligence] = useState<IncidentIntelligence>(demoIntelligence);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [openAgent, setOpenAgent] = useState<AgentId>("weather");

  const refreshIntelligence = useCallback(async () => {
    setRefreshState("loading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/intelligence", { cache: "no-store" });
      const payload = await response.json() as IncidentIntelligence | { error?: string };
      if (!response.ok || !("incident" in payload)) {
        throw new Error("error" in payload ? payload.error : "The live weather source did not respond.");
      }
      setIntelligence(payload);
      setRefreshState("idle");
    } catch (error) {
      setRefreshState("error");
      setErrorMessage(error instanceof Error ? error.message : "The live weather source did not respond.");
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshIntelligence();
    }, 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refreshIntelligence]);

  const { incident, weather, assessments, assets, timeline } = intelligence;
  const activeAssessment = assessments[openAgent];
  const elevatedAssets = assets.filter((asset) => asset.exposure !== "NORMAL").length;

  return (
    <main className="room-shell">
      <aside className="room-sidebar">
        <a className="brand" href="#top" aria-label="Osprey incident room">
          <span className="brand-symbol">O</span>
          <span>OSPREY</span>
        </a>

        <nav className="room-nav" aria-label="Incident room sections">
          <a href="#overview" className="nav-current"><span>01</span>Overview</a>
          <a href="#agents"><span>02</span>Agents</a>
          <a href="#assets"><span>03</span>Assets</a>
          <a href="#timeline"><span>04</span>Timeline</a>
        </nav>

        <div className="sidebar-status">
          <span className={`source-dot ${weather.isLive ? "source-live" : "source-waiting"}`} />
          <div>
            <strong>{weather.isLive ? "NWS connected" : "Connecting to NWS"}</strong>
            <small>{weather.sourceOffice} · normalized source</small>
          </div>
        </div>
        <div className="operator">
          <span>KH</span>
          <div><strong>Kye Hussain</strong><small>Human controller</small></div>
        </div>
      </aside>

      <section className="room-workspace" id="top">
        <header className="room-topbar">
          <div className="incident-code"><span>{incident.id}</span><i />{incident.status} INCIDENT</div>
          <div className="classification">{incident.classification}</div>
        </header>

        {refreshState === "error" && (
          <div className="source-warning" role="status">
            <strong>Live NWS refresh paused.</strong>
            <span>{errorMessage} The last available representative snapshot remains visible.</span>
            <button onClick={() => void refreshIntelligence()}>Try again</button>
          </div>
        )}

        <section className="incident-hero" id="overview">
          <div className="hero-main">
            <div className="eyebrow-row"><span>TEXAS GULF COAST</span><i />SHARED INCIDENT STATE v{incident.version}</div>
            <h1>Houston–Galveston<br />Incident Room</h1>
            <p>Live weather evidence enters one shared state, where four specialist agents assess conditions, infrastructure exposure, operations and communications.</p>
          </div>
          <div className="hero-state">
            <span>CURRENT OPERATIONAL STATE</span>
            <strong className={riskClass(incident.severity)}>{incident.severity}</strong>
            <p>{assessments.weather.headline}</p>
            <time>Updated {formatTime(incident.updatedAt, true)} CT</time>
            <button className="refresh-button" onClick={() => void refreshIntelligence()} disabled={refreshState === "loading"}>
              <span className={refreshState === "loading" ? "refresh-spinning" : ""}>↻</span>
              {refreshState === "loading" ? "Refreshing intelligence…" : "Refresh live intelligence"}
            </button>
          </div>
        </section>

        <section className="weather-ribbon" aria-label="Live Houston weather">
          <div className="weather-lead">
            <span className={`source-pill ${weather.isLive ? "pill-live" : "pill-preview"}`}><i />{weather.isLive ? "LIVE NWS" : "CONNECTING"}</span>
            <strong>Houston conditions</strong>
            <small>Observed {formatTime(weather.observedAt)} CT · {weather.sourceOffice}</small>
          </div>
          <div className="temperature"><strong>{weather.temperatureC ?? "—"}°</strong><span>C</span></div>
          <div className="condition"><span>CONDITION</span><strong>{weather.condition}</strong><small>{weather.forecast.summary}</small></div>
          <div className="weather-stat"><span>WIND</span><strong>{weather.windDirection ?? "—"} {weather.windSpeedMph ?? "—"} mph</strong></div>
          <div className="weather-stat"><span>HUMIDITY</span><strong>{weather.humidityPercent ?? "—"}%</strong></div>
          <div className="weather-stat alert-stat"><span>ACTIVE ALERTS</span><strong>{weather.activeAlerts.length}</strong></div>
        </section>

        <section className="shared-state" aria-label="Shared incident state flow">
          <span className="shared-label">ONE SHARED INCIDENT STATE</span>
          <div><span>NWS evidence</span><i>→</i><span>Weather</span><i>→</i><span>Infrastructure</span><i>→</i><span>Operations</span><i>→</i><span>Communications</span></div>
          <small>Each specialist reads the accepted findings before it and publishes evidence-bound output back to the same incident.</small>
        </section>

        <section className="agent-section" id="agents">
          <div className="section-heading">
            <div><span className="section-kicker">SPECIALIST INTELLIGENCE</span><h2>Four perspectives. One operating picture.</h2></div>
            <span className="complete-status"><i />All assessments complete</span>
          </div>
          <div className="assessment-grid">
            {agentOrder.map((agent) => (
              <AssessmentCard
                key={agent}
                assessment={assessments[agent]}
                active={openAgent === agent}
                onOpen={() => setOpenAgent(agent)}
              />
            ))}
          </div>

          <div className="assessment-detail" aria-live="polite">
            <div className="detail-title">
              <span className="agent-index">{agentNumbers[activeAssessment.agent]}</span>
              <div><span>{activeAssessment.label.toUpperCase()} AGENT DETAIL</span><h3>{activeAssessment.headline}</h3></div>
              {activeAssessment.requiresApproval && <span className="approval-chip">HUMAN APPROVAL REQUIRED</span>}
            </div>
            <div className="detail-columns">
              <div className="finding-list">
                <span className="detail-label">FINDINGS</span>
                {activeAssessment.findings.map((finding, index) => (
                  <div key={finding}><b>{String(index + 1).padStart(2, "0")}</b><p>{finding}</p></div>
                ))}
              </div>
              <div className="evidence-list">
                <span className="detail-label">EVIDENCE USED</span>
                {activeAssessment.evidence.map((evidence) => (
                  <article key={evidence.id}>
                    <span><i />{evidence.id}</span>
                    <strong>{evidence.label}</strong>
                    <p>{evidence.value}</p>
                    <small>{evidence.source} · {formatTime(evidence.observedAt)} CT</small>
                  </article>
                ))}
              </div>
              <div className="watch-list">
                <span className="detail-label">WATCH FOR</span>
                {activeAssessment.watchFor.map((item) => <p key={item}>{item}</p>)}
                <div className="confidence-meter">
                  <span><b>Confidence</b><strong>{activeAssessment.confidence}%</strong></span>
                  <i><b style={{ width: `${activeAssessment.confidence}%` }} /></i>
                  <small>Derived from source freshness, coverage and cross-agent evidence.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="operations-grid">
          <section className="asset-panel" id="assets">
            <div className="panel-heading">
              <div><span className="section-kicker">REPRESENTATIVE INFRASTRUCTURE</span><h2>Critical assets</h2></div>
              <span>{elevatedAssets} require monitoring</span>
            </div>
            <div className="asset-list">
              {assets.map((asset) => (
                <article key={asset.id}>
                  <span className={`asset-state asset-${asset.exposure.toLowerCase()}`}>{asset.exposure}</span>
                  <div><strong>{asset.name}</strong><small>{asset.type} · {asset.location}</small><p>{asset.reason}</p></div>
                  <span className="criticality">{asset.criticality}</span>
                </article>
              ))}
            </div>
            <p className="fixture-note">Infrastructure is a clearly marked demonstration fixture in this build; weather observations and alerts refresh from NWS.</p>
          </section>

          <section className="alert-panel">
            <div className="panel-heading">
              <div><span className="section-kicker">AUTHORITATIVE ALERTS</span><h2>NWS alert feed</h2></div>
              <span>{weather.activeAlerts.length} active</span>
            </div>
            {weather.activeAlerts.length > 0 ? (
              <div className="alert-list">
                {weather.activeAlerts.slice(0, 3).map((alert) => (
                  <article key={alert.id}>
                    <span>{alert.severity} · {alert.urgency}</span>
                    <strong>{alert.event}</strong>
                    <p>{alert.headline}</p>
                    <small>Issued {formatTime(alert.sentAt)} CT{alert.expiresAt ? ` · expires ${formatTime(alert.expiresAt)} CT` : ""}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-alerts"><i>✓</i><strong>No active NWS alerts</strong><p>Osprey will reassess the incident automatically on the next live refresh.</p></div>
            )}
          </section>
        </div>

        <section className="timeline-panel" id="timeline">
          <div className="section-heading">
            <div><span className="section-kicker">INCIDENT TIMELINE</span><h2>What Osprey knew, and when</h2></div>
            <span className="audit-label">AUDIT SEED · {timeline.length} EVENTS</span>
          </div>
          <div className="timeline-list">
            {timeline.map((event, index) => (
              <article key={event.id}>
                <time>{formatTime(event.occurredAt)}<small>CT</small></time>
                <div className="timeline-line"><i /><span /></div>
                <div><span>{event.actor}</span><strong>{event.title}</strong><p>{event.detail}</p><small>{event.evidenceIds.join(" · ")}</small></div>
                <b>{String(index + 1).padStart(2, "0")}</b>
              </article>
            ))}
          </div>
        </section>

        <footer className="room-footer">
          <span>OSPREY · AI-NATIVE INCIDENT COMMAND</span>
          <p>Live environmental data. Representative infrastructure. No real-world action execution.</p>
        </footer>
      </section>
    </main>
  );
}
