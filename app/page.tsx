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
import type { FloodCategory, RiverGauge } from "@/lib/water-types";

const agentOrder: AgentId[] = ["weather", "infrastructure", "operations", "communications"];

type WorkspaceId = "overview" | "map" | "intelligence" | "decisions";
type IntelligenceTab = "weather" | "flood" | "transport" | "infrastructure" | "agents" | "sources";
type ApprovalTab = "needs" | "progress" | "history";
type PacketStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "DEFERRED" | "REJECTED";
type TaskStatus = "HELD" | "OPEN" | "ACKNOWLEDGED" | "COMPLETE";

type WorkflowEvent = {
  id: string;
  occurredAt: string;
  actor: string;
  title: string;
  detail: string;
  evidenceIds: string[];
};

const workspaces: Array<{ id: WorkspaceId; label: string; number: string; hash: string; description: string }> = [
  { id: "overview", label: "Overview", number: "01", hash: "overview", description: "Exceptions, posture and immediate priorities" },
  { id: "map", label: "Map", number: "02", hash: "operational-map", description: "Spatial exposure and forecast exploration" },
  { id: "intelligence", label: "Intelligence", number: "03", hash: "intelligence", description: "Deep feeds, agents and provenance" },
  { id: "decisions", label: "Approvals", number: "04", hash: "decisions", description: "Human decisions, actions and audit" },
];

const intelligenceTabs: Array<{ id: IntelligenceTab; label: string }> = [
  { id: "weather", label: "Weather" },
  { id: "flood", label: "Flood" },
  { id: "transport", label: "Transport" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "agents", label: "Agents" },
  { id: "sources", label: "Sources" },
];

const hazardViews = [
  { id: "compound", label: "Compound", focus: "All operational hazards", status: "Active" },
  { id: "flood", label: "Flood", focus: "Coastal and surface-water exposure", status: "Watch" },
  { id: "wind", label: "Wind", focus: "Power and access continuity", status: "Monitor" },
  { id: "heat", label: "Heat", focus: "Health and cooling continuity", status: "Monitor" },
] as const;

const decisionOptions = [
  { id: "COA-01", posture: "monitor", title: "Monitor and verify", summary: "Maintain the current posture while the next NWS update and asset-owner checks complete.", benefit: "Avoids unnecessary mobilisation while conditions remain stable.", tradeoff: "Leaves less preparation time if conditions deteriorate quickly." },
  { id: "COA-02", posture: "prepare", title: "Prepare critical-asset readiness", summary: "Ask owners to verify hospital continuity, emergency-response access and flagged bridge routes without releasing an external action.", benefit: "Shortens response time while preserving operational flexibility.", tradeoff: "Uses limited coordination capacity before a severe threshold is crossed." },
  { id: "COA-03", posture: "act", title: "Activate precautionary response", summary: "Begin a controlled readiness response for elevated assets, subject to named human approval.", benefit: "Creates the largest safety margin for a worsening hazard.", tradeoff: "Consequential preparation may be disproportionate to current evidence." },
] as const;

const actionSeed: Array<{ id: string; title: string; owner: string; due: string; status: TaskStatus }> = [
  { id: "TASK-HGX-01", title: "Verify hospital continuity contacts", owner: "Healthcare liaison", due: "Within 30 minutes", status: "HELD" },
  { id: "TASK-HGX-02", title: "Confirm emergency access at exposed routes", owner: "Transport lead", due: "Before next forecast frame", status: "HELD" },
  { id: "TASK-HGX-03", title: "Check flagged bridge-owner readiness", owner: "Infrastructure liaison", due: "Within 60 minutes", status: "HELD" },
];

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

function floodZoneStatusLabel(status: IncidentIntelligence["water"]["floodZoneStatus"]) {
  if (status === "LIVE") return "LIVE FEMA";
  if (status === "CACHED") return "VERIFIED SNAPSHOT";
  if (status === "PENDING") return "UPDATE PENDING";
  if (status === "DEMO") return "CONNECTING";
  return status;
}

function sourceFreshnessLabel(source: IncidentIntelligence["sources"][number]) {
  if (source.status === "DEMO") return "Connecting";
  if (source.ageMinutes == null) return "No current event time";
  if (source.ageMinutes < 1) return "Less than 1 minute old";
  if (source.ageMinutes < 60) return `${source.ageMinutes} minutes old`;
  if (source.ageMinutes < 1_440) return `${Math.round(source.ageMinutes / 60)} hours old`;
  return `${Math.round(source.ageMinutes / 1_440)} days old`;
}

