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
  { id: "challenge", name: "Challenge", remit: "Evidence review", status: "Waiting", state: "waiting" },
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
  },
  {
    id: "EV-037",
    kind: "infrastructure",
    title: "A66 disruption confirmed",
    source: "Infrastructure",
    observedAt: "10:37",
    confidence: "high",
    summary: "Standing water reported east of Penrith.",
  },
  {
    id: "EV-036",
    kind: "exposure",
    title: "Care facilities in exposure zone",
    source: "Community impact",
    observedAt: "10:29",
    confidence: "medium",
    summary: "Three sites require verification before 12:00.",
  },
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
