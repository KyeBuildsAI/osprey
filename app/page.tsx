"use client";

import { useCallback, useEffect, useState } from "react";
import { OperationalMap, type MapFeatureSelection } from "@/components/OperationalMap";
import {
  demoIntelligence,
  type AgentAssessment,
  type AgentId,
  type IncidentIntelligence,
  type RiskLevel,
} from "@/lib/intelligence";
import type { FloodCategory, RiverGauge } from "@/lib/water";

const agentOrder: AgentId[] = ["weather", "infrastructure", "operations", "communications"];

const hazardViews = [
  { id: "compound", label: "Compound", focus: "All operational hazards", status: "Active" },
  { id: "flood", label: "Flood", focus: "Coastal and surface-water exposure", status: "Watch" },
  { id: "wind", label: "Wind", focus: "Power and access continuity", status: "Monitor" },
  { id: "heat", label: "Heat", focus: "Health and cooling continuity", status: "Monitor" },
] as const;

const decisionOptions = [
  { id: "COA-01", posture: "monitor", title: "Monitor and verify", summary: "Maintain the current posture while the next NWS update and asset-owner checks complete.", benefit: "Avoids unnecessary mobilisation while conditions remain stable.", tradeoff: "Leaves less preparation time if conditions deteriorate quickly." },
  { id: "COA-02", posture: "prepare", title: "Prepare critical-asset readiness", summary: "Ask owners to verify hospital continuity, pump availability and I-45 access without releasing an external action.", benefit: "Shortens response time while preserving operational flexibility.", tradeoff: "Uses limited coordination capacity before a severe threshold is crossed." },
  { id: "COA-03", posture: "act", title: "Activate precautionary response", summary: "Begin a controlled readiness response for elevated assets, subject to named human approval.", benefit: "Creates the largest safety margin for a worsening hazard.", tradeoff: "Consequential preparation may be disproportionate to current evidence." },
] as const;

const operationalMeasures = [
  { label: "Signal to awareness", value: "<1m", change: "live", detail: "NWS receipt to shared incident state" },
  { label: "Evidence coverage", value: "92%", change: "+8 pts", detail: "Claims with linked source records" },
  { label: "Operator workload", value: "4", change: "−5", detail: "Manual coordination steps remaining" },
] as const;

const agentNumbers: Record<AgentId, string> = {
  weather: "01",
  infrastructure: "02",
  operations: "03",
  communications: "04",
};

const floodStageGuidance: Array<{
  category: Exclude<FloodCategory, "NORMAL" | "UNKNOWN">;
  stage: "actionStage" | "minorStage" | "moderateStage" | "majorStage";
  label: string;
  meaning: string;
}> = [
  { category: "ACTION", stage: "actionStage", label: "Action", meaning: "Readiness; flooding not implied" },
  { category: "MINOR", stage: "minorStage", label: "Minor", meaning: "Initial limited impacts" },
  { category: "MODERATE", stage: "moderateStage", label: "Moderate", meaning: "Significant wider impacts" },
  { category: "MAJOR", stage: "majorStage", label: "Major", meaning: "Serious extensive impacts" },
];

const floodStageRank: Record<FloodCategory, number> = {
  UNKNOWN: -1,
  NORMAL: 0,
  ACTION: 1,
  MINOR: 2,
  MODERATE: 3,
  MAJOR: 4,
};

function conciseNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function nextStageSummary(gauge: RiverGauge) {
  if (gauge.observedValue == null) return "Live level unavailable";
  const next = floodStageGuidance.find(({ stage }) => gauge[stage] != null && gauge.observedValue! < gauge[stage]!);
  if (next) {
    const value = gauge[next.stage]!;
    return `Next: ${next.label} at ${value} ${gauge.observedUnit} · ${conciseNumber(value - gauge.observedValue)} ${gauge.observedUnit} to go`;
  }
  if (gauge.majorStage != null && gauge.observedValue >= gauge.majorStage) {
    return `Major threshold exceeded by ${conciseNumber(gauge.observedValue - gauge.majorStage)} ${gauge.observedUnit}`;
  }
  return "No higher published threshold";
}

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
  const [activeHazardId, setActiveHazardId] = useState<(typeof hazardViews)[number]["id"]>("compound");
  const [mapLayer, setMapLayer] = useState<"Risk" | "Impact" | "Assets">("Risk");
  const [forecastHour, setForecastHour] = useState(3);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<(typeof decisionOptions)[number]["id"]>("COA-02");
  const [packetQueued, setPacketQueued] = useState(false);
  const [selectedMapFeature, setSelectedMapFeature] = useState<MapFeatureSelection | null>(null);

  const refreshIntelligence = useCallback(async () => {
    setRefreshState("loading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/intelligence", { cache: "no-store" });
      const payload = await response.json() as IncidentIntelligence | { error?: string };
      if (!response.ok || !("incident" in payload)) {
        throw new Error("error" in payload ? payload.error : "The live intelligence sources did not respond.");
      }
      setIntelligence(payload);
      setRefreshState("idle");
    } catch (error) {
      setRefreshState("error");
      setErrorMessage(error instanceof Error ? error.message : "The live intelligence sources did not respond.");
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshIntelligence();
    }, 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refreshIntelligence]);

  const { incident, weather, water, assessments, assets, timeline } = intelligence;
  const activeAssessment = assessments[openAgent];
  const elevatedAssets = assets.filter((asset) => asset.exposure !== "NORMAL").length;
  const activeHazard = hazardViews.find((hazard) => hazard.id === activeHazardId) ?? hazardViews[0];
  const selectedCourse = decisionOptions.find((option) => option.id === selectedOption) ?? decisionOptions[1];
  const sourceEvidence = [assessments.weather.evidence[0], ...assessments.infrastructure.evidence.slice(0, 2)].filter(Boolean);
  const leadGauge = [...water.riverGauges].sort((a, b) => (b.percentToAction ?? -1) - (a.percentToAction ?? -1))[0];
  const leadCoast = [...water.coastalStations].sort((a, b) => Math.abs(b.anomalyM ?? 0) - Math.abs(a.anomalyM ?? 0))[0];

  const openInfrastructureContext = useCallback(() => {
    setOpenAgent("infrastructure");
    window.setTimeout(() => document.getElementById("agents")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, []);

  return (
    <main className="room-shell">
      <aside className="room-sidebar">
        <a className="brand" href="#top" aria-label="Osprey incident room">
          <span className="brand-symbol">O</span>
          <span>OSPREY</span>
        </a>

        <nav className="room-nav" aria-label="Incident room sections">
          <a href="#overview" className="nav-current"><span>01</span>Overview</a>
          <a href="#operational-map"><span>02</span>Map</a>
          <a href="#agents"><span>03</span>Agents</a>
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
            <strong>Live intelligence refresh paused.</strong>
            <span>{errorMessage} The last available representative snapshot remains visible.</span>
            <button onClick={() => void refreshIntelligence()}>Try again</button>
          </div>
        )}

        <section className="incident-hero" id="overview">
          <div className="hero-main">
            <div className="eyebrow-row"><span>TEXAS GULF COAST</span><i />SHARED INCIDENT STATE v{incident.version}</div>
            <h1>Houston–Galveston<br />Incident Room</h1>
            <p>Live weather, river, coastal and flood-zone evidence enters one shared state, where four specialist agents assess conditions, infrastructure exposure, operations and communications.</p>
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

        <section className="water-ribbon" aria-label="Live flood and water intelligence">
          <div className="water-ribbon-lead">
            <span className={`source-pill ${water.isLive ? "pill-live" : "pill-preview"}`}><i />{water.isLive ? "LIVE WATER" : "CONNECTING"}</span>
            <strong>Flood &amp; water intelligence</strong>
            <small>NOAA NWPS · USGS · NOAA CO-OPS · FEMA NFHL</small>
          </div>
          <div><span>RIVER GAUGES</span><strong>{water.riverGauges.length}</strong><small>Highest: {water.highestCategory}</small></div>
          <div><span>LEAD GAUGE</span><strong>{leadGauge?.observedValue ?? "—"} {leadGauge?.observedUnit ?? ""}</strong><small>{leadGauge ? `${leadGauge.name} · ${leadGauge.trend}` : "Awaiting feed"}</small></div>
          <div><span>COASTAL LEVEL</span><strong>{leadCoast?.observedM ?? "—"} m</strong><small>{leadCoast?.anomalyM == null ? "Awaiting tide comparison" : `${leadCoast.anomalyM >= 0 ? "+" : ""}${leadCoast.anomalyM} m vs predicted`}</small></div>
          <div><span>FLOOD ZONES</span><strong>{water.floodZoneStatus}</strong><small>{water.floodZoneStatus === "LIVE" ? `${water.floodZones.features.length} mapped features` : "Gauge feeds unaffected"}</small></div>
        </section>

        <section className="shared-state" aria-label="Shared incident state flow">
          <span className="shared-label">ONE SHARED INCIDENT STATE</span>
          <div><span>NWS + water evidence</span><i>→</i><span>Weather</span><i>→</i><span>Infrastructure</span><i>→</i><span>Operations</span><i>→</i><span>Communications</span></div>
          <small>Each specialist reads the accepted findings before it and publishes evidence-bound output back to the same incident.</small>
        </section>

        <section className="operational-workspace" id="operational-map">
          <div className="hazard-lenses" aria-label="Hazard-specific operational views">
            <span>OPERATIONAL LENS</span>
            <div>
              {hazardViews.map((hazard) => (
                <button
                  key={hazard.id}
                  className={activeHazard.id === hazard.id ? "hazard-selected" : ""}
                  onClick={() => setActiveHazardId(hazard.id)}
                  aria-pressed={activeHazard.id === hazard.id}
                >
                  <strong>{hazard.label}</strong><small>{hazard.status}</small>
                </button>
              ))}
            </div>
            <p><i />{activeHazard.focus}</p>
          </div>

          <div className="map-panel">
            <div className="map-panel-header">
              <div><span className="section-kicker">{activeHazard.label.toUpperCase()} OPERATIONAL MAP</span><h2>Exposure and forecast workspace</h2></div>
              <div className="map-layer-controls">
                {(["Risk", "Impact", "Assets"] as const).map((layer) => (
                  <button key={layer} className={mapLayer === layer ? "selected" : ""} onClick={() => setMapLayer(layer)} aria-pressed={mapLayer === layer}>{layer}</button>
                ))}
              </div>
            </div>
            <OperationalMap
              alerts={weather.activeAlerts}
              assets={assets}
              water={water}
              layer={mapLayer}
              forecastHour={forecastHour}
              hazard={activeHazard.id}
              onFeatureSelect={setSelectedMapFeature}
              onOpenInfrastructure={openInfrastructureContext}
            />
            <div className="forecast-control">
              <div><span className="section-kicker">TIME-BASED FORECAST</span><strong>{weather.forecast.period} · {weather.forecast.summary}</strong></div>
              <div className="forecast-track">
                <input aria-label="Forecast hour" type="range" min="0" max="12" step="3" value={forecastHour} onChange={(event) => setForecastHour(Number(event.target.value))} />
                <div><span>Now</span><span>+3h</span><span>+6h</span><span>+9h</span><span>+12h</span></div>
              </div>
              <div className="forecast-confidence"><span>{assessments.weather.confidence}%</span><small>weather confidence</small></div>
            </div>
          </div>
        </section>

        <section className="water-depth-panel" aria-label="River and coastal station detail">
          <div className="section-heading">
            <div><span className="section-kicker">FLOOD &amp; WATER INTELLIGENCE v1</span><h2>Live thresholds, trends and tide anomalies</h2></div>
            <span className={`water-health ${water.warnings.length === 0 ? "water-health-live" : "water-health-partial"}`}><i />{water.warnings.length === 0 ? "ALL SOURCES REPORTING" : `${water.warnings.length} SOURCE NOTICE${water.warnings.length === 1 ? "" : "S"}`}</span>
          </div>
          {water.warnings.length > 0 && <div className="water-notices">{water.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
          <div className="threshold-cache-note">
            <span><i />EXPECTED METADATA LAG</span>
            <div>
              <strong>Live river levels and NOAA thresholds update on different clocks.</strong>
              <p>USGS level readings and trends remain live. NOAA action and flood-stage metadata changes slowly, so Osprey caches verified values for 24 hours. “Threshold Metadata pending” means the live level is available while Osprey waits for NOAA metadata; it does not mean the gauge has no threshold.</p>
            </div>
            <small>{water.thresholdMetadata.live} live · {water.thresholdMetadata.cached} cached · {water.thresholdMetadata.pending} pending<br />Pending metadata retries every {water.thresholdMetadata.pendingRetryMinutes} minutes.</small>
          </div>
          <div className="water-station-grid">
            {water.riverGauges.map((gauge) => (
              <article className="water-station-card" key={gauge.id}>
                <header><span>{gauge.id} · RIVER GAUGE</span><b className={`flood-${gauge.category.toLowerCase()}`}>{gauge.thresholdMetadataStatus === "PENDING" ? "LEVEL LIVE" : gauge.category}</b></header>
                <h3>{gauge.name}</h3>
                <div className="water-reading"><strong>{gauge.observedValue ?? "—"}</strong><span>{gauge.observedUnit}<small>{gauge.trend} {gauge.changeSixHours == null ? "" : `· ${gauge.changeSixHours >= 0 ? "+" : ""}${gauge.changeSixHours} ${gauge.observedUnit} / 6h`}</small></span></div>
                <div className={`threshold-track ${gauge.thresholdMetadataStatus === "PENDING" ? "threshold-track-pending" : ""}`}><i style={{ width: `${Math.min(gauge.percentToAction ?? 0, 100)}%` }} /></div>
                {gauge.thresholdMetadataStatus !== "PENDING" && floodStageGuidance.some(({ stage }) => gauge[stage] != null) && (
                  <div className="flood-stage-ladder" aria-label={`Published flood stages for ${gauge.name}`}>
                    <div className="flood-stage-ladder-heading"><span>NOAA STAGE LADDER</span><strong>{nextStageSummary(gauge)}</strong></div>
                    {floodStageGuidance.map((stage, index) => {
                      const value = gauge[stage.stage];
                      if (value == null) return null;
                      const state = gauge.category === stage.category
                        ? "stage-current"
                        : floodStageRank[gauge.category] > index
                          ? "stage-crossed"
                          : "stage-upcoming";
                      return (
                        <div className={`flood-stage-step stage-${stage.category.toLowerCase()} ${state}`} key={stage.category} aria-current={state === "stage-current" ? "step" : undefined}>
                          <span><i />{stage.label}</span>
                          <strong>{value} {gauge.observedUnit}</strong>
                          <small>{stage.meaning}</small>
                        </div>
                      );
                    })}
                  </div>
                )}
                <footer>
                  <span className={gauge.thresholdMetadataStatus === "PENDING" ? "threshold-pending-label" : ""}>{gauge.thresholdMetadataStatus === "PENDING" ? "Threshold Metadata pending" : gauge.actionStage == null ? "No NOAA action stage published" : `${gauge.percentToAction ?? "—"}% of ${gauge.actionStage} ${gauge.observedUnit} action stage`}</span>
                  <small>{gauge.usgsId ? `USGS ${gauge.usgsId}` : "NWPS"} level · {formatTime(gauge.observedAt)} CT<br />{gauge.thresholdMetadataStatus === "PENDING" ? `NOAA metadata retry within ${water.thresholdMetadata.pendingRetryMinutes} min` : `${gauge.thresholdMetadataStatus} NOAA metadata${gauge.thresholdMetadataUpdatedAt ? ` · ${formatTime(gauge.thresholdMetadataUpdatedAt)} CT` : ""}`}</small>
                </footer>
              </article>
            ))}
            {water.coastalStations.map((station) => (
              <article className="water-station-card coastal-station-card" key={station.id}>
                <header><span>{station.id} · COASTAL STATION</span><b>CO-OPS</b></header>
                <h3>{station.name}</h3>
                <div className="water-reading"><strong>{station.observedM ?? "—"}</strong><span>m MLLW<small>{station.trend} · observed</small></span></div>
                <div className="coastal-comparison"><span>Predicted <b>{station.predictedM ?? "—"} m</b></span><span>Anomaly <b>{station.anomalyM == null ? "—" : `${station.anomalyM >= 0 ? "+" : ""}${station.anomalyM} m`}</b></span></div>
                <footer><span>Observed against astronomical tide prediction</span><small>NOAA CO-OPS · {formatTime(station.observedAt)} CT</small></footer>
              </article>
            ))}
          </div>
          <p className="water-boundary">Operational awareness only. Gauge observations can be provisional; cached thresholds may intentionally lag live levels by up to 24 hours because they are slowly changing reference metadata. FEMA flood zones describe mapped hazard, not current inundation. Representative assets remain demonstration records until an authoritative asset registry is connected.</p>
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
            {openAgent === "infrastructure" && selectedMapFeature && (
              <div className="map-context-evidence">
                <span><i />SESSION MAP CONTEXT</span>
                <strong>{selectedMapFeature.name}</strong>
                <p>{selectedMapFeature.classification} · {selectedMapFeature.elevationStatus === "ready" ? `${selectedMapFeature.elevationM?.toFixed(1)} m USGS terrain height` : "terrain height unavailable"} · {selectedMapFeature.latitude.toFixed(5)}, {selectedMapFeature.longitude.toFixed(5)}</p>
                <small>This selected feature is attached to the current interface session for operator review; it does not alter the authoritative incident assessment.</small>
              </div>
            )}
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

        <section className="evidence-graph" aria-label="Incident evidence graph">
          <div className="graph-heading">
            <div><span className="section-kicker">INCIDENT EVIDENCE GRAPH</span><h2>From live source to governed decision</h2></div>
            <span><i />{assessments.weather.evidence.length + assessments.infrastructure.evidence.length} linked records · state v{incident.version}</span>
          </div>
          <div className="evidence-flow">
            <article className="flow-node flow-sources">
              <span className="flow-step">01 · SOURCES</span>
              {sourceEvidence.map((evidence) => (
                <div className="source-record" key={evidence.id}><i /><span><strong>{evidence.label}</strong><small>{evidence.id} · {formatTime(evidence.observedAt)} CT</small></span></div>
              ))}
            </article>
            <article className="flow-node">
              <span className="flow-step">02 · WEATHER CLAIM</span>
              <strong>{assessments.weather.headline}</strong>
              <p>{assessments.weather.summary}</p>
              <small>{assessments.weather.confidence}% confidence · NWS evidence</small>
            </article>
            <article className="flow-node flow-infrastructure">
              <span className="flow-step">03 · EXPOSURE</span>
              <strong>{assessments.infrastructure.headline}</strong>
              <p>{assessments.infrastructure.summary}</p>
              <small>{assets.length} assets assessed · {elevatedAssets} to monitor</small>
            </article>
            <article className="flow-node flow-decision">
              <span className="flow-step">04 · DECISION</span>
              <strong>{packetQueued ? selectedCourse.title : assessments.operations.headline}</strong>
              <p>{packetQueued ? "Packet is held for named commander approval. No external effect has been released." : assessments.operations.summary}</p>
              <button onClick={() => setDecisionOpen(true)}>{packetQueued ? "Reopen packet" : "Review decision packet"} →</button>
            </article>
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
                  <div><strong>{asset.name}</strong><small>{asset.type} · {asset.location} · {asset.elevationM == null ? "elevation pending" : `${Math.round(asset.elevationM)} m USGS elevation`}</small><p>{asset.reason}</p></div>
                  <span className="criticality">{asset.criticality}</span>
                </article>
              ))}
            </div>
            <p className="fixture-note">Asset identities remain clearly marked demonstration fixtures. Their coordinates are mapped against live NWS GeoJSON warnings and USGS elevation samples.</p>
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
                    <small>{alert.geometry ? "Mapped NWS polygon" : "Area-based NWS alert"} · {alert.areaDescription} · issued {formatTime(alert.sentAt)} CT{alert.expiresAt ? ` · expires ${formatTime(alert.expiresAt)} CT` : ""}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-alerts"><i>✓</i><strong>No active NWS alerts</strong><p>Osprey will reassess the incident automatically on the next live refresh.</p></div>
            )}
          </section>
        </div>

        <section className="action-panel" id="actions">
          <div className="graph-heading">
            <div><span className="section-kicker">DECISION-TO-OUTCOME CHAIN</span><h2>One governed operational thread</h2></div>
            <span className="action-gate">External effects held at approval gate</span>
          </div>
          <div className="action-chain">
            {[
              { stage: "Decision", title: packetQueued ? selectedCourse.title : "Review operational posture", detail: `${selectedOption} · exact evidence state v${incident.version}`, status: packetQueued ? "queued" : "gated" },
              { stage: "Tasks", title: "Verify critical-asset readiness", detail: `${assets.length} owners · deadlines prepared`, status: "ready" },
              { stage: "Communications", title: assessments.communications.headline, detail: "Audience and release conditions retained", status: "pending" },
              { stage: "Outcome", title: "Confirm continuity and access", detail: "Measure acknowledgements and exceptions", status: "measuring" },
            ].map((item, index) => (
              <article className="action-stage" key={item.stage}>
                <div className="stage-index">0{index + 1}</div><span>{item.stage}</span><strong>{item.title}</strong><p>{item.detail}</p><small className={`stage-${item.status}`}>{item.status}</small>
              </article>
            ))}
          </div>
          <div className="measure-row" aria-label="Operational performance measures">
            <div className="measure-intro"><span>OPERATIONAL IMPACT</span><strong>Measure the command system, not screen activity</strong></div>
            {operationalMeasures.map((measure) => (
              <article key={measure.label}><span>{measure.label}</span><div><strong>{measure.value}</strong><em>{measure.change}</em></div><small>{measure.detail}</small></article>
            ))}
          </div>
        </section>

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

      {decisionOpen && (
        <div className="decision-overlay" role="presentation">
          <section className="decision-drawer" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <header>
              <div><span className="section-kicker">GOVERNED DECISION PACKET · DP-HGX-01</span><h2 id="decision-title">Set the Houston–Galveston operating posture</h2><p>Compare options against the same live weather and representative asset evidence. No task, message or real-world action is released without named human approval.</p></div>
              <button className="close-button" onClick={() => setDecisionOpen(false)} aria-label="Close decision packet">×</button>
            </header>
            <div className="packet-summary">
              <div><span>EVIDENCE</span><strong>{sourceEvidence.length} live records</strong><small>latest {formatTime(weather.fetchedAt)} CT</small></div>
              <div><span>ASSETS</span><strong>{assets.length} assessed</strong><small>{elevatedAssets} require monitoring</small></div>
              <div><span>WEATHER</span><strong>{incident.severity}</strong><small>{assessments.weather.confidence}% confidence</small></div>
              <div><span>AUTHORITY</span><strong>Commander</strong><small>named approval required</small></div>
            </div>
            <div className="option-list">
              {decisionOptions.map((option) => (
                <button className={`option-card ${selectedOption === option.id ? "option-selected" : ""}`} key={option.id} onClick={() => setSelectedOption(option.id)} aria-pressed={selectedOption === option.id}>
                  <span className={`posture posture-${option.posture}`}>{option.posture}</span><strong>{option.title}</strong><p>{option.summary}</p>
                  <dl><div><dt>Benefit</dt><dd>{option.benefit}</dd></div><div><dt>Trade-off</dt><dd>{option.tradeoff}</dd></div></dl>
                  <small>{option.id} · incident state v{incident.version}</small>
                </button>
              ))}
            </div>
            <footer><p><strong>Demonstration boundary:</strong> queuing this packet records no real-world action.</p><button className="secondary-action" onClick={() => setDecisionOpen(false)}>Request more analysis</button><button className="primary-action" onClick={() => { setPacketQueued(true); setDecisionOpen(false); }}>Queue for commander approval</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}
