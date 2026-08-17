import { demoWaterIntelligence, type FloodCategory, type WaterIntelligence } from "@/lib/water-types";
import { minutesSince, type ConnectorHealth } from "@/lib/source-health";
import { demoRainfallIntelligence, type RainfallIntelligence, type RainfallPeriod, type RainfallSamplePoint, type RainfallScreening } from "@/lib/rainfall";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";
export type AgentId = "weather" | "infrastructure" | "operations" | "communications";

export type AlertGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string;
  description: string;
  sentAt: string;
  expiresAt: string | null;
  areaDescription: string;
  geometry: AlertGeometry | null;
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
  forecastFrames: WeatherForecastFrame[];
  activeAlerts: WeatherAlert[];
  observedAt: string;
  fetchedAt: string;
  source: "National Weather Service";
  sourceOffice: string;
  isLive: boolean;
}

export interface WeatherForecastFrame {
  startTime: string;
  endTime: string;
  temperatureC: number | null;
  heatIndexC: number | null;
  humidityPercent: number | null;
  precipitationChance: number | null;
  windSpeedMph: number | null;
  windDirection: string | null;
  summary: string;
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
  latitude: number;
  longitude: number;
  elevationM: number | null;
  elevationSource: "USGS 3DEP" | "Unavailable";
  rainfallIn: Record<RainfallPeriod, number | null>;
  rainfallScreening: RainfallScreening;
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
  water: WaterIntelligence;
  rainfall: RainfallIntelligence;
  sources: ConnectorHealth[];
  assessments: Record<AgentId, AgentAssessment>;
  assets: InfrastructureAsset[];
  timeline: TimelineEvent[];
}

export const infrastructureAssetFixtures: Omit<InfrastructureAsset, "exposure" | "reason" | "rainfallIn" | "rainfallScreening">[] = [
  {
    id: "ASSET-HOSP-01",
    name: "Galveston Medical Centre",
    type: "Hospital",
    criticality: "CRITICAL",
    vulnerability: "Heat load, coastal flooding and access disruption",
    location: "Galveston Island",
    latitude: 29.3013,
    longitude: -94.7977,
    elevationM: null,
    elevationSource: "Unavailable",
  },
  {
    id: "ASSET-PUMP-14",
    name: "Pump Station 14",
    type: "Flood control",
    criticality: "HIGH",
    vulnerability: "Surface-water flooding above high rainfall thresholds",
    location: "Southeast Houston",
    latitude: 29.6743,
    longitude: -95.2511,
    elevationM: null,
    elevationSource: "Unavailable",
  },
  {
    id: "ASSET-ROUTE-45",
    name: "I-45 Coastal Access",
    type: "Transport route",
    criticality: "HIGH",
    vulnerability: "Wind, standing water and coastal access constraint",
    location: "Houston–Galveston corridor",
    latitude: 29.5061,
    longitude: -95.0892,
    elevationM: null,
    elevationSource: "Unavailable",
  },
];

