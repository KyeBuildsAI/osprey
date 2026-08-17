export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type AgentId = "weather" | "infrastructure" | "operations" | "communications";

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string;
  description: string;
  sentAt: string;
  expiresAt: string | null;
}

export interface WeatherState {
  location: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  heatIndexC: number | null;
  humidityPercent: number | null;
  windSpeedMph: number | null;
  windDirection: string | null;
  condition: string;
  forecast: {
    period: string;
    summary: string;
    detail: string;
    temperatureC: number | null;
    precipitationChance: number | null;
  };
  activeAlerts: WeatherAlert[];
  observedAt: string;
  fetchedAt: string;
  source: "National Weather Service";
  sourceOffice: string;
  isLive: boolean;
}

export interface EvidenceReference {
  id: string;
  label: string;
  value: string;
  source: string;
  observedAt: string;
}

export interface InfrastructureAsset {
  id: string;
  name: string;
  type: string;
  criticality: "MEDIUM" | "HIGH" | "CRITICAL";
  vulnerability: string;
  location: string;
  exposure: "NORMAL" | "MONITOR" | "ELEVATED";
  reason: string;
}

export interface AgentAssessment {
  agent: AgentId;
  label: string;
  remit: string;
  state: string;
  risk: RiskLevel;
  confidence: number;
  headline: string;
  summary: string;
  findings: string[];
  evidence: EvidenceReference[];
  watchFor: string[];
  affectedAssets?: InfrastructureAsset[];
  requiresApproval?: boolean;
}

export interface TimelineEvent {
  id: string;
  occurredAt: string;
  actor: string;
  title: string;
  detail: string;
  evidenceIds: string[];
}

export interface IncidentIntelligence {
  incident: {
    id: string;
    name: string;
    location: string;
    status: "ACTIVE";
    classification: "LIVE DATA · DEMONSTRATION DECISIONS";
    severity: RiskLevel;
    version: number;
    updatedAt: string;
  };
  weather: WeatherState;
  assessments: Record<AgentId, AgentAssessment>;
  assets: InfrastructureAsset[];
  timeline: TimelineEvent[];
}

const assets: Omit<InfrastructureAsset, "exposure" | "reason">[] = [
  {
    id: "ASSET-HOSP-01",
    name: "Galveston Medical Centre",
    type: "Hospital",
    criticality: "CRITICAL",
    vulnerability: "Heat load, coastal flooding and access disruption",
    location: "Galveston Island",
  },
  {
    id: "ASSET-PUMP-14",
    name: "Pump Station 14",
    type: "Flood control",
    criticality: "HIGH",
    vulnerability: "Surface-water flooding above high rainfall thresholds",
    location: "Southeast Houston",
  },
  {
    id: "ASSET-ROUTE-45",
    name: "I-45 Coastal Access",
    type: "Transport route",
    criticality: "HIGH",
    vulnerability: "Wind, standing water and coastal access constraint",
    location: "Houston–Galveston corridor",
  },
];

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

function weatherRisk(weather: WeatherState): { risk: RiskLevel; hazard: string } {
  const severeAlert = weather.activeAlerts.some((alert) => ["Extreme", "Severe"].includes(alert.severity));
  const alertText = weather.activeAlerts.map((alert) => `${alert.event} ${alert.headline}`).join(" ").toLowerCase();
  const effectiveHeat = weather.heatIndexC ?? weather.temperatureC ?? weather.forecast.temperatureC ?? 0;

  if (severeAlert) return { risk: "SEVERE", hazard: weather.activeAlerts[0]?.event ?? "Severe weather" };
  if (/tornado|hurricane|flash flood/.test(alertText)) return { risk: "HIGH", hazard: weather.activeAlerts[0]?.event ?? "Severe weather" };
  if (effectiveHeat >= 40) return { risk: "HIGH", hazard: "Dangerous heat" };
  if (weather.activeAlerts.length > 0) return { risk: "MODERATE", hazard: weather.activeAlerts[0].event };
  if (effectiveHeat >= 35) return { risk: "MODERATE", hazard: "Extreme heat" };
  if ((weather.forecast.precipitationChance ?? 0) >= 60) return { risk: "MODERATE", hazard: "Heavy rainfall potential" };
  return { risk: "LOW", hazard: "No material weather hazard" };
}

function evidenceFor(weather: WeatherState): EvidenceReference[] {
  const evidence: EvidenceReference[] = [
    {
      id: "NWS-OBS-001",
      label: "Latest surface observation",
      value: `${weather.temperatureC ?? "—"}°C · ${weather.condition} · ${weather.windSpeedMph ?? "—"} mph wind`,
      source: `${weather.source} · ${weather.sourceOffice}`,
      observedAt: weather.observedAt,
    },
    {
      id: "NWS-FCST-001",
      label: `${weather.forecast.period} forecast`,
      value: `${weather.forecast.summary} · ${weather.forecast.temperatureC ?? "—"}°C · ${weather.forecast.precipitationChance ?? "—"}% precipitation`,
      source: `${weather.source} digital forecast`,
      observedAt: weather.fetchedAt,
    },
  ];

  return evidence.concat(
    weather.activeAlerts.slice(0, 3).map((alert, index) => ({
      id: `NWS-ALERT-${index + 1}`,
      label: alert.event,
      value: `${alert.severity} · ${alert.headline}`,
      source: weather.source,
      observedAt: alert.sentAt,
    })),
  );
}

