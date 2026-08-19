import { minutesSince, type ConnectorHealth } from "@/lib/source-health";

export type RainfallPeriod = 1 | 3 | 6 | 24;
export type RainfallScreening = "NORMAL" | "MONITOR" | "ELEVATED" | "UNAVAILABLE";

export interface RainfallSamplePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface RainfallSample extends RainfallSamplePoint {
  accumulationIn: Record<RainfallPeriod, number | null>;
  screening: RainfallScreening;
}

export interface RainfallIntelligence {
  samples: RainfallSample[];
  periods: RainfallPeriod[];
  validAt: Partial<Record<RainfallPeriod, string>>;
  fetchedAt: string;
  isLive: boolean;
  resolutionKm: number;
  coverage: string;
  warnings: string[];
  sourceHealth: ConnectorHealth;
}

const SERVICE = "https://mapservices.weather.noaa.gov/raster/rest/services/obs/mrms_qpe/ImageServer";
const PERIODS: RainfallPeriod[] = [1, 3, 6, 24];
const PERIOD_CODE: Record<RainfallPeriod, string> = { 1: "01", 3: "03", 6: "06", 24: "24" };

const emptyAccumulation = (): Record<RainfallPeriod, number | null> => ({ 1: null, 3: null, 6: null, 24: null });

export function rainfallScreening(accumulation: Record<RainfallPeriod, number | null>): RainfallScreening {
  if (Object.values(accumulation).every((value) => value == null)) return "UNAVAILABLE";
  if (
    (accumulation[1] ?? 0) >= 1.5
    || (accumulation[3] ?? 0) >= 2.5
    || (accumulation[6] ?? 0) >= 3.5
    || (accumulation[24] ?? 0) >= 5
  ) return "ELEVATED";
  if (
    (accumulation[1] ?? 0) >= 0.5
    || (accumulation[3] ?? 0) >= 1
    || (accumulation[6] ?? 0) >= 1.5
    || (accumulation[24] ?? 0) >= 2
  ) return "MONITOR";
  return "NORMAL";
}

