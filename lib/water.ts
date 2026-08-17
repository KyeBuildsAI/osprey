import { FEMA_REFRESH_INTERVAL_DAYS, getFemaSnapshot } from "@/lib/fema";
import { minutesSince, type ConnectorHealth } from "@/lib/source-health";
import type {
  CoastalStation,
  FloodCategory,
  RiverGauge,
  ThresholdMetadataStatus,
  WaterIntelligence,
  WaterTrend,
} from "@/lib/water-types";

export type {
  CoastalStation,
  FloodCategory,
  FloodZoneCollection,
  FloodZoneFeature,
  RiverGauge,
  ThresholdMetadataStatus,
  WaterIntelligence,
  WaterTrend,
} from "@/lib/water-types";

const NWPS_BASE = "https://api.water.noaa.gov/nwps/v1";
const USGS_BASE = "https://api.waterdata.usgs.gov/ogcapi/v0/collections/continuous/items";
const USGS_LATEST_BASE = "https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items";
const COOPS_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

const selectedGaugeCatalog = [
  { lid: "BBST2", usgsId: "08074000", name: "Buffalo Bayou at Shepherd Drive", latitude: 29.76, longitude: -95.4083, action: 17, minor: 28, moderate: 29.5, major: 32, verifiedAt: "2026-08-17T19:15:00.000Z" },
  { lid: "HBMT2", usgsId: "08075000", name: "Brays Bayou at Houston", latitude: 29.6969, longitude: -95.4122, action: 38, minor: 41, moderate: 42, major: 43, verifiedAt: "2026-08-17T21:40:55.837Z" },
  { lid: "HSIT2", usgsId: "08075500", name: "Sims Bayou at Houston", latitude: 29.674, longitude: -95.289, action: 23.2, minor: 26.2, moderate: 27.2, major: 28.2, verifiedAt: "2026-08-17T21:40:55.837Z" },
  { lid: "HMMT2", usgsId: "08069500", name: "West Fork San Jacinto River near Humble", latitude: 30.026, longitude: -95.258, action: 45.3, minor: 49.3, moderate: 50.3, major: 52.3, verifiedAt: "2026-08-17T21:40:55.837Z" },
  { lid: "HCCT2", usgsId: "08077600", name: "Clear Creek near Friendswood", latitude: 29.517, longitude: -95.179, action: 7, minor: 12, moderate: 16, major: 21, verifiedAt: "2026-08-17T21:40:55.837Z" },
];
const selectedCoastalStations = [
  { id: "8771450", name: "Galveston Pier 21", latitude: 29.31, longitude: -94.793 },
  { id: "8770613", name: "Morgan's Point", latitude: 29.6817, longitude: -94.985 },
];

const categoryRank: Record<FloodCategory, number> = {
  UNKNOWN: 0,
  NORMAL: 1,
  ACTION: 2,
  MINOR: 3,
  MODERATE: 4,
  MAJOR: 5,
};

const THRESHOLD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const THRESHOLD_PENDING_RETRY_MS = 15 * 60 * 1000;

interface ThresholdCacheEntry {
  detail: unknown;
  updatedAt: string;
  expiresAt: number;
}

const thresholdMetadataCache = new Map<string, ThresholdCacheEntry>();
const thresholdRetryAfter = new Map<string, number>();
let thresholdRefreshPromise: Promise<Map<string, { detail: unknown; status: Exclude<ThresholdMetadataStatus, "PENDING">; updatedAt: string }>> | null = null;