function assessAssets(risk: RiskLevel, hazard: string): InfrastructureAsset[] {
  const hazardText = hazard.toLowerCase();
  return assets.map((asset) => {
    const heatRelevant = hazardText.includes("heat") && asset.id === "ASSET-HOSP-01";
    const floodRelevant = hazardText.includes("flood") && asset.id !== "ASSET-HOSP-01";
    const windRelevant = /wind|hurricane|tornado/.test(hazardText) && asset.id === "ASSET-ROUTE-45";
    const relevant = heatRelevant || floodRelevant || windRelevant;
    const exposure = relevant && ["HIGH", "SEVERE"].includes(risk) ? "ELEVATED" : relevant || risk === "MODERATE" ? "MONITOR" : "NORMAL";
    return {
      ...asset,
      exposure,
      reason: relevant
        ? `${hazard} intersects this asset's declared vulnerability.`
        : `${asset.type} remains in the shared operating picture; no direct threshold is crossed.`,
    };
  });
}

export function createIncidentIntelligence(weather: WeatherState): IncidentIntelligence {
  const { risk, hazard } = weatherRisk(weather);
  const evidence = evidenceFor(weather);
  const assessedAssets = assessAssets(risk, hazard);
  const exposedAssets = assessedAssets.filter((asset) => asset.exposure !== "NORMAL");
  const infrastructureRisk: RiskLevel = exposedAssets.some((asset) => asset.exposure === "ELEVATED")
    ? "HIGH"
    : exposedAssets.length > 0
      ? "MODERATE"
      : "LOW";
  const interventionRequired = ["HIGH", "SEVERE"].includes(risk) || infrastructureRisk === "HIGH";
  const internalBriefing = risk !== "LOW" || exposedAssets.length > 0;
  const timestamp = new Date(weather.fetchedAt).getTime();
  const timeAt = (offset: number) => new Date(timestamp + offset).toISOString();
  const weatherConfidence = clamp((weather.isLive ? 94 : 82) - (weather.observedAt ? 0 : 10), 65, 97);
  const infrastructureConfidence = clamp(88 - (weather.activeAlerts.length === 0 ? 2 : 0), 65, 94);

  const assessments: Record<AgentId, AgentAssessment> = {
    weather: {
      agent: "weather",
      label: "Weather",
      remit: "Current conditions, forecast and active alerts",
      state: risk,
      risk,
      confidence: weatherConfidence,
      headline: hazard,
      summary: risk === "LOW"
        ? "No material weather threshold is currently crossed. Continue routine monitoring of the latest NWS forecast."
        : `${hazard} is the primary operational concern in the current NWS evidence.`,
      findings: [
        `${weather.activeAlerts.length} active NWS alert${weather.activeAlerts.length === 1 ? "" : "s"}.`,
        `${weather.forecast.period}: ${weather.forecast.summary}.`,
        `Latest observed condition: ${weather.condition}.`,
      ],
      evidence,
      watchFor: ["New or upgraded NWS alerts", "Forecast precipitation or heat threshold changes", "Observation age exceeding 60 minutes"],
    },
    infrastructure: {
      agent: "infrastructure",
      label: "Infrastructure",
      remit: "Critical assets and weather-linked exposure",
      state: exposedAssets.length === 0 ? "CLEAR" : `${exposedAssets.length} TO WATCH`,
      risk: infrastructureRisk,
      confidence: infrastructureConfidence,
      headline: exposedAssets.length === 0 ? "No asset threshold crossed" : `${exposedAssets.length} assets warrant monitoring`,
      summary: exposedAssets.length === 0
        ? "The current weather evidence does not intersect a declared vulnerability in the representative asset set."
        : `${exposedAssets.map((asset) => asset.name).join(" and ")} remain exposed to the current hazard profile.`,
      findings: assessedAssets.map((asset) => `${asset.name}: ${asset.exposure.toLowerCase()} — ${asset.reason}`),
      evidence: [
        ...evidence.slice(0, 2),
        { id: "ASSET-REGISTER-001", label: "Representative critical-asset register", value: `${assessedAssets.length} assets evaluated against declared vulnerabilities`, source: "Osprey demonstration fixture v1", observedAt: weather.fetchedAt },
      ],
      watchFor: ["Pump capacity during heavy rainfall", "Hospital cooling continuity during dangerous heat", "I-45 access constraints"],
      affectedAssets: assessedAssets,
    },
    operations: {
      agent: "operations",
      label: "Operations",
      remit: "Bounded response recommendation",
      state: interventionRequired ? "PREPARE" : "MONITOR",
      risk: interventionRequired ? "HIGH" : risk,
      confidence: clamp(Math.min(weatherConfidence, infrastructureConfidence) + 1, 65, 95),
      headline: interventionRequired ? "Prepare a reversible operational response" : "Continue monitoring",
      summary: interventionRequired
        ? "Verify exposed-asset readiness and prepare a time-bounded response. No external action is released by this assessment."
        : "No major operational intervention is recommended from the current evidence. Refresh intelligence when conditions change.",
      findings: interventionRequired
        ? ["Confirm accountable owners for elevated assets.", "Check access and continuity arrangements.", "Reassess after the next NWS update."]
        : ["Maintain the current operating posture.", "Keep the three representative critical assets in view.", "Reassess in 60 minutes or on a new alert."],
      evidence: [
        ...evidence.slice(0, 2),
        { id: "INFRA-ASSESS-001", label: "Infrastructure assessment", value: `${exposedAssets.length} assets require monitoring`, source: "Osprey Infrastructure Agent", observedAt: timeAt(1000) },
      ],
      watchFor: ["A new severe alert", "An asset moving to elevated exposure", "Material forecast deterioration"],
      requiresApproval: interventionRequired,
    },
    communications: {
      agent: "communications",
      label: "Communications",
      remit: "Internal and public messaging need",
      state: interventionRequired ? "DRAFT" : internalBriefing ? "INTERNAL" : "NO ACTION",
      risk: interventionRequired ? "MODERATE" : "LOW",
      confidence: clamp(Math.min(weatherConfidence, infrastructureConfidence) + 2, 65, 96),
      headline: interventionRequired
        ? "Prepare an internal operational briefing"
        : internalBriefing
          ? "Internal awareness only"
          : "No external communication required",
      summary: interventionRequired
        ? "Prepare, but do not release, a concise briefing for asset owners. Public messaging is not justified by current evidence alone."
        : "Current evidence does not justify public communication. Continue monitoring and preserve a clear audit trail.",
      findings: [
        interventionRequired ? "Internal asset-owner briefing: prepare for review." : "Public communication: not recommended.",
        "External release: held behind named human approval.",
        `Next review trigger: ${risk === "LOW" ? "new alert or 60 minutes" : "material NWS update"}.`,
      ],
      evidence: [
        { id: "OPS-RECOMMEND-001", label: "Operations recommendation", value: interventionRequired ? "Prepare reversible response" : "Continue monitoring", source: "Osprey Operations Agent", observedAt: timeAt(2000) },
        ...evidence.slice(0, 1),
      ],
      watchFor: ["Approval of a consequential action", "Public warning issued by an authority", "Change in affected audience"],
      requiresApproval: interventionRequired,
    },
  };

  return {
    incident: {
      id: "INC-HGX-LIVE",
      name: "Houston–Galveston Incident Room",
      location: "Texas Gulf Coast",
      status: "ACTIVE",
      classification: "LIVE DATA · DEMONSTRATION DECISIONS",
      severity: risk,
      version: Math.max(1, Math.floor(timestamp / 60000)),
      updatedAt: weather.fetchedAt,
    },
    weather,
    assessments,
    assets: assessedAssets,
    timeline: [
      { id: "TL-001", occurredAt: timeAt(0), actor: "NWS adapter", title: "Live weather intelligence refreshed", detail: `${evidence.length} normalized evidence records added to shared incident state.`, evidenceIds: evidence.map((item) => item.id) },
      { id: "TL-002", occurredAt: timeAt(1000), actor: "Weather Agent", title: "Weather assessment completed", detail: `${risk} risk · ${weatherConfidence}% confidence · ${hazard}.`, evidenceIds: evidence.map((item) => item.id) },
      { id: "TL-003", occurredAt: timeAt(2000), actor: "Infrastructure Agent", title: "Critical-asset exposure assessed", detail: `${exposedAssets.length} of ${assessedAssets.length} assets require monitoring.`, evidenceIds: ["ASSET-REGISTER-001", ...evidence.slice(0, 2).map((item) => item.id)] },
      { id: "TL-004", occurredAt: timeAt(3000), actor: "Operations Agent", title: interventionRequired ? "Reversible preparation proposed" : "Monitoring posture recommended", detail: assessments.operations.summary, evidenceIds: ["INFRA-ASSESS-001"] },
      { id: "TL-005", occurredAt: timeAt(4000), actor: "Communications Agent", title: assessments.communications.headline, detail: "No message or external effect has been released.", evidenceIds: ["OPS-RECOMMEND-001"] },
    ],
  };
}

export const demoWeather: WeatherState = {
  location: "Houston–Galveston, Texas",
  latitude: 29.7604,
  longitude: -95.3698,
  temperatureC: 33,
  heatIndexC: 37,
  humidityPercent: 64,
  windSpeedMph: 12,
  windDirection: "S",
  condition: "Partly cloudy",
  forecast: {
    period: "This afternoon",
    summary: "Hot and partly cloudy",
    detail: "Representative conditions shown while the first live NWS refresh completes.",
    temperatureC: 36,
    precipitationChance: 20,
  },
  activeAlerts: [],
  observedAt: "2026-08-17T16:00:00.000Z",
  fetchedAt: "2026-08-17T16:01:00.000Z",
  source: "National Weather Service",
  sourceOffice: "Houston/Galveston",
  isLive: false,
};

export const demoIntelligence = createIncidentIntelligence(demoWeather);