async function arcGisJson<T>(path: string, parameters: Record<string, string>): Promise<T> {
  const url = new URL(`${SERVICE}/${path}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Osprey/0.1 rainfall adapter" },
    cache: "no-store",
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) throw new Error(`NOAA MRMS request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchPeriod(points: RainfallSamplePoint[], period: RainfallPeriod) {
  const geometry = JSON.stringify({
    points: points.map((point) => [point.longitude, point.latitude]),
    spatialReference: { wkid: 4326 },
  });
  const payload = await arcGisJson<{
    samples?: Array<{ locationId?: number; value?: string; resolution?: number }>;
    error?: { message?: string };
  }>("getSamples", {
    geometry,
    geometryType: "esriGeometryMultipoint",
    mosaicRule: JSON.stringify({ where: `name='conus_QPE_${PERIOD_CODE[period]}H'` }),
    renderingRule: JSON.stringify({ rasterFunction: `rft_${period}hr` }),
    returnFirstValueOnly: "true",
    f: "json",
  });
  if (payload.error || !payload.samples) throw new Error(payload.error?.message ?? `NOAA MRMS ${period}-hour samples unavailable`);
  const values = points.map(() => null as number | null);
  let resolutionKm: number | null = null;
  payload.samples.forEach((sample, index) => {
    const sampleIndex = Number.isInteger(sample.locationId) ? sample.locationId! : index;
    const value = Number(sample.value);
    values[sampleIndex] = Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
    if (Number.isFinite(sample.resolution)) resolutionKm = Math.round((sample.resolution! / 1000) * 10) / 10;
  });
  return { period, values, resolutionKm };
}

async function fetchValidTimes() {
  const subsets = PERIODS.map((period) => `'conus_QPE_${PERIOD_CODE[period]}H'`).join(",");
  const payload = await arcGisJson<{
    features?: Array<{ attributes?: { idp_subset?: string; idp_validendtime?: number } }>;
  }>("query", {
    where: `idp_subset IN (${subsets})`,
    outFields: "idp_subset,idp_validendtime",
    returnGeometry: "false",
    f: "json",
  });
  const validAt: Partial<Record<RainfallPeriod, string>> = {};
  for (const feature of payload.features ?? []) {
    const subset = feature.attributes?.idp_subset ?? "";
    const period = PERIODS.find((candidate) => subset.endsWith(`_${PERIOD_CODE[candidate]}H`));
    const timestamp = feature.attributes?.idp_validendtime;
    if (period && timestamp && Number.isFinite(timestamp)) validAt[period] = new Date(timestamp).toISOString();
  }
  return validAt;
}

export function demoRainfallIntelligence(points: RainfallSamplePoint[]): RainfallIntelligence {
  const fetchedAt = "2026-08-17T16:01:00.000Z";
  return {
    samples: points.map((point) => ({ ...point, accumulationIn: emptyAccumulation(), screening: "UNAVAILABLE" })),
    periods: PERIODS,
    validAt: {},
    fetchedAt,
    isLive: false,
    resolutionKm: 1,
    coverage: "Houston–Galveston operating area",
    warnings: ["Connecting to NOAA MRMS rainfall estimates."],
    sourceHealth: {
      id: "noaa-mrms-qpe",
      name: "NOAA/NWS MRMS QPE",
      role: "Radar-estimated rainfall accumulation and asset screening",
      status: "DEMO",
      eventTime: null,
      receivedAt: fetchedAt,
      ageMinutes: null,
      lastAttemptAt: fetchedAt,
      lastSuccessAt: null,
      fallback: "Rainfall layer remains off until a verified MRMS response arrives",
      message: "Connecting to the official radar-derived rainfall service.",
      affects: ["Rainfall overlay", "Asset exposure", "Weather assessment"],
    },
  };
}

export async function fetchRainfallIntelligence(points: RainfallSamplePoint[]): Promise<RainfallIntelligence> {
  const fetchedAt = new Date().toISOString();
  const [validTimesResult, ...periodResults] = await Promise.allSettled([
    fetchValidTimes(),
    ...PERIODS.map((period) => fetchPeriod(points, period)),
  ]);
  const samples = points.map((point) => ({ ...point, accumulationIn: emptyAccumulation(), screening: "UNAVAILABLE" as RainfallScreening }));
  const warnings: string[] = [];
  let resolutionKm = 1;
  let successfulPeriods = 0;

  periodResults.forEach((result, index) => {
    const period = PERIODS[index];
    if (result.status === "rejected") {
      warnings.push(`${period}-hour NOAA MRMS accumulation is temporarily unavailable.`);
      return;
    }
    successfulPeriods += 1;
    resolutionKm = result.value.resolutionKm ?? resolutionKm;
    result.value.values.forEach((value, sampleIndex) => {
      samples[sampleIndex].accumulationIn[period] = value;
    });
  });
  samples.forEach((sample) => { sample.screening = rainfallScreening(sample.accumulationIn); });

  const validAt = validTimesResult.status === "fulfilled" ? validTimesResult.value : {};
  if (validTimesResult.status === "rejected") warnings.push("MRMS valid-time metadata is temporarily unavailable.");
  const eventTimes = Object.values(validAt).filter(Boolean).map((value) => Date.parse(value!)).filter(Number.isFinite);
  const eventTime = eventTimes.length > 0 ? new Date(Math.max(...eventTimes)).toISOString() : null;
  const ageMinutes = minutesSince(eventTime, Date.parse(fetchedAt));
  const status: ConnectorHealth["status"] = successfulPeriods === 0
    ? "UNAVAILABLE"
    : ageMinutes != null && ageMinutes > 180
      ? "STALE"
      : successfulPeriods < PERIODS.length || !eventTime
        ? "DEGRADED"
        : "LIVE";
  const isLive = successfulPeriods > 0;

  return {
    samples,
    periods: PERIODS,
    validAt,
    fetchedAt,
    isLive,
    resolutionKm,
    coverage: "Houston–Galveston operating area",
    warnings,
    sourceHealth: {
      id: "noaa-mrms-qpe",
      name: "NOAA/NWS MRMS QPE",
      role: "Radar-estimated rainfall accumulation and asset screening",
      status,
      eventTime,
      receivedAt: fetchedAt,
      ageMinutes,
      lastAttemptAt: fetchedAt,
      lastSuccessAt: isLive ? fetchedAt : null,
      fallback: isLive ? null : "River, coastal and NWS forecast evidence remains available",
      message: isLive
        ? `${successfulPeriods} of ${PERIODS.length} accumulation periods reporting across ${points.length} operational points.`
        : "NOAA MRMS rainfall estimates are unavailable; Osprey has not inferred rainfall values.",
      affects: ["Rainfall overlay", "Asset exposure", "Weather assessment"],
    },
  };
}

export async function fetchRainfallAtPoint(point: RainfallSamplePoint) {
  const rainfall = await fetchRainfallIntelligence([point]);
  const sample = rainfall.samples[0];
  return {
    accumulationIn: sample.accumulationIn,
    screening: sample.screening,
    validAt: rainfall.validAt,
    fetchedAt: rainfall.fetchedAt,
    sourceStatus: rainfall.sourceHealth.status,
  };
}