for (const gauge of selectedGaugeCatalog) {
  if (!gauge.verifiedAt) continue;
  thresholdMetadataCache.set(gauge.lid, {
    detail: {
      lid: gauge.lid,
      usgsId: gauge.usgsId,
      name: gauge.name,
      latitude: gauge.latitude,
      longitude: gauge.longitude,
      status: { observed: {}, forecast: {} },
      flood: {
        stageUnits: "ft",
        categories: {
          action: { stage: gauge.action },
          minor: { stage: gauge.minor },
          moderate: { stage: gauge.moderate },
          major: { stage: gauge.major },
        },
      },
    },
    updatedAt: gauge.verifiedAt,
    expiresAt: Date.parse(gauge.verifiedAt) + THRESHOLD_CACHE_TTL_MS,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function textOr(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeCategory(value: unknown): FloodCategory {
  const category = textOr(value).toUpperCase().replace(/\s+/g, "_");
  if (category.includes("MAJOR")) return "MAJOR";
  if (category.includes("MODERATE")) return "MODERATE";
  if (category.includes("MINOR")) return "MINOR";
  if (category.includes("ACTION")) return "ACTION";
  if (/NORMAL|NO_FLOODING|BELOW/.test(category)) return "NORMAL";
  return "UNKNOWN";
}

function trendFor(values: number[]): { trend: WaterTrend; change: number | null } {
  if (values.length < 2) return { trend: "UNKNOWN", change: null };
  const change = Number((values.at(-1)! - values[0]).toFixed(2));
  if (change > 0.05) return { trend: "RISING", change };
  if (change < -0.05) return { trend: "FALLING", change };
  return { trend: "STEADY", change };
}

async function fetchJson(url: string, timeoutMs = 8500): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Osprey incident intelligence/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function refreshGaugeDetails() {
  const now = Date.now();
  const dueGauges = selectedGaugeCatalog.filter((gauge) => {
    const cached = thresholdMetadataCache.get(gauge.lid);
    if (cached && cached.expiresAt > now) return false;
    return (thresholdRetryAfter.get(gauge.lid) ?? 0) <= now;
  });
  const refreshed = new Set<string>();
  if (dueGauges.length > 0) {
    const results = await Promise.allSettled(dueGauges.map((gauge) => fetchJson(`${NWPS_BASE}/gauges/${gauge.lid}`, 6000)));
    results.forEach((result, index) => {
      const gauge = dueGauges[index];
      if (result.status === "fulfilled") {
        const updatedAt = new Date().toISOString();
        thresholdMetadataCache.set(gauge.lid, {
          detail: result.value,
          updatedAt,
          expiresAt: Date.now() + THRESHOLD_CACHE_TTL_MS,
        });
        thresholdRetryAfter.delete(gauge.lid);
        refreshed.add(gauge.lid);
      } else {
        thresholdRetryAfter.set(gauge.lid, Date.now() + THRESHOLD_PENDING_RETRY_MS);
      }
    });
  }

  return new Map(selectedGaugeCatalog.flatMap((gauge) => {
    const cached = thresholdMetadataCache.get(gauge.lid);
    return cached ? [[gauge.lid, {
      detail: cached.detail,
      status: refreshed.has(gauge.lid) ? "LIVE" as const : "CACHED" as const,
      updatedAt: cached.updatedAt,
    }]] : [];
  }));
}

async function fetchGaugeDetails() {
  if (!thresholdRefreshPromise) {
    thresholdRefreshPromise = refreshGaugeDetails().finally(() => {
      thresholdRefreshPromise = null;
    });
  }
  return thresholdRefreshPromise;
}

async function fetchUsgsHistories(usgsIds: string[]) {
  if (usgsIds.length === 0) return new Map<string, { values: number[]; latestAt: string; quality: string }>();
  const locationIds = usgsIds.map((id) => `USGS-${id}`).join(",");
  const query = `f=json&monitoring_location_id=${encodeURIComponent(locationIds)}&parameter_code=00065&limit=500`;
  let payload: Record<string, unknown>;
  try {
    payload = asRecord(await fetchJson(`${USGS_BASE}?${query}&time=PT6H`, 6500));
  } catch {
    payload = asRecord(await fetchJson(`${USGS_LATEST_BASE}?${query}`, 8500));
  }
  const features = Array.isArray(payload.features) ? payload.features : [];
  const grouped = new Map<string, { points: { time: string; value: number; quality: string }[] }>();
  for (const item of features) {
    const properties = asRecord(asRecord(item).properties);
    const locationId = textOr(properties.monitoring_location_id).replace(/^USGS-/, "");
    const value = numberOrNull(properties.value);
    const time = textOr(properties.time);
    if (!locationId || value == null || !time) continue;
    const group = grouped.get(locationId) ?? { points: [] };
    group.points.push({ time, value, quality: textOr(properties.approval_status, "Provisional") });
    grouped.set(locationId, group);
  }
  return new Map([...grouped].map(([id, group]) => {
    const points = group.points.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    const latest = points.at(-1)!;
    return [id, { values: points.map((point) => point.value), latestAt: latest.time, quality: latest.quality }];
  }));
}

function gaugeFrom(
  detailValue: unknown,
  histories: Map<string, { values: number[]; latestAt: string; quality: string }>,
  thresholdMetadataStatus: ThresholdMetadataStatus,
  thresholdMetadataUpdatedAt: string | null,
): RiverGauge | null {
  const detail = asRecord(detailValue);
  const status = asRecord(detail.status);
  const observed = asRecord(status.observed);
  const forecast = asRecord(status.forecast);
  const flood = asRecord(detail.flood);
  const categories = asRecord(flood.categories);
  const categoryStage = (key: string) => numberOrNull(asRecord(categories[key]).stage);
  const id = textOr(detail.lid, textOr(detail.id));
  const usgsId = textOr(detail.usgsId) || null;
  const latitude = numberOrNull(detail.latitude);
  const longitude = numberOrNull(detail.longitude);
  if (!id || latitude == null || longitude == null) return null;
  const history = usgsId ? histories.get(usgsId) : undefined;
  const observedValue = history?.values.at(-1) ?? numberOrNull(observed.primary);
  const actionStage = categoryStage("action");
  const impactItems = Array.isArray(flood.impacts) ? flood.impacts : Array.isArray(detail.impacts) ? detail.impacts : [];
  const closestImpact = impactItems
    .map((item) => asRecord(item))
    .filter((item) => textOr(item.statement))
    .sort((a, b) => (numberOrNull(a.stage) ?? Infinity) - (numberOrNull(b.stage) ?? Infinity))[0];
  const trend = trendFor(history?.values ?? []);
  const minorStage = categoryStage("minor");
  const moderateStage = categoryStage("moderate");
  const majorStage = categoryStage("major");
  const hasThresholdMetadata = actionStage != null || minorStage != null || moderateStage != null || majorStage != null;
  const derivedCategory: FloodCategory = observedValue == null || !hasThresholdMetadata
    ? "UNKNOWN"
    : majorStage != null && observedValue >= majorStage
      ? "MAJOR"
      : moderateStage != null && observedValue >= moderateStage
        ? "MODERATE"
        : minorStage != null && observedValue >= minorStage
          ? "MINOR"
          : actionStage != null && observedValue >= actionStage
            ? "ACTION"
            : "NORMAL";
  return {
    id,
    usgsId,
    name: textOr(detail.name, id),
    latitude,
    longitude,
    observedValue,
    observedUnit: textOr(observed.primaryUnit, textOr(flood.stageUnits, "ft")),
    observedAt: history?.latestAt ?? textOr(observed.validTime, new Date().toISOString()),
    quality: history?.quality ?? "NWPS provisional",
    // A current USGS stage always wins. NOAA's observed category can be older
    // than the live reading because threshold metadata is intentionally cached.
    category: observedValue == null ? normalizeCategory(observed.floodCategory) : derivedCategory,
    trend: trend.trend,
    changeSixHours: trend.change,
    actionStage,
    minorStage,
    moderateStage,
    majorStage,
    forecastValue: numberOrNull(forecast.primary),
    forecastAt: textOr(forecast.validTime) || null,
    forecastCategory: normalizeCategory(forecast.floodCategory),
    percentToAction: observedValue != null && actionStage != null && actionStage > 0
      ? Math.max(0, Math.round((observedValue / actionStage) * 100))
      : null,
    impact: closestImpact ? textOr(closestImpact.statement) : null,
    thresholdMetadataStatus,
    thresholdMetadataUpdatedAt,
    source: "NOAA NWPS + USGS",
  };
}

async function fetchRiverGauges(): Promise<RiverGauge[]> {
  const [detailResult, historyResult] = await Promise.allSettled([
    fetchGaugeDetails(),
    fetchUsgsHistories(selectedGaugeCatalog.map((gauge) => gauge.usgsId)),
  ]);
  const details = detailResult.status === "fulfilled"
    ? detailResult.value
    : new Map<string, { detail: unknown; status: Exclude<ThresholdMetadataStatus, "PENDING">; updatedAt: string }>();
  const histories = historyResult.status === "fulfilled"
    ? historyResult.value
    : new Map<string, { values: number[]; latestAt: string; quality: string }>();
  return selectedGaugeCatalog.map((catalog) => {
    const metadata = details.get(catalog.lid);
    const fallback = {
      lid: catalog.lid,
      usgsId: catalog.usgsId,
      name: catalog.name,
      latitude: catalog.latitude,
      longitude: catalog.longitude,
      status: { observed: {}, forecast: {} },
      flood: {
        stageUnits: "ft",
        categories: {
          action: { stage: catalog.action },
          minor: { stage: catalog.minor },
          moderate: { stage: catalog.moderate },
          major: { stage: catalog.major },
        },
      },
    };
    return gaugeFrom(
      metadata?.detail ?? fallback,
      histories,
      metadata?.status ?? (catalog.verifiedAt ? "CACHED" : "PENDING"),
      metadata?.updatedAt ?? catalog.verifiedAt,
    );
  }).filter((gauge): gauge is RiverGauge => Boolean(gauge && gauge.observedValue != null));
}

async function fetchCoastalStation(station: typeof selectedCoastalStations[number]): Promise<CoastalStation> {
  const common = `station=${station.id}&datum=MLLW&time_zone=gmt&units=metric&application=Osprey&format=json`;
  const [observationValue, predictionValue] = await Promise.all([
    fetchJson(`${COOPS_BASE}?date=latest&product=water_level&${common}`),
    fetchJson(`${COOPS_BASE}?date=today&range=24&product=predictions&interval=h&${common}`),
  ]);
  const observationPayload = asRecord(observationValue);
  const predictionPayload = asRecord(predictionValue);
  const observation = asRecord(Array.isArray(observationPayload.data) ? observationPayload.data[0] : null);
  const observedM = numberOrNull(observation.v);
  const observedAt = textOr(observation.t).replace(" ", "T") + "Z";
  const predictionItems = (Array.isArray(predictionPayload.predictions) ? predictionPayload.predictions : [])
    .map((item) => asRecord(item))
    .filter((item) => numberOrNull(item.v) != null && textOr(item.t));
  const observationTime = Date.parse(observedAt);
  const nearest = predictionItems.sort((a, b) =>
    Math.abs(Date.parse(`${textOr(a.t).replace(" ", "T")}Z`) - observationTime)
    - Math.abs(Date.parse(`${textOr(b.t).replace(" ", "T")}Z`) - observationTime))[0];
  const predictedM = nearest ? numberOrNull(nearest.v) : null;
  const anomalyM = observedM != null && predictedM != null ? Number((observedM - predictedM).toFixed(2)) : null;
  const futurePredictions = predictionItems
    .map((item) => ({ time: Date.parse(`${textOr(item.t).replace(" ", "T")}Z`), value: numberOrNull(item.v) }))
    .filter((item): item is { time: number; value: number } => item.value != null && item.time >= observationTime)
    .slice(0, 3)
    .map((item) => item.value);
  return {
    ...station,
    observedM,
    predictedM,
    anomalyM,
    observedAt,
    quality: textOr(observation.f, "Preliminary"),
    trend: trendFor([observedM, ...futurePredictions].filter((value): value is number => value != null)).trend,
    source: "NOAA CO-OPS",
  };
}

async function fetchCoastalStations() {
  const results = await Promise.allSettled(selectedCoastalStations.map(fetchCoastalStation));
  return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

export async function fetchWaterIntelligence(): Promise<WaterIntelligence> {
  const fetchedAt = new Date().toISOString();
  const [riverResult, coastalResult, zoneResult] = await Promise.allSettled([
    fetchRiverGauges(),
    fetchCoastalStations(),
    getFemaSnapshot(),
  ]);
  const riverGauges = riverResult.status === "fulfilled" ? riverResult.value : [];
  const coastalStations = coastalResult.status === "fulfilled" ? coastalResult.value : [];
  const floodZones = zoneResult.status === "fulfilled" ? zoneResult.value.collection : { type: "FeatureCollection" as const, features: [] };
  const warnings: string[] = [];
  if (riverGauges.length === 0) warnings.push("River gauge feed temporarily unavailable");
  if (coastalStations.length === 0) warnings.push("Coastal water-level feed temporarily unavailable");
  if (zoneResult.status === "rejected") warnings.push("Verified FEMA flood-zone snapshot unavailable");
  if (zoneResult.status === "fulfilled" && zoneResult.value.refresh.lastOutcome === "FAILURE") warnings.push("FEMA update pending; last verified flood-zone snapshot retained");
  const categories = riverGauges.flatMap((gauge) => [gauge.category, gauge.forecastCategory]);
  const highestCategory = categories.sort((a, b) => categoryRank[b] - categoryRank[a])[0] ?? "UNKNOWN";
  const thresholdMetadata = {
    live: riverGauges.filter((gauge) => gauge.thresholdMetadataStatus === "LIVE").length,
    cached: riverGauges.filter((gauge) => gauge.thresholdMetadataStatus === "CACHED").length,
    pending: riverGauges.filter((gauge) => gauge.thresholdMetadataStatus === "PENDING").length,
    cacheTtlHours: 24 as const,
    pendingRetryMinutes: 15 as const,
  };
  const latestRiverObservation = riverGauges
    .map((gauge) => gauge.observedAt)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const latestCoastalObservation = coastalStations
    .map((station) => station.observedAt)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const riverAge = minutesSince(latestRiverObservation);
  const coastalAge = minutesSince(latestCoastalObservation);
  const sourceHealth: ConnectorHealth[] = [
    {
      id: "river-observations",
      name: "NOAA NWPS + USGS",
      role: "River levels, trends and flood-stage metadata",
      status: riverGauges.length === 0 ? "UNAVAILABLE" : riverAge != null && riverAge > 120 ? "STALE" : riverGauges.length < selectedGaugeCatalog.length ? "DEGRADED" : "LIVE",
      eventTime: latestRiverObservation,
      receivedAt: fetchedAt,
      ageMinutes: riverAge,
      lastAttemptAt: fetchedAt,
      lastSuccessAt: riverGauges.length > 0 ? fetchedAt : null,
      fallback: "Verified NOAA threshold metadata cache",
      message: riverGauges.length === 0
        ? "River observations are unavailable; no live gauge state is inferred."
        : `${riverGauges.length} of ${selectedGaugeCatalog.length} selected river gauges reporting.`,
      affects: ["Flood lens", "Gauge stage ladder", "Infrastructure exposure"],
    },
    {
      id: "coastal-observations",
      name: "NOAA CO-OPS",
      role: "Observed and predicted coastal water levels",
      status: coastalStations.length === 0 ? "UNAVAILABLE" : coastalAge != null && coastalAge > 120 ? "STALE" : coastalStations.length < selectedCoastalStations.length ? "DEGRADED" : "LIVE",
      eventTime: latestCoastalObservation,
      receivedAt: fetchedAt,
      ageMinutes: coastalAge,
      lastAttemptAt: fetchedAt,
      lastSuccessAt: coastalStations.length > 0 ? fetchedAt : null,
      fallback: null,
      message: coastalStations.length === 0
        ? "Coastal observations are unavailable; river observations remain independent."
        : `${coastalStations.length} of ${selectedCoastalStations.length} selected coastal stations reporting.`,
      affects: ["Coastal lens", "Tide anomaly", "Coastal asset exposure"],
    },
    {
      id: "fema-nfhl",
      name: "FEMA NFHL",
      role: "Mapped Special Flood Hazard Areas",
      status: zoneResult.status === "rejected"
        ? "UNAVAILABLE"
        : zoneResult.value.refresh.lastOutcome === "FAILURE"
          ? "PENDING"
          : zoneResult.value.source.kind === "FEMA_OFFICIAL"
            ? "LIVE"
            : "CACHED",
      eventTime: zoneResult.status === "fulfilled" ? zoneResult.value.source.dataUpdatedAt : null,
      receivedAt: fetchedAt,
      ageMinutes: zoneResult.status === "fulfilled" ? minutesSince(zoneResult.value.source.dataUpdatedAt) : null,
      lastAttemptAt: zoneResult.status === "fulfilled" ? zoneResult.value.refresh.lastAttemptAt : fetchedAt,
      lastSuccessAt: zoneResult.status === "fulfilled" ? zoneResult.value.source.verifiedAt : null,
      fallback: "Bundled and R2-backed verified regional snapshot",
      message: zoneResult.status === "rejected"
        ? "No verified flood-zone snapshot is currently available."
        : zoneResult.value.refresh.message,
      affects: ["Flood-zone overlay", "Feature identify", "Mapped hazard context"],
    },
  ];
  return {
    riverGauges,
    coastalStations,
    floodZones,
    floodZoneStatus: zoneResult.status === "rejected"
      ? "UNAVAILABLE"
      : zoneResult.value.refresh.lastOutcome === "FAILURE"
        ? "PENDING"
        : zoneResult.value.source.kind === "FEMA_OFFICIAL"
          ? "LIVE"
          : "CACHED",
    floodZoneMetadata: zoneResult.status === "fulfilled" ? {
      publisher: zoneResult.value.source.publisher,
      dataset: zoneResult.value.source.dataset,
      coverage: zoneResult.value.source.coverage,
      dataUpdatedAt: zoneResult.value.source.dataUpdatedAt,
      verifiedAt: zoneResult.value.source.verifiedAt,
      lastRefreshAttemptAt: zoneResult.value.refresh.lastAttemptAt,
      refreshIntervalDays: FEMA_REFRESH_INTERVAL_DAYS,
      sourceKind: zoneResult.value.source.kind,
    } : {
      publisher: "FEMA National Flood Hazard Layer",
      dataset: "Flood Hazard Zones",
      coverage: "Houston–Galveston operating area · Special Flood Hazard Areas",
      dataUpdatedAt: null,
      verifiedAt: null,
      lastRefreshAttemptAt: null,
      refreshIntervalDays: FEMA_REFRESH_INTERVAL_DAYS,
      sourceKind: "NONE",
    },
    highestCategory,
    thresholdMetadata,
    fetchedAt,
    isLive: riverGauges.length > 0 || coastalStations.length > 0,
    warnings,
    sourceHealth,
  };
}