export const rainfallSamplePoints: RainfallSamplePoint[] = [
  { id: "AREA-HOUSTON", name: "Houston operational centre", latitude: 29.7604, longitude: -95.3698 },
  ...infrastructureAssetFixtures.map(({ id, name, latitude, longitude }) => ({ id, name, latitude, longitude })),
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

function waterEvidenceFor(water: WaterIntelligence): EvidenceReference[] {
  const rank: Record<FloodCategory, number> = { UNKNOWN: 0, NORMAL: 1, ACTION: 2, MINOR: 3, MODERATE: 4, MAJOR: 5 };
  const highestGauge = [...water.riverGauges].sort((a, b) => rank[b.category] - rank[a.category])[0];
  const coast = [...water.coastalStations].sort((a, b) => Math.abs(b.anomalyM ?? 0) - Math.abs(a.anomalyM ?? 0))[0];
  const evidence: EvidenceReference[] = [];
  if (highestGauge) evidence.push({
    id: "WATER-GAUGE-001",
    label: `${highestGauge.name} river stage`,
    value: `${highestGauge.observedValue ?? "—"} ${highestGauge.observedUnit} · ${highestGauge.category.toLowerCase()} · ${highestGauge.trend.toLowerCase()}`,
    source: `${highestGauge.source}${highestGauge.usgsId ? ` · USGS ${highestGauge.usgsId}` : ""}`,
    observedAt: highestGauge.observedAt,
  });
  if (coast) evidence.push({
    id: "COOPS-COAST-001",
    label: `${coast.name} coastal water level`,
    value: `${coast.observedM ?? "—"} m MLLW · ${coast.anomalyM == null ? "—" : `${coast.anomalyM >= 0 ? "+" : ""}${coast.anomalyM} m`} versus tide prediction`,
    source: coast.source,
    observedAt: coast.observedAt,
  });
  evidence.push({
    id: "FEMA-NFHL-001",
    label: "Special Flood Hazard Area overlay",
    value: water.floodZones.features.length > 0
      ? `${water.floodZones.features.length} FEMA NFHL features loaded · ${water.floodZoneStatus.toLowerCase()} reference status`
      : "Verified FEMA NFHL snapshot unavailable; river and coastal observations remain live",
    source: `FEMA National Flood Hazard Layer · ${water.floodZoneMetadata.publisher}`,
    observedAt: water.floodZoneMetadata.verifiedAt ?? water.fetchedAt,
  });
  return evidence;
}

function waterRisk(water: WaterIntelligence): RiskLevel {
  if (water.highestCategory === "MAJOR") return "SEVERE";
  if (["MODERATE", "MINOR"].includes(water.highestCategory)) return "HIGH";
  if (water.highestCategory === "ACTION" || water.coastalStations.some((station) => Math.abs(station.anomalyM ?? 0) >= 0.45)) return "MODERATE";
  return "LOW";
}

function rainfallRisk(rainfall: RainfallIntelligence): RiskLevel {
  if (rainfall.samples.some((sample) => sample.screening === "ELEVATED")) return "HIGH";
  if (rainfall.samples.some((sample) => sample.screening === "MONITOR")) return "MODERATE";
  return "LOW";
}

function rainfallEvidenceFor(rainfall: RainfallIntelligence): EvidenceReference[] {
  const ranked = [...rainfall.samples].sort((first, second) => {
    const firstValue = first.accumulationIn[24] ?? first.accumulationIn[6] ?? first.accumulationIn[1] ?? -1;
    const secondValue = second.accumulationIn[24] ?? second.accumulationIn[6] ?? second.accumulationIn[1] ?? -1;
    return secondValue - firstValue;
  });
  const lead = ranked[0];
  if (!lead || lead.screening === "UNAVAILABLE") return [];
  return [{
    id: "MRMS-QPE-001",
    label: `${lead.name} radar-estimated rainfall`,
    value: `${lead.accumulationIn[1] ?? "—"} in / 1h · ${lead.accumulationIn[6] ?? "—"} in / 6h · ${lead.accumulationIn[24] ?? "—"} in / 24h · ${lead.screening.toLowerCase()} screening`,
    source: `NOAA/NWS MRMS QPE · approximately ${rainfall.resolutionKm} km grid`,
    observedAt: rainfall.validAt[1] ?? rainfall.validAt[24] ?? rainfall.fetchedAt,
  }];
}

function riskMax(...risks: RiskLevel[]): RiskLevel {
  const order: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "SEVERE"];
  return [...risks].sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? "LOW";
}

