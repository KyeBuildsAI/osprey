export type Confidence = "low" | "medium" | "high";
export type AgentState = "working" | "ready" | "waiting";
export type EvidenceKind = "forecast" | "observation" | "infrastructure" | "exposure";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  source: string;
  observedAt: string;
  confidence: Confidence;
  summary: string;
  provenance: string;
  receivedAt: string;
  challengeStatus: "verified" | "under-review";
}

export interface SpecialistAgent {
  id: string;
  name: string;
  remit: string;
  status: string;
  state: AgentState;
}

export interface CourseOfAction {
  id: string;
  title: string;
  posture: "monitor" | "prepare" | "act";
  summary: string;
  benefit: string;
  tradeoff: string;
  evidenceCount: number;
}

export interface Incident {
  id: string;
  name: string;
  hazard: string;
  region: string;
  status: "active" | "monitoring" | "resolved";
  severity: "minor" | "moderate" | "major" | "severe";
  openedAt: string;
  lastUpdatedAt: string;
}

export interface HazardView {
  id: "flood" | "wind" | "landslide" | "heat";
  label: string;
  status: string;
  tone: "active" | "elevated" | "watch" | "clear";
  focus: string;
  exposed: string;
}

export interface Connector {
  name: string;
  detail: string;
  freshness: string;
  state: "live" | "delayed";
}

export interface ActionStage {
  id: string;
  stage: string;
  title: string;
  detail: string;
  status: "ready" | "gated" | "pending" | "measuring";
}

export interface OperationalMeasure {
  label: string;
  value: string;
  change: string;
  detail: string;
}

export const demoIncident: Incident = {
  id: "INC-2026-0816",
  name: "Storm Ember",
  hazard: "Severe flooding",
  region: "Northwest England",
  status: "active",
  severity: "major",
  openedAt: "2026-08-16T10:12:00Z",
  lastUpdatedAt: "2026-08-16T10:44:18Z",
};

export const demoAgents: SpecialistAgent[] = [
  { id: "meteorology", name: "Meteorology", remit: "Forecast synthesis", status: "Reporting", state: "working" },
  { id: "infrastructure", name: "Infrastructure", remit: "Roads, rail & power", status: "Scanning", state: "working" },
  { id: "community", name: "Community impact", remit: "Exposure analysis", status: "2 findings", state: "ready" },
  { id: "challenge", name: "Challenge", remit: "Evidence review", status: "Reviewing", state: "working" },
];

export const demoEvidence: Evidence[] = [
  {
    id: "EV-038",
    kind: "forecast",
    title: "River Eden forecast revised",
    source: "Meteorology",
    observedAt: "10:42",
    confidence: "high",
    summary: "Peak level moved forward by 90 minutes.",
    provenance: "EA-RIVER-EDEN-4421",
    receivedAt: "10:42:18",
    challengeStatus: "verified",
  },
  {
    id: "EV-037",
    kind: "infrastructure",
    title: "A66 disruption confirmed",
    source: "Infrastructure",
    observedAt: "10:37",
    confidence: "high",
    summary: "Standing water reported east of Penrith.",
    provenance: "NATIONAL-HIGHWAYS-A66-91",
    receivedAt: "10:37:06",
    challengeStatus: "verified",
  },
  {
    id: "EV-036",
    kind: "exposure",
    title: "Care facilities in exposure zone",
    source: "Community impact",
    observedAt: "10:29",
    confidence: "medium",
    summary: "Three sites require verification before 12:00.",
    provenance: "CUMBRIA-ASSET-REGISTER-208",
    receivedAt: "10:29:44",
    challengeStatus: "under-review",
  },
];

export const demoHazardViews: HazardView[] = [
  { id: "flood", label: "Flood", status: "Major", tone: "active", focus: "River Eden catchment", exposed: "14,280 people" },
  { id: "wind", label: "Wind", status: "Elevated", tone: "elevated", focus: "Western power network", exposed: "6 critical assets" },
  { id: "landslide", label: "Landslide", status: "Watch", tone: "watch", focus: "A686 escarpments", exposed: "2 transport links" },
  { id: "heat", label: "Heat", status: "Clear", tone: "clear", focus: "No active threshold", exposed: "No priority exposure" },
];

export const demoConnectors: Connector[] = [
  { name: "Met Office", detail: "UKV ensemble", freshness: "18 sec", state: "live" },
  { name: "Flood monitoring", detail: "River gauges", freshness: "42 sec", state: "live" },
  { name: "Local GIS", detail: "Impact zones", freshness: "1 min", state: "live" },
  { name: "Asset register", detail: "People & places", freshness: "4 min", state: "live" },
  { name: "IoT sensors", detail: "Road & drainage", freshness: "7 min", state: "delayed" },
];

export const demoActionChain: ActionStage[] = [
  { id: "decision", stage: "Decision", title: "Prepare targeted support", detail: "COA-02 · 12 verified findings", status: "gated" },
  { id: "tasks", stage: "Tasks", title: "Stage transport and welfare teams", detail: "3 owners · 18 minute target", status: "ready" },
  { id: "communications", stage: "Communications", title: "Notify facilities and responders", detail: "3 audiences · message held", status: "pending" },
  { id: "outcome", stage: "Outcome", title: "Confirm readiness before peak", detail: "Measure acknowledgements and mobilisation", status: "measuring" },
];

export const demoOperationalMeasures: OperationalMeasure[] = [
  { label: "Response time", value: "18m", change: "−34%", detail: "Decision to team mobilisation" },
  { label: "Decision quality", value: "87%", change: "+9 pts", detail: "Evidence coverage and challenge score" },
  { label: "Operator workload", value: "3", change: "−6", detail: "Manual coordination steps remaining" },
];

export const demoCoursesOfAction: CourseOfAction[] = [
  {
    id: "COA-01",
    title: "Monitor and verify",
    posture: "monitor",
    summary: "Maintain current posture while field teams verify the three exposed facilities.",
    benefit: "Avoids premature mobilisation while evidence remains incomplete.",
    tradeoff: "Leaves less time to act if river levels accelerate.",
    evidenceCount: 8,
  },
  {
    id: "COA-02",
    title: "Prepare targeted support",
    posture: "prepare",
    summary: "Pre-position transport and welfare support near the three facilities without relocating residents.",
    benefit: "Shortens response time while preserving flexibility.",
    tradeoff: "Commits limited resources before every exposure is verified.",
    evidenceCount: 12,
  },
  {
    id: "COA-03",
    title: "Initiate precautionary relocation",
    posture: "act",
    summary: "Begin a controlled relocation of the most exposed facility before the forecast peak.",
    benefit: "Creates the largest safety margin for vulnerable residents.",
    tradeoff: "Consequential action based on a forecast with remaining uncertainty.",
    evidenceCount: 10,
  },
];