function forecastOffsetHours(first: string, current: string) {
  return Math.max(0, Math.round((Date.parse(current) - Date.parse(first)) / 3_600_000));
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
  const [forecastFrameIndex, setForecastFrameIndex] = useState(0);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<(typeof decisionOptions)[number]["id"]>("COA-02");
  const [packetStatus, setPacketStatus] = useState<PacketStatus>("DRAFT");
  const [approvalTab, setApprovalTab] = useState<ApprovalTab>("needs");
  const [approvalConfirm, setApprovalConfirm] = useState(false);
  const [editingDecision, setEditingDecision] = useState(false);
  const [editedDecision, setEditedDecision] = useState("");
  const [actionTasks, setActionTasks] = useState(actionSeed);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [selectedMapFeature, setSelectedMapFeature] = useState<MapFeatureSelection | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>("overview");
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState<IntelligenceTab>("weather");

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

  const refreshFemaInBackground = useCallback(async () => {
    try {
      const response = await fetch("/api/fema-refresh", { method: "POST", cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { updated?: boolean; outcome?: "SUCCESS" | "FAILURE" };
      if (result.updated || result.outcome === "FAILURE") await refreshIntelligence();
    } catch {
      // The verified snapshot already displayed is intentionally retained.
    }
  }, [refreshIntelligence]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshIntelligence();
    }, 0);
    const femaRefresh = window.setTimeout(() => {
      void refreshFemaInBackground();
    }, 1800);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearTimeout(femaRefresh);
    };
  }, [refreshFemaInBackground, refreshIntelligence]);

  useEffect(() => {
    const syncWorkspaceFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const directMatch = workspaces.find((workspace) => workspace.hash === hash);
      if (directMatch) setActiveWorkspace(directMatch.id);
      if (hash === "agents") {
        setActiveWorkspace("intelligence");
        setActiveIntelligenceTab("agents");
      }
      if (hash === "timeline" || hash === "actions") setActiveWorkspace("decisions");
    };
    syncWorkspaceFromHash();
    window.addEventListener("hashchange", syncWorkspaceFromHash);
    return () => window.removeEventListener("hashchange", syncWorkspaceFromHash);
  }, []);

  const { incident, weather, water, rainfall, assetRegister, operationalImpacts, assessments, assets, timeline } = intelligence;
  const activeAssessment = assessments[openAgent];
  const elevatedAssets = assets.filter((asset) => asset.exposure !== "NORMAL").length;
  const activeHazard = hazardViews.find((hazard) => hazard.id === activeHazardId) ?? hazardViews[0];
  const selectedCourse = decisionOptions.find((option) => option.id === selectedOption) ?? decisionOptions[1];
  const activeDecisionTitle = editedDecision.trim() || selectedCourse.title;
  const packetQueued = packetStatus === "PENDING_APPROVAL" || packetStatus === "APPROVED";
  const packetApproved = packetStatus === "APPROVED";
  const openTasks = actionTasks.filter((task) => task.status === "OPEN" || task.status === "ACKNOWLEDGED").length;
  const completedTasks = actionTasks.filter((task) => task.status === "COMPLETE").length;
  const decisionTimeline = [...workflowEvents, ...timeline].sort((first, second) => Date.parse(second.occurredAt) - Date.parse(first.occurredAt));

  const appendWorkflowEvent = (title: string, detail: string) => {
    setWorkflowEvents((events) => [{
      id: `OSP-${Date.now()}`,
      occurredAt: new Date().toISOString(),
      actor: "Kye Hussain · Human controller",
      title,
      detail,
      evidenceIds: [selectedOption, `STATE-v${incident.version}`],
    }, ...events]);
  };

  const queueForApproval = () => {
    setPacketStatus("PENDING_APPROVAL");
    appendWorkflowEvent("Decision packet submitted for approval", `${activeDecisionTitle} is held for named commander approval. No tasks or messages have been released.`);
    setDecisionOpen(false);
  };

  const approvePacket = () => {
    setPacketStatus("APPROVED");
    setActionTasks((tasks) => tasks.map((task) => ({ ...task, status: "OPEN" })));
    appendWorkflowEvent("Decision approved and action set opened", `${activeDecisionTitle} was approved by Kye Hussain. Three reversible readiness checks are now assigned; communications remain prepared, not released.`);
    setApprovalConfirm(false);
    setApprovalTab("progress");
    setDecisionOpen(false);
  };

  const deferPacket = () => {
    setPacketStatus("DEFERRED");
    appendWorkflowEvent("Decision deferred for further analysis", `${activeDecisionTitle} remains unapproved while additional evidence is requested. No tasks or messages have been released.`);
    setDecisionOpen(false);
  };

  const rejectProposal = () => {
    setPacketStatus("REJECTED");
    appendWorkflowEvent("Proposal rejected", `${activeDecisionTitle} was not authorised. No tasks or communications were released.`);
    setDecisionOpen(false);
  };

  const progressTask = (taskId: string) => {
    const task = actionTasks.find((candidate) => candidate.id === taskId);
    if (!task || !packetApproved || task.status === "COMPLETE") return;
    const nextStatus: TaskStatus = task.status === "OPEN" ? "ACKNOWLEDGED" : "COMPLETE";
    setActionTasks((tasks) => tasks.map((task) => {
      return task.id === taskId ? { ...task, status: nextStatus } : task;
    }));
    appendWorkflowEvent(`Task ${nextStatus.toLowerCase()}`, `${task.title} is ${nextStatus.toLowerCase()} by ${task.owner}.`);
  };
  const sourceEvidence = [assessments.weather.evidence[0], ...assessments.infrastructure.evidence.slice(0, 2)].filter(Boolean);
  const leadGauge = [...water.riverGauges].sort((a, b) => (b.percentToAction ?? -1) - (a.percentToAction ?? -1))[0];
  const leadCoast = [...water.coastalStations].sort((a, b) => Math.abs(b.anomalyM ?? 0) - Math.abs(a.anomalyM ?? 0))[0];
  const rainfallMaxByPeriod = Object.fromEntries(rainfall.periods.map((period) => {
    const values = rainfall.samples.map((sample) => sample.accumulationIn[period]).filter((value): value is number => value != null);
    return [period, values.length > 0 ? Math.max(...values) : null];
  })) as Record<(typeof rainfall.periods)[number], number | null>;
  const rainfallWatchPoints = rainfall.samples.filter((sample) => ["MONITOR", "ELEVATED"].includes(sample.screening)).length;
  const rainfallCoreSamples = rainfall.samples.filter((sample) => !sample.id.startsWith("TRANSTAR-"));
  const rainfallImpactSamples = rainfall.samples.length - rainfallCoreSamples.length;
  const activeOperationalImpacts = operationalImpacts.impacts.filter((impact) => impact.status !== "RESOLVED");
  const confirmedOperationalImpacts = activeOperationalImpacts.filter((impact) => ["VERIFIED", "RESTRICTED", "CLOSED"].includes(impact.status));
  const closureImpacts = activeOperationalImpacts.filter((impact) => ["RESTRICTED", "CLOSED"].includes(impact.status));
  const linkedOperationalImpacts = activeOperationalImpacts.filter((impact) => impact.nearbyInfrastructure.length > 0);
  const displayedOperationalImpacts = [...activeOperationalImpacts].sort((first, second) => {
    const statusRank = { CLOSED: 4, RESTRICTED: 3, VERIFIED: 2, REPORTED: 1, RESOLVED: 0 };
    const severityRank = { HIGH: 2, MODERATE: 1, LOW: 0 };
    return statusRank[second.status] - statusRank[first.status] || severityRank[second.severity] - severityRank[first.severity];
  }).slice(0, 10);
  const forecastFrames = weather.forecastFrames.length > 0 ? weather.forecastFrames : [];
  const selectedForecastFrame = forecastFrames[Math.min(forecastFrameIndex, Math.max(0, forecastFrames.length - 1))] ?? null;
  const firstForecastTime = forecastFrames[0]?.startTime ?? weather.fetchedAt;
  const forecastHour = selectedForecastFrame ? forecastOffsetHours(firstForecastTime, selectedForecastFrame.startTime) : 0;
  const forecastMarkIndexes = [...new Set([0, 3, 6, 9, 12].map((index) => Math.min(index, Math.max(0, forecastFrames.length - 1))))];
  const reportingSources = intelligence.sources.filter((source) => ["LIVE", "CACHED"].includes(source.status)).length;
  const sourceGap = intelligence.sources.find((source) => !["LIVE", "CACHED"].includes(source.status));
  const elevatedGauges = water.riverGauges.filter((gauge) => !["NORMAL", "UNKNOWN"].includes(gauge.category));
  const highestPriorityImpact = displayedOperationalImpacts[0];

  const changeWorkspace = useCallback((workspace: WorkspaceId, tab?: IntelligenceTab) => {
    setActiveWorkspace(workspace);
    if (tab) setActiveIntelligenceTab(tab);
    const target = workspaces.find((item) => item.id === workspace)?.hash ?? workspace;
    window.history.replaceState(null, "", `#${target}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openInfrastructureContext = useCallback(() => {
    setOpenAgent("infrastructure");
    setActiveIntelligenceTab("agents");
    setActiveWorkspace("intelligence");
    window.history.replaceState(null, "", "#intelligence");
    window.setTimeout(() => document.getElementById("agents")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, []);

  return (
    <main className={`room-shell workspace-${activeWorkspace} intel-${activeIntelligenceTab}`}>
      <aside className="room-sidebar">
        <a className="brand" href="#top" aria-label="Osprey incident room">
          <span className="brand-symbol">O</span>
          <span>OSPREY</span>
        </a>

        <nav className="room-nav" aria-label="Incident room workspaces">
          {workspaces.map((workspace) => (
            <a
              href={`#${workspace.hash}`}
              title={workspace.description}
              className={activeWorkspace === workspace.id ? "nav-current" : ""}
              key={workspace.id}
              onClick={(event) => { event.preventDefault(); changeWorkspace(workspace.id); }}
            ><span>{workspace.number}</span>{workspace.label}</a>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className={`source-dot ${reportingSources === intelligence.sources.length ? "source-live" : "source-waiting"}`} />
          <div>
            <strong>{reportingSources}/{intelligence.sources.length} sources ready</strong>
            <small>Health · freshness · provenance</small>
          </div>
        </div>
        <div className="operator">
          <span>KH</span>
          <div><strong>Kye Hussain</strong><small>Human controller</small></div>
        </div>
      </aside>

      <section className="room-workspace" id="top">
        <section className="location-bar" aria-label="Operating locations">
          <span>OPERATING LOCATIONS</span>
          <nav aria-label="Select operating location">
            <button className="location-selected" aria-current="page">
              <span>01</span><strong>Houston–Galveston</strong><small>Active incident</small>
            </button>
          </nav>
          <small>1 connected location · additional locations will appear here</small>
        </section>

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

        <section className="incident-hero overview-only" id="overview">
          <div className="hero-main">
            <div className="eyebrow-row"><span>TEXAS GULF COAST</span><i />SHARED INCIDENT STATE v{incident.version}</div>
            <h1>Houston–Galveston Incident Room</h1>
            <p>One shared operational picture for conditions, infrastructure exposure and governed action.</p>
          </div>
          <div className="hero-state">
            <div className="state-posture">
              <span>CURRENT STATE</span>
              <strong className={riskClass(incident.severity)}>{incident.severity}</strong>
            </div>
            <div className="state-condition">
              <span>PRIMARY CONDITION</span>
              <strong>{assessments.weather.headline}</strong>
              <time>Updated {formatTime(incident.updatedAt, true)} CT</time>
            </div>
            <small className={sourceGap ? "state-trust state-trust-attention" : "state-trust"}>
              <i />{sourceGap ? `${sourceGap.name} needs attention` : `${reportingSources}/${intelligence.sources.length} critical sources live or verified`}
            </small>
            <button className="refresh-button" onClick={() => void refreshIntelligence()} disabled={refreshState === "loading"}>
              <span className={refreshState === "loading" ? "refresh-spinning" : ""}>↻</span>
              {refreshState === "loading" ? "Refreshing intelligence…" : "Refresh live intelligence"}
            </button>
          </div>
        </section>

        <section className="overview-command-deck overview-only" aria-label="Command priorities and decision queue">
          <section className="command-brief" aria-label="Operational exceptions and priorities">
            <div className="command-brief-heading">
              <div><span className="section-kicker">COMMAND BRIEF</span><h2>What requires attention now</h2></div>
              <span>Normal records are collapsed</span>
            </div>
            <div className="command-metrics">
              <article className={weather.activeAlerts.length === 0 ? "metric-normal" : ""}><span>ACTIVE WARNINGS</span><strong>{weather.activeAlerts.length}</strong><small>{weather.activeAlerts.length === 0 ? "No active NWS warnings" : "Review authoritative alert detail"}</small></article>
              <article className={closureImpacts.length === 0 ? "metric-normal" : "metric-attention"}><span>RESTRICTED / CLOSED</span><strong>{closureImpacts.length}</strong><small>{highestPriorityImpact?.location ?? "No confirmed transport restriction"}</small></article>
              <article className={elevatedGauges.length === 0 ? "metric-normal" : "metric-attention"}><span>ELEVATED GAUGES</span><strong>{elevatedGauges.length}</strong><small>{elevatedGauges[0]?.name ?? `${water.riverGauges.length} gauges reporting normally`}</small></article>
              <article className={elevatedAssets === 0 ? "metric-normal" : "metric-attention"}><span>ASSETS TO WATCH</span><strong>{elevatedAssets}</strong><small>{assets.length} priority assets screened</small></article>
            </div>
            <div className="command-priorities">
              <button onClick={() => document.getElementById("operational-map")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>01 · SPATIAL PICTURE</span><strong>Inspect warnings, disruptions and exposed infrastructure</strong><small>View the command map →</small></button>
              <button onClick={() => changeWorkspace("intelligence", closureImpacts.length > 0 ? "transport" : "flood")}><span>02 · LIVE EVIDENCE</span><strong>{highestPriorityImpact ? `${highestPriorityImpact.status}: ${highestPriorityImpact.location}` : assessments.weather.headline}</strong><small>Open detailed intelligence →</small></button>
              <button onClick={() => setDecisionOpen(true)}><span>03 · GOVERNED ACTION</span><strong>{packetQueued ? selectedCourse.title : assessments.operations.headline}</strong><small>{packetQueued ? "Packet awaiting named approval" : "Review decision packet"} →</small></button>
            </div>
          </section>

          <aside className="decision-focus" aria-label="Decision queue">
            <span className="section-kicker">DECISION QUEUE</span>
            <div className={`decision-focus-status decision-status-${packetStatus.toLowerCase()}`}><i />{packetStatus === "DRAFT" ? "HUMAN REVIEW REQUIRED" : packetStatus.replace("_", " ")}</div>
            <h2>{packetStatus === "APPROVED" ? "A governed action set is active" : packetStatus === "DEFERRED" ? "Decision held for more analysis" : packetQueued ? "One packet awaits approval" : "One decision is ready for review"}</h2>
            <strong>{selectedCourse.title}</strong>
            <p>{packetStatus === "APPROVED" ? `${openTasks} action${openTasks === 1 ? "" : "s"} open · ${completedTasks}/${actionTasks.length} completed. Communications remain held for explicit release.` : packetStatus === "DEFERRED" ? "The packet remains unapproved while additional evidence is gathered. No task or message has been released." : packetQueued ? "The packet is held until a named authority accepts its exact evidence and action scope." : "Verify critical-asset readiness before the next forecast frame if operational conditions change."}</p>
            <dl>
              <div><dt>Authority</dt><dd>Kye Hussain</dd></div>
              <div><dt>Evidence</dt><dd>{reportingSources}/{intelligence.sources.length} sources ready</dd></div>
              <div><dt>First action</dt><dd>Reversible readiness check</dd></div>
            </dl>
            <button onClick={() => setDecisionOpen(true)}>{packetStatus === "APPROVED" ? "Review action set" : packetQueued ? "Open approval packet" : "Review decision packet"} →</button>
          </aside>
        </section>

        <section className="intelligence-tabs intelligence-only" aria-label="Intelligence categories">
          <div><span className="section-kicker">DEEP INTELLIGENCE</span><h2>Open one evidence lane at a time</h2></div>
          <nav>
            {intelligenceTabs.map((tab) => (
              <button key={tab.id} className={activeIntelligenceTab === tab.id ? "selected" : ""} onClick={() => setActiveIntelligenceTab(tab.id)} aria-pressed={activeIntelligenceTab === tab.id}>{tab.label}</button>
            ))}
          </nav>
        </section>

        <section className="source-health-panel intelligence-only tab-sources" aria-label="Operational source health and provenance">
          <div className="source-health-heading">
            <div><span className="section-kicker">SOURCE HEALTH &amp; PROVENANCE</span><h2>Every operational claim has a visible data state.</h2></div>
            <span>{reportingSources}/{intelligence.sources.length} live or verified</span>
          </div>
          <div className="source-health-grid">
            {intelligence.sources.map((source) => (
              <article className={`source-health-card source-state-${source.status.toLowerCase()}`} key={source.id}>
                <header><span><i />{source.status}</span><small>{sourceFreshnessLabel(source)}</small></header>
                <strong>{source.name}</strong>
                <p>{source.role}</p>
                <dl>
                  <div><dt>Event time</dt><dd>{source.eventTime ? `${formatTime(source.eventTime, true)} CT` : "Not available"}</dd></div>
                  <div><dt>Received</dt><dd>{formatTime(source.receivedAt, true)} CT</dd></div>
                </dl>
                <footer>{source.message}{source.fallback ? <small>Fallback: {source.fallback}</small> : null}</footer>
              </article>
            ))}
          </div>
        </section>

        <section className="operational-workspace primary-map-workspace" id="operational-map">
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
              <div><span className="section-kicker">{activeWorkspace === "overview" ? "MAIN" : activeHazard.label.toUpperCase()} OPERATIONAL MAP</span><h2>{activeWorkspace === "overview" ? "The shared spatial picture" : "Exposure and forecast workspace"}</h2></div>
              <div className="map-layer-controls">
                {(["Risk", "Impact", "Assets"] as const).map((layer) => (
                  <button key={layer} className={mapLayer === layer ? "selected" : ""} onClick={() => setMapLayer(layer)} aria-pressed={mapLayer === layer}>{layer}</button>
                ))}
              </div>
            </div>
            <OperationalMap
              alerts={weather.activeAlerts}
              assets={assets}
              assetRegister={assetRegister}
              operationalImpacts={operationalImpacts}
              water={water}
              rainfall={rainfall}
              layer={mapLayer}
              forecastHour={forecastHour}
              forecastValidAt={selectedForecastFrame?.startTime ?? null}
              hazard={activeHazard.id}
              active={activeWorkspace === "map" || activeWorkspace === "overview"}
              onFeatureSelect={setSelectedMapFeature}
              onOpenInfrastructure={openInfrastructureContext}
            />
            <div className="forecast-control">
              <div>
                <span className="section-kicker">TIME-BASED FORECAST</span>
                <strong>{selectedForecastFrame ? `${formatTime(selectedForecastFrame.startTime, true)} CT · ${selectedForecastFrame.summary}` : `${weather.forecast.period} · ${weather.forecast.summary}`}</strong>
                <small>LIVE HOURLY NWS · issued frame · valid time shown</small>
              </div>
              <div className="forecast-track">
                <input aria-label="NWS hourly forecast frame" type="range" min="0" max={Math.max(0, forecastFrames.length - 1)} step="1" value={Math.min(forecastFrameIndex, Math.max(0, forecastFrames.length - 1))} onChange={(event) => setForecastFrameIndex(Number(event.target.value))} />
                <div>{forecastMarkIndexes.map((index) => <span key={index}>{index === 0 ? "Now" : `+${forecastOffsetHours(firstForecastTime, forecastFrames[index]?.startTime ?? firstForecastTime)}h`}</span>)}</div>
              </div>
              <div className="forecast-frame-metrics">
                <span><small>RAIN</small><strong>{selectedForecastFrame?.precipitationChance ?? "—"}%</strong></span>
                <span><small>TEMP / FEELS</small><strong>{selectedForecastFrame?.temperatureC ?? "—"}° / {selectedForecastFrame?.heatIndexC ?? "—"}°</strong></span>
                <span><small>WIND</small><strong>{selectedForecastFrame?.windDirection ?? "—"} {selectedForecastFrame?.windSpeedMph ?? "—"} mph</strong></span>
              </div>
              <div className="forecast-confidence"><span>{assessments.weather.confidence}%</span><small>weather confidence</small></div>
            </div>
          </div>
        </section>

        <section className="overview-supporting-intelligence overview-only" aria-label="Supporting live intelligence">
          <div className="overview-supporting-heading">
            <div><span className="section-kicker">SUPPORTING INTELLIGENCE</span><h2>Conditions, water and the evidence flow behind the map.</h2></div>
            <button onClick={() => changeWorkspace("intelligence")}>Open full intelligence →</button>
          </div>

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
            <div><span>FLOOD ZONES</span><strong>{floodZoneStatusLabel(water.floodZoneStatus)}</strong><small>{water.floodZones.features.length > 0 ? `${water.floodZones.features.length} mapped features` : "Gauge feeds unaffected"}</small></div>
          </section>

          <section className="shared-state" aria-label="Shared incident state flow">
            <span className="shared-label">ONE SHARED INCIDENT STATE</span>
            <div><span>NWS + rainfall + water + official assets</span><i>→</i><span>Weather</span><i>→</i><span>Infrastructure</span><i>→</i><span>Operations</span><i>→</i><span>Communications</span></div>
            <small>Each specialist reads the accepted findings before it and publishes evidence-bound output back to the same incident.</small>
          </section>
        </section>

        <section className="asset-register-panel intelligence-only tab-infrastructure" aria-label="Official infrastructure reference register">
          <div className="section-heading">
            <div><span className="section-kicker">AUTHORITATIVE ASSET REGISTER v1</span><h2>Real infrastructure, separated from live condition evidence</h2></div>
            <span className={`water-health ${assetRegister.warnings.length === 0 ? "water-health-live" : "water-health-partial"}`}><i />{assetRegister.features.length} REFERENCE RECORDS</span>
          </div>
          {assetRegister.warnings.length > 0 && <div className="water-notices">{assetRegister.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
          <div className="asset-register-summary">
            <article><span>CRITICAL FACILITIES</span><strong>{assetRegister.counts.HOSPITAL + assetRegister.counts.FIRE_EMS + assetRegister.counts.LAW_ENFORCEMENT}</strong><small>{assetRegister.counts.HOSPITAL} hospitals · {assetRegister.counts.FIRE_EMS} fire / EMS · {assetRegister.counts.LAW_ENFORCEMENT} law enforcement</small></article>
            <article><span>BRIDGE WATCH</span><strong>{assetRegister.counts.BRIDGE}</strong><small>Fair or poor FHWA NBI records in the operating area</small></article>
            <article><span>PRIMARY ROAD SEGMENTS</span><strong>{assetRegister.counts.HIGHWAY}</strong><small>Interstate and principal-arterial NHS geometry</small></article>
            <article><span>DRAINAGE AREAS</span><strong>{assetRegister.counts.WATERSHED}</strong><small>HCFCD regional watershed boundaries</small></article>
          </div>
          <div className="asset-register-boundary">
            <span><i />REFERENCE ≠ LIVE STATUS</span>
            <div><strong>The register answers “what infrastructure is here?”</strong><p>Osprey then screens a smaller priority watchlist against live NWS alerts, NOAA rainfall, river and coastal readings, terrain height and FEMA flood-zone context. A mapped bridge condition or facility location does not prove that it is closed, damaged or flooded now.</p></div>
            <small>{assets.length} priority assets selected for current exposure screening<br />Register refreshed {formatTime(assetRegister.fetchedAt, true)} CT</small>
          </div>
        </section>

        <section className="operational-impact-panel intelligence-only tab-transport" aria-label="Live reported and verified transport disruptions">
          <div className="section-heading">
            <div><span className="section-kicker">LIVE OPERATIONAL IMPACTS v1</span><h2>From possible exposure to reported disruption</h2></div>
            <span className={`water-health ${operationalImpacts.sourceHealth.status === "LIVE" ? "water-health-live" : "water-health-partial"}`}><i />{operationalImpacts.sourceHealth.status} HOUSTON TRANSTAR</span>
          </div>
          {operationalImpacts.warnings.length > 0 && <div className="water-notices">{operationalImpacts.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
          <div className="operational-impact-summary">
            <article><span>ACTIVE / RECENT</span><strong>{activeOperationalImpacts.length}</strong><small>Resolved records are retained for provenance but hidden from the map</small></article>
            <article><span>CONFIRMED IMPACTS</span><strong>{confirmedOperationalImpacts.length}</strong><small>Verified incidents, restrictions and closures</small></article>
            <article><span>RESTRICTED / CLOSED</span><strong>{closureImpacts.length}</strong><small>Active lane restrictions or total closures</small></article>
            <article><span>NEAR INFRASTRUCTURE</span><strong>{linkedOperationalImpacts.length}</strong><small>Within 3 km of an official mapped asset or corridor</small></article>
          </div>
          <div className="impact-status-key" aria-label="Operational impact confidence states">
            <span><b className="impact-reported" />REPORTED<small>Authority report received; not yet verified as a closure</small></span>
            <span><b className="impact-verified" />VERIFIED<small>TranStar operator verification is present</small></span>
            <span><b className="impact-restricted" />RESTRICTED<small>An active lane restriction is reported</small></span>
            <span><b className="impact-closed" />CLOSED<small>A total closure is reported active</small></span>
          </div>
          {activeOperationalImpacts.length > 0 ? (
            <div className="operational-impact-list">
              {displayedOperationalImpacts.map((impact) => (
                <article key={impact.id} className={`operational-impact-card impact-card-${impact.status.toLowerCase()}`}>
                  <header><span>{impact.kind.replaceAll("_", " ")}</span><b>{impact.status}</b></header>
                  <h3>{impact.location}</h3>
                  <p>{impact.title.split(" · ").at(-1)} · {impact.description}</p>
                  <dl>
                    {impact.lanesAffected && <div><dt>Lanes</dt><dd>{impact.lanesAffected}</dd></div>}
                    {impact.duration && <div><dt>Duration</dt><dd>{impact.duration}</dd></div>}
                    <div><dt>Rainfall</dt><dd>{impact.rainfallIn[1] ?? "—"} in / 1h · {impact.rainfallIn[24] ?? "—"} in / 24h · {impact.rainfallScreening.toLowerCase()}</dd></div>
                    <div><dt>Infrastructure</dt><dd>{impact.nearbyInfrastructure.length > 0 ? impact.nearbyInfrastructure.map((nearby) => `${nearby.name} (${nearby.distanceKm} km)`).join(" · ") : "No official register feature within 3 km"}</dd></div>
                  </dl>
                  <footer><span>{impact.source}</span><small>Updated {formatTime(impact.observedAt, true)} CT</small></footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="no-operational-impacts"><i>✓</i><strong>No active mapped transport disruptions</strong><p>Osprey has not inferred an impact from hazard exposure alone.</p></div>
          )}
          <p className="impact-source-boundary">Showing up to 10 highest-certainty or highest-impact active records; all active records remain mapped. Operational awareness only. Houston TranStar’s published status is reproduced without inferring road passability beyond the stated incident or closure. “Active” scheduled work is separated from a confirmed total closure. Alternative routing is intentionally deferred until a verified routing source is connected. Obtain TxDOT permission before broader redistribution of TranStar content.</p>
        </section>

        <section className="rainfall-depth-panel intelligence-only tab-flood" aria-label="Radar-estimated rainfall accumulation and runoff screening">
          <div className="section-heading">
            <div><span className="section-kicker">RAINFALL &amp; RUNOFF SCREENING v1</span><h2>Radar accumulation translated into asset context</h2></div>
            <span className={`water-health ${rainfall.sourceHealth.status === "LIVE" ? "water-health-live" : "water-health-partial"}`}><i />{rainfall.sourceHealth.status} NOAA MRMS</span>
          </div>
          {rainfall.warnings.length > 0 && <div className="water-notices">{rainfall.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
          <div className="rainfall-summary-grid">
            {rainfall.periods.map((period) => (
              <div key={period}><span>MAXIMUM {period}H</span><strong>{rainfallMaxByPeriod[period] == null ? "—" : `${rainfallMaxByPeriod[period]?.toFixed(2)} in`}</strong><small>{rainfall.validAt[period] ? `Valid ${formatTime(rainfall.validAt[period]!, true)} CT` : "Valid time pending"}</small></div>
            ))}
            <div><span>POINTS TO WATCH</span><strong>{rainfallWatchPoints}</strong><small>{rainfallCoreSamples.length} centre / asset cells · {rainfallImpactSamples} disruption cells</small></div>
          </div>
          <div className="rainfall-boundary-note">
            <span><i />INTERPRETATION BOUNDARY</span>
            <div><strong>Rainfall estimates describe water input—not flooding on the ground.</strong><p>NOAA/NWS MRMS provides radar-only accumulation on an approximately {rainfall.resolutionKm} km grid. Osprey combines it with river stages, coastal levels, terrain and FEMA context; it does not treat rainfall alone as proof that a road or asset is flooded.</p></div>
            <small>Osprey screening begins at 0.5 in / 1h, 1 in / 3h, 1.5 in / 6h or 2 in / 24h. These are transparent triage rules, not official warning thresholds.</small>
          </div>
          <div className="rainfall-point-grid">
            {rainfallCoreSamples.map((sample) => (
              <article key={sample.id} className={`rainfall-point-card rainfall-screen-${sample.screening.toLowerCase()}`}>
                <header><span>{sample.id}</span><b>{sample.screening}</b></header>
                <h3>{sample.name}</h3>
                <div>
                  {rainfall.periods.map((period) => <span key={period}><small>{period}H</small><strong>{sample.accumulationIn[period] == null ? "—" : `${sample.accumulationIn[period]?.toFixed(2)} in`}</strong></span>)}
                </div>
                <footer>NOAA/NWS MRMS QPE · {sample.latitude.toFixed(3)}, {sample.longitude.toFixed(3)}</footer>
              </article>
            ))}
          </div>
        </section>

        <section className="water-depth-panel intelligence-only tab-flood" aria-label="River and coastal station detail">
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
          <div className={`fema-freshness-note fema-status-${water.floodZoneStatus.toLowerCase()}`}>
            <span><i />FLOOD-ZONE REFERENCE</span>
            <div>
              <strong>{floodZoneStatusLabel(water.floodZoneStatus)}</strong>
              <p>{water.floodZoneStatus === "PENDING"
                ? "The latest refresh could not complete. Osprey is retaining the last complete, verified FEMA NFHL snapshot instead of removing the overlay."
                : water.floodZoneStatus === "UNAVAILABLE"
                  ? "No verified regional flood-zone snapshot is currently available. River and coastal observations remain unaffected."
                  : water.floodZoneStatus === "DEMO"
                    ? "Loading the verified FEMA NFHL regional snapshot. River and coastal observations connect independently."
                  : `${water.floodZones.features.length} Special Flood Hazard Area polygons are available for map display and feature identification. The overlay is mapped hazard context, not live inundation.`}</p>
            </div>
            <small>
              {water.floodZoneMetadata.publisher}<br />
              Data updated {water.floodZoneMetadata.dataUpdatedAt ? formatTime(water.floodZoneMetadata.dataUpdatedAt, true) : "—"} CT · verified {water.floodZoneMetadata.verifiedAt ? formatTime(water.floodZoneMetadata.verifiedAt, true) : "—"} CT<br />
              Background refresh every {water.floodZoneMetadata.refreshIntervalDays} days
            </small>
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
          <p className="water-boundary">Operational awareness only. Gauge observations can be provisional; cached thresholds may intentionally lag live levels by up to 24 hours because they are slowly changing reference metadata. FEMA NFHL zones describe mapped hazard, not current inundation; Osprey retains the last verified complete snapshot when a refresh fails. Infrastructure identities come from official reference inventories, but their current operating condition is not inferred.</p>
        </section>

        <section className="agent-section intelligence-only tab-agents" id="agents">
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

        <section className="approvals-workspace decisions-only" aria-label="Decisions and actions approval centre">
          <header className="approvals-header">
            <div><span className="section-kicker">HUMAN APPROVAL CENTRE</span><h1>Decisions &amp; Actions</h1><p>Review operational actions proposed by Osprey’s agents. Nothing consequential happens without your approval.</p></div>
            <span className="approvals-boundary">SIMULATION · HUMAN AUTHORITY REQUIRED</span>
          </header>
          <nav className="approval-tabs" aria-label="Approval views">
            <button className={approvalTab === "needs" ? "approval-tab-selected" : ""} onClick={() => setApprovalTab("needs")} aria-pressed={approvalTab === "needs"}>Needs your decision <b>{packetStatus === "DRAFT" ? "1" : "0"}</b></button>
            <button className={approvalTab === "progress" ? "approval-tab-selected" : ""} onClick={() => setApprovalTab("progress")} aria-pressed={approvalTab === "progress"}>In progress <b>{packetStatus === "APPROVED" || packetStatus === "PENDING_APPROVAL" ? "1" : "0"}</b></button>
            <button className={approvalTab === "history" ? "approval-tab-selected" : ""} onClick={() => setApprovalTab("history")} aria-pressed={approvalTab === "history"}>Decision history <b>{decisionTimeline.length}</b></button>
          </nav>

          {approvalTab === "needs" && (
            <div className="approval-review-layout">
              <aside className="approval-queue" aria-label="Approval queue">
                <div><span className="section-kicker">OPEN PROPOSALS</span><strong>{packetStatus === "DRAFT" ? "1 needs your decision" : "No proposal awaiting decision"}</strong></div>
                {packetStatus === "DRAFT" ? <button className="proposal-card proposal-selected" onClick={() => setDecisionOpen(true)}><span>DECISION NEEDED <i>Before next forecast frame</i></span><strong>{activeDecisionTitle}</strong><p>Houston–Galveston priority assets · proposed by Operations Agent</p><small><b>{sourceEvidence.length}</b> supporting evidence items · <em>1 challenge</em></small></button> : <p className="approval-empty">{packetStatus === "DEFERRED" ? "Additional analysis has been requested. The proposal will return here when the evidence is ready." : packetStatus === "REJECTED" ? "The proposed action was not authorised. Its decision record remains in history." : "This queue is clear. Active approved work appears under In progress."}</p>}
              </aside>
              <article className="approval-review">
                <span className="section-kicker">REVIEW PROPOSAL</span>
                <div className="review-title-row"><div><h2>{activeDecisionTitle}</h2><p>Prepare a controlled internal readiness response for exposed healthcare, transport and bridge assets.</p></div><span>PROPOSED</span></div>
                <div className="review-facts"><div><span>Decision needed</span><strong>Before next forecast frame</strong></div><div><span>Proposed by</span><strong>Operations Agent</strong></div><div><span>Operational scope</span><strong>Houston–Galveston priority assets</strong></div></div>
                <div className="review-sections">
                  <section><span>WHY THIS IS BEING PROPOSED</span><p>{assessments.operations.summary}</p></section>
                  <section className="review-evidence"><span>EVIDENCE</span>{sourceEvidence.map((evidence) => <button key={evidence.id} onClick={() => { setActiveWorkspace("intelligence"); setActiveIntelligenceTab(evidence.id.startsWith("NWS") ? "weather" : "infrastructure"); window.location.hash = "intelligence"; }}><i />{evidence.label}<small>{evidence.source} · {formatTime(evidence.observedAt)} CT</small></button>)}</section>
                  <section className="review-challenge"><span>UNCERTAINTY &amp; CHALLENGE</span><p><b>Weather confidence: {assessments.weather.confidence}%.</b> Verify owner readiness before escalating action; current evidence supports preparation, not a public release.</p></section>
                  <section className="review-effect"><span>WHAT APPROVAL WILL DO</span><p>It will open three reversible readiness tasks and prepare an internal briefing. It will not control infrastructure or send external communications.</p></section>
                </div>
                <button className="review-proposal-button" onClick={() => setDecisionOpen(true)}>{packetStatus === "DRAFT" ? "Review and decide" : "Open decision record"} →</button>
              </article>
            </div>
          )}
        </section>

        <div className="operations-grid intelligence-only intelligence-operations">
          <section className="asset-panel tab-infrastructure" id="assets">
            <div className="panel-heading">
              <div><span className="section-kicker">PRIORITY ASSET WATCHLIST</span><h2>Critical assets</h2></div>
              <span>{elevatedAssets} require monitoring</span>
            </div>
            <div className="asset-list">
              {assets.map((asset) => (
                <article key={asset.id}>
                  <span className={`asset-state asset-${asset.exposure.toLowerCase()}`}>{asset.exposure}</span>
                  <div><strong>{asset.name}</strong><small>{asset.type} · {asset.location} · {asset.elevationM == null ? "elevation pending" : `${Math.round(asset.elevationM)} m USGS elevation`}{asset.condition ? ` · ${asset.condition} reference condition` : ""}</small><p>{asset.reason}</p><em>{asset.source}{asset.reference ? ` · ${asset.reference}` : ""}</em></div>
                  <span className="criticality">{asset.criticality}</span>
                </article>
              ))}
            </div>
            <p className="fixture-note">Watchlist identities and coordinates come from official USGS and FHWA reference inventories. Osprey maps them against live hazard evidence; it does not claim live facility or bridge operating status.</p>
          </section>

          <section className="alert-panel tab-weather">
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

        {approvalTab === "progress" && <>
        <section className="action-panel decisions-only" id="actions">
          <div className="graph-heading">
            <div><span className="section-kicker">DECISION-TO-OUTCOME CHAIN</span><h2>One governed operational thread</h2></div>
            <span className="action-gate">{packetStatus === "APPROVED" ? "Internal actions active · external messages held" : "External effects held at approval gate"}</span>
          </div>
          <div className="action-chain">
            {[
              { stage: "Decision", title: packetQueued ? selectedCourse.title : "Review operational posture", detail: `${selectedOption} · exact evidence state v${incident.version}`, status: packetStatus === "APPROVED" ? "approved" : packetQueued ? "queued" : "gated" },
              { stage: "Tasks", title: "Verify critical-asset readiness", detail: packetApproved ? `${openTasks} open · ${completedTasks}/${actionTasks.length} complete` : `${actionTasks.length} owners · deadlines prepared`, status: packetApproved ? "active" : "ready" },
              { stage: "Communications", title: assessments.communications.headline, detail: packetApproved ? "Prepared for explicit release after owner acknowledgement" : "Audience and release conditions retained", status: "pending" },
              { stage: "Outcome", title: "Confirm continuity and access", detail: packetApproved ? "Track completion, exceptions and continuity checks" : "Measure acknowledgements and exceptions", status: "measuring" },
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

        <section className="execution-panel decisions-only" aria-label="Action ownership and controlled communications">
          <div className="graph-heading">
            <div><span className="section-kicker">ACTION OWNERSHIP</span><h2>Controlled work released from the decision</h2></div>
            <span className={`execution-state execution-${packetStatus.toLowerCase()}`}>{packetStatus === "APPROVED" ? `${openTasks} open · ${completedTasks} complete` : packetStatus === "PENDING_APPROVAL" ? "Awaiting named approval" : "Held behind approval gate"}</span>
          </div>
          <div className="execution-grid">
            <div className="task-list">
              {actionTasks.map((task) => (
                <article className={`task-card task-${task.status.toLowerCase()}`} key={task.id}>
                  <header><span>{task.id}</span><b>{task.status}</b></header>
                  <strong>{task.title}</strong>
                  <p><span>Owner</span>{task.owner}</p>
                  <p><span>Due</span>{task.due}</p>
                  {packetApproved && task.status !== "COMPLETE" ? <button onClick={() => progressTask(task.id)}>{task.status === "OPEN" ? "Acknowledge task" : "Mark complete"} →</button> : <small>{packetApproved ? "Completion recorded" : "Opens only after named approval"}</small>}
                </article>
              ))}
            </div>
            <aside className="communication-hold">
              <span className="section-kicker">GOVERNED COMMUNICATION</span>
              <strong>Internal readiness briefing</strong>
              <p>Prepared for healthcare, infrastructure and transport owners. It remains a draft until a named human authorises release.</p>
              <dl><div><dt>Audience</dt><dd>3 owner groups</dd></div><div><dt>Release rule</dt><dd>Explicit communication approval</dd></div><div><dt>State</dt><dd>Held · no external effect</dd></div></dl>
            </aside>
          </div>
        </section>
        </>}

        {approvalTab === "history" && <section className="timeline-panel decisions-only" id="timeline">
          <div className="section-heading">
            <div><span className="section-kicker">INCIDENT TIMELINE</span><h2>What Osprey knew, and when</h2></div>
            <span className="audit-label">AUDIT TRAIL · {decisionTimeline.length} EVENTS</span>
          </div>
          <div className="timeline-list">
            {decisionTimeline.map((event, index) => (
              <article key={event.id}>
                <time>{formatTime(event.occurredAt)}<small>CT</small></time>
                <div className="timeline-line"><i /><span /></div>
                <div><span>{event.actor}</span><strong>{event.title}</strong><p>{event.detail}</p><small>{event.evidenceIds.join(" · ")}</small></div>
                <b>{String(index + 1).padStart(2, "0")}</b>
              </article>
            ))}
          </div>
        </section>}

        <footer className="room-footer">
          <span>OSPREY · AI-NATIVE INCIDENT COMMAND</span>
          <p>Live environmental data. Representative infrastructure. No real-world action execution.</p>
        </footer>
      </section>

      {decisionOpen && (
        <div className="decision-overlay" role="presentation">
          <section className="decision-drawer" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <header>
              <div><span className="section-kicker">GOVERNED DECISION PACKET · DP-HGX-01</span><h2 id="decision-title">{approvalConfirm ? "Confirm approval" : activeDecisionTitle}</h2><p>{approvalConfirm ? "Review exactly what you are authorising before the simulated action set is opened." : "Compare options against the same live weather and authoritative priority-asset evidence. No task, message or real-world action is released without named human approval."}</p></div>
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
              {editingDecision && <label className="decision-edit"><span>EDITED ACTION SCOPE</span><input value={editedDecision} onChange={(event) => setEditedDecision(event.target.value)} placeholder={selectedCourse.title} /><small>The original proposal remains visible in the audit record. Your edit will be recorded as the human-approved version.</small></label>}
            </div>
            {approvalConfirm && <div className="approval-confirmation"><span>YOU ARE APPROVING</span><strong>{activeDecisionTitle}</strong><p>This will simulate assigning three reversible readiness tasks and preparing an internal briefing. It will not release an external communication or control infrastructure.</p><dl><div><dt>Authority</dt><dd>Kye Hussain</dd></div><div><dt>Evidence state</dt><dd>{sourceEvidence.length} records · state v{incident.version}</dd></div></dl></div>}
            <footer>
              <p><strong>Demonstration boundary:</strong> this simulates governance only; no task, message or real-world action is released outside Osprey.</p>
              {approvalConfirm ? <button className="secondary-action" onClick={() => setApprovalConfirm(false)}>Go back</button> : <button className="secondary-action" onClick={() => { appendWorkflowEvent("Additional analysis requested", "The decision owner requested further evidence before approving this proposal."); setPacketStatus("DEFERRED"); setDecisionOpen(false); }}>Request more analysis</button>}
              {!approvalConfirm && <button className="secondary-action" onClick={() => setEditingDecision((editing) => !editing)}>{editingDecision ? "Save revised action" : "Edit before approving"}</button>}
              {!approvalConfirm && <button className="reject-action" onClick={rejectProposal}>Reject proposal</button>}
              {approvalConfirm ? <button className="primary-action" onClick={approvePacket}>Confirm approval</button> : packetStatus === "APPROVED" ? <button className="primary-action" onClick={() => setDecisionOpen(false)}>Actions are active</button> : <button className="primary-action" onClick={() => setApprovalConfirm(true)}>Approve action</button>}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