function distanceKm(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInRing(longitude: number, latitude: number, ring: number[][]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects = y > latitude !== previousY > latitude
      && longitude < ((previousX - x) * (latitude - y)) / ((previousY - y) || Number.EPSILON) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInAlert(longitude: number, latitude: number, geometry: AlertGeometry | null) {
  if (!geometry) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => pointInRing(longitude, latitude, polygon[0] ?? []));
}

function assessAssets(
  weather: WeatherState,
  water: WaterIntelligence,
  rainfall: RainfallIntelligence,
  risk: RiskLevel,
  hazard: string,
  elevations: Record<string, number | null>,
): InfrastructureAsset[] {
  const hazardText = hazard.toLowerCase();
  return infrastructureAssetFixtures.map((asset) => {
    const elevationM = elevations[asset.id] ?? null;
    const intersectingAlert = weather.activeAlerts.find((alert) => pointInAlert(asset.longitude, asset.latitude, alert.geometry));
    const heatRelevant = hazardText.includes("heat") && asset.id === "ASSET-HOSP-01";
    const floodRelevant = hazardText.includes("flood") && asset.id !== "ASSET-HOSP-01";
    const windRelevant = /wind|hurricane|tornado/.test(hazardText) && asset.id === "ASSET-ROUTE-45";
    const lowElevationFloodExposure = elevationM != null && elevationM <= 4 && /flood|storm surge|hurricane/.test(hazardText);
    const nearestGauge = [...water.riverGauges].sort((a, b) => distanceKm(asset, a) - distanceKm(asset, b))[0];
    const gaugeDistance = nearestGauge ? distanceKm(asset, nearestGauge) : null;
    const nearestCoast = [...water.coastalStations].sort((a, b) => distanceKm(asset, a) - distanceKm(asset, b))[0];
    const coastDistance = nearestCoast ? distanceKm(asset, nearestCoast) : null;
    const gaugeElevated = Boolean(nearestGauge && gaugeDistance != null && gaugeDistance <= 45 && ["ACTION", "MINOR", "MODERATE", "MAJOR"].includes(nearestGauge.category));
    const coastalElevated = Boolean(nearestCoast && coastDistance != null && coastDistance <= 35 && Math.abs(nearestCoast.anomalyM ?? 0) >= 0.45);
    const rainfallSample = rainfall.samples.find((sample) => sample.id === asset.id);
    const rainfallIn = rainfallSample?.accumulationIn ?? { 1: null, 3: null, 6: null, 24: null };
    const rainfallScreening = rainfallSample?.screening ?? "UNAVAILABLE";
    const rainfallElevated = rainfallScreening === "ELEVATED";
    const rainfallMonitor = rainfallScreening === "MONITOR";
    const relevant = Boolean(intersectingAlert) || lowElevationFloodExposure || heatRelevant || floodRelevant || windRelevant || gaugeElevated || coastalElevated || rainfallMonitor || rainfallElevated;
    const exposure = rainfallElevated || (intersectingAlert || lowElevationFloodExposure || gaugeElevated || coastalElevated) && ["HIGH", "SEVERE"].includes(risk)
      ? "ELEVATED"
      : relevant || risk === "MODERATE"
        ? "MONITOR"
        : "NORMAL";
    return {
      ...asset,
      elevationM,
      elevationSource: elevationM == null ? "Unavailable" : "USGS 3DEP",
      rainfallIn,
      rainfallScreening,
      exposure,
      reason: intersectingAlert
        ? `Located inside the live NWS ${intersectingAlert.event} polygon.`
        : rainfallElevated || rainfallMonitor
          ? `${rainfallIn[1] ?? "—"} in / 1h and ${rainfallIn[24] ?? "—"} in / 24h at the NOAA MRMS grid cell crosses Osprey's ${rainfallScreening.toLowerCase()} screening threshold.`
        : gaugeElevated && nearestGauge
          ? `${nearestGauge.name} is ${Math.round(gaugeDistance!)} km away at ${nearestGauge.category.toLowerCase()} stage.`
          : coastalElevated && nearestCoast
            ? `${nearestCoast.name} is ${Math.round(coastDistance!)} km away with a ${nearestCoast.anomalyM! >= 0 ? "+" : ""}${nearestCoast.anomalyM} m tide anomaly.`
        : lowElevationFloodExposure
          ? `${Math.round(elevationM)} m USGS elevation increases sensitivity to ${hazard.toLowerCase()}.`
          : relevant
            ? `${hazard} intersects this asset's declared vulnerability.`
            : nearestGauge
              ? `${asset.type} remains below exposure thresholds; nearest live gauge ${nearestGauge.name} is ${nearestGauge.category.toLowerCase()}.`
              : `${asset.type} remains in the shared operating picture; no spatial or vulnerability threshold is crossed.`,
    };
  });
}

export function createIncidentIntelligence(
  weather: WeatherState,
  elevations: Record<string, number | null> = {},
  water: WaterIntelligence = demoWaterIntelligence,
  rainfall: RainfallIntelligence = demoRainfallIntelligence(rainfallSamplePoints),
): IncidentIntelligence {
  const { risk: weatherRiskLevel, hazard } = weatherRisk(weather);
  const waterRiskLevel = waterRisk(water);
  const rainfallRiskLevel = rainfallRisk(rainfall);
  const risk = riskMax(weatherRiskLevel, waterRiskLevel, rainfallRiskLevel);
  const evidence = evidenceFor(weather);
  const waterEvidence = waterEvidenceFor(water);
  const rainfallEvidence = rainfallEvidenceFor(rainfall);
  const assessedAssets = assessAssets(weather, water, rainfall, risk, hazard, elevations);
  const exposedAssets = assessedAssets.filter((asset) => asset.exposure !== "NORMAL");
  const infrastructureRisk: RiskLevel = exposedAssets.some((asset) => asset.exposure === "ELEVATED")
    ? "HIGH"
    : exposedAssets.length > 0
      ? "MODERATE"
      : "LOW";
  const interventionRequired = ["HIGH", "SEVERE"].includes(risk) || infrastructureRisk === "HIGH";
  const internalBriefing = risk !== "LOW" || exposedAssets.length > 0;
  const timestamp = Math.max(new Date(weather.fetchedAt).getTime(), new Date(water.fetchedAt).getTime(), new Date(rainfall.fetchedAt).getTime());
  const timeAt = (offset: number) => new Date(timestamp + offset).toISOString();
  const weatherConfidence = clamp((weather.isLive ? 94 : 82) - (weather.observedAt ? 0 : 10), 65, 97);
  const spatialAlertCount = weather.activeAlerts.filter((alert) => alert.geometry).length;
  const elevationCount = assessedAssets.filter((asset) => asset.elevationM != null).length;
  const infrastructureConfidence = clamp(84 + spatialAlertCount * 2 + elevationCount - (weather.activeAlerts.length === 0 ? 2 : 0), 65, 95);
  const weatherAge = minutesSince(weather.observedAt, timestamp);
  const weatherStatus: ConnectorHealth["status"] = !weather.isLive
    ? "DEMO"
    : weatherAge != null && weatherAge > 120
      ? "STALE"
      : "LIVE";
  const sources: ConnectorHealth[] = [
    {
      id: "nws-weather",
      name: "National Weather Service",
      role: "Observations, hourly forecast frames and active alerts",
      status: weatherStatus,
      eventTime: weather.observedAt,
      receivedAt: weather.fetchedAt,
      ageMinutes: weatherAge,
      lastAttemptAt: weather.fetchedAt,
      lastSuccessAt: weather.isLive ? weather.fetchedAt : null,
      fallback: weather.isLive ? null : "Representative startup snapshot",
      message: weather.isLive
        ? `${weather.forecastFrames.length} hourly forecast frames received from ${weather.sourceOffice}.`
        : "Connecting to the live NWS observation and forecast feeds.",
      affects: ["Weather assessment", "Forecast timeline", "NWS warning polygons"],
    },
    rainfall.sourceHealth,
    ...water.sourceHealth,
    {
      id: "usgs-elevation",
      name: "USGS 3DEP",
      role: "Point terrain elevation for selected assets and map locations",
      status: weather.isLive ? elevationCount > 0 ? "CACHED" : "UNAVAILABLE" : "DEMO",
      eventTime: elevationCount > 0 ? weather.fetchedAt : null,
      receivedAt: weather.fetchedAt,
      ageMinutes: elevationCount > 0 ? 0 : null,
      lastAttemptAt: weather.fetchedAt,
      lastSuccessAt: elevationCount > 0 ? weather.fetchedAt : null,
      fallback: "Verified local elevation samples for the demonstration assets",
      message: elevationCount > 0
        ? `${elevationCount} of ${assessedAssets.length} representative assets have elevation context.`
        : "Asset elevation context is unavailable; other exposure evidence remains visible.",
      affects: ["Terrain identify", "Low-elevation sensitivity", "Infrastructure exposure"],
    },
  ];

  const assessments: Record<AgentId, AgentAssessment> = {
    weather: {
      agent: "weather",
      label: "Weather",
      remit: "Current conditions, forecast and active alerts",
      state: weatherRiskLevel,
      risk: weatherRiskLevel,
      confidence: weatherConfidence,
      headline: hazard,
      summary: weatherRiskLevel === "LOW"
        ? "No material weather threshold is currently crossed. Continue routine monitoring of the latest NWS forecast."
        : `${hazard} is the primary operational concern in the current NWS evidence.`,
      findings: [
        `${weather.activeAlerts.length} active NWS alert${weather.activeAlerts.length === 1 ? "" : "s"}.`,
        `${weather.forecast.period}: ${weather.forecast.summary}.`,
        rainfall.isLive ? `${rainfall.samples.length} NOAA MRMS grid points screened for recent accumulation.` : "Radar-estimated rainfall is currently unavailable; no value has been inferred.",
        `Latest observed condition: ${weather.condition}.`,
      ],
      evidence: [...rainfallEvidence, ...evidence],
      watchFor: ["New or upgraded NWS alerts", "Forecast precipitation or heat threshold changes", "Observation age exceeding 60 minutes"],
    },
    infrastructure: {
      agent: "infrastructure",
      label: "Infrastructure",
      remit: "Critical assets, rainfall, river, coastal and weather exposure",
      state: exposedAssets.length === 0 ? "CLEAR" : `${exposedAssets.length} TO WATCH`,
      risk: infrastructureRisk,
      confidence: infrastructureConfidence,
      headline: exposedAssets.length === 0 ? "Water and asset thresholds clear" : `${exposedAssets.length} assets warrant monitoring`,
      summary: exposedAssets.length === 0
        ? `${water.riverGauges.length} river gauges and ${water.coastalStations.length} coastal stations do not currently intersect a declared asset threshold.`
        : `${exposedAssets.map((asset) => asset.name).join(" and ")} remain exposed to the current hazard profile.`,
      findings: assessedAssets.map((asset) => `${asset.name}: ${asset.exposure.toLowerCase()} — ${asset.reason}`),
      evidence: [
        ...rainfallEvidence,
        ...waterEvidence,
        ...evidence.slice(0, 1),
        { id: "ASSET-REGISTER-001", label: "Geocoded representative critical-asset register", value: `${assessedAssets.length} assets evaluated · ${spatialAlertCount} warning polygons · ${rainfall.samples.length} MRMS rainfall points · ${water.riverGauges.length + water.coastalStations.length} live water stations · ${elevationCount} USGS elevation samples`, source: "Osprey demonstration fixture + NWS/NOAA/USGS/FEMA", observedAt: rainfall.fetchedAt },
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
        ...evidence.slice(0, 1),
        ...rainfallEvidence,
        ...waterEvidence.slice(0, 2),
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
        `Next review trigger: ${risk === "LOW" ? "new alert, water threshold or 60 minutes" : "material weather or water update"}.`,
      ],
      evidence: [
        { id: "OPS-RECOMMEND-001", label: "Operations recommendation", value: interventionRequired ? "Prepare reversible response" : "Continue monitoring", source: "Osprey Operations Agent", observedAt: timeAt(2000) },
        ...evidence.slice(0, 1),
        ...waterEvidence.slice(0, 1),
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
      updatedAt: new Date(timestamp).toISOString(),
    },
    weather,
    water,
    rainfall,
    sources,
    assessments,
    assets: assessedAssets,
    timeline: [
      { id: "TL-001", occurredAt: timeAt(0), actor: "NWS adapter", title: "Live weather intelligence refreshed", detail: `${evidence.length} normalized evidence records added to shared incident state.`, evidenceIds: evidence.map((item) => item.id) },
      { id: "TL-001-RAIN", occurredAt: timeAt(250), actor: "MRMS rainfall adapter", title: "Radar-estimated rainfall refreshed", detail: `${rainfall.samples.length} operational points · ${rainfall.periods.length} accumulation periods · ${rainfall.sourceHealth.status.toLowerCase()} source state.`, evidenceIds: rainfallEvidence.map((item) => item.id) },
      { id: "TL-001-WATER", occurredAt: timeAt(500), actor: "Water adapters", title: "River, coastal and flood-zone intelligence refreshed", detail: `${water.riverGauges.length} NOAA/USGS gauges · ${water.coastalStations.length} NOAA coastal stations · FEMA overlay ${water.floodZoneStatus.toLowerCase()}.`, evidenceIds: waterEvidence.map((item) => item.id) },
      { id: "TL-002", occurredAt: timeAt(1000), actor: "Weather Agent", title: "Weather assessment completed", detail: `${weatherRiskLevel} risk · ${weatherConfidence}% confidence · ${hazard}.`, evidenceIds: evidence.map((item) => item.id) },
      { id: "TL-003", occurredAt: timeAt(2000), actor: "Infrastructure Agent", title: "Spatial exposure assessed", detail: `${exposedAssets.length} of ${assessedAssets.length} geocoded assets require monitoring across weather, rainfall, river and coastal evidence.`, evidenceIds: ["ASSET-REGISTER-001", ...rainfallEvidence.map((item) => item.id), ...waterEvidence.slice(0, 2).map((item) => item.id)] },
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
  forecastFrames: [
    { startTime: "2026-08-17T16:00:00.000Z", endTime: "2026-08-17T17:00:00.000Z", temperatureC: 33, heatIndexC: 37, humidityPercent: 64, precipitationChance: 20, windSpeedMph: 12, windDirection: "S", summary: "Partly cloudy" },
    { startTime: "2026-08-17T19:00:00.000Z", endTime: "2026-08-17T20:00:00.000Z", temperatureC: 35, heatIndexC: 39, humidityPercent: 60, precipitationChance: 20, windSpeedMph: 13, windDirection: "S", summary: "Hot and partly cloudy" },
    { startTime: "2026-08-17T22:00:00.000Z", endTime: "2026-08-17T23:00:00.000Z", temperatureC: 34, heatIndexC: 38, humidityPercent: 63, precipitationChance: 25, windSpeedMph: 12, windDirection: "SE", summary: "Isolated showers possible" },
    { startTime: "2026-08-18T01:00:00.000Z", endTime: "2026-08-18T02:00:00.000Z", temperatureC: 31, heatIndexC: 35, humidityPercent: 70, precipitationChance: 20, windSpeedMph: 10, windDirection: "SE", summary: "Partly cloudy" },
    { startTime: "2026-08-18T04:00:00.000Z", endTime: "2026-08-18T05:00:00.000Z", temperatureC: 29, heatIndexC: 33, humidityPercent: 76, precipitationChance: 15, windSpeedMph: 8, windDirection: "S", summary: "Warm and humid" },
  ],
  activeAlerts: [],
  observedAt: "2026-08-17T16:00:00.000Z",
  fetchedAt: "2026-08-17T16:01:00.000Z",
  source: "National Weather Service",
  sourceOffice: "Houston/Galveston",
  isLive: false,
};

export const demoIntelligence = createIncidentIntelligence(demoWeather);
