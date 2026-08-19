import { minutesSince, type ConnectorHealth } from "@/lib/source-health";
import type { AssetRegister } from "@/lib/asset-register";
import type { RainfallIntelligence, RainfallPeriod, RainfallScreening, RainfallSamplePoint } from "@/lib/rainfall";

export type OperationalImpactKind = "FREEWAY_INCIDENT" | "STREET_INCIDENT" | "STALL" | "ROAD_CLOSURE" | "HIGH_WATER";
export type OperationalImpactStatus = "REPORTED" | "VERIFIED" | "RESTRICTED" | "CLOSED" | "RESOLVED";
export type OperationalImpactSeverity = "LOW" | "MODERATE" | "HIGH";

export interface NearbyInfrastructure {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
}

export interface OperationalImpact {
  id: string;
  title: string;
  location: string;
  kind: OperationalImpactKind;
  status: OperationalImpactStatus;
  severity: OperationalImpactSeverity;
  description: string;
  lanesAffected: string | null;
  duration: string | null;
  latitude: number;
  longitude: number;
  observedAt: string;
  source: "Houston TranStar";
  sourceUrl: string;
  nearbyInfrastructure: NearbyInfrastructure[];
  rainfallIn: Record<RainfallPeriod, number | null>;
  rainfallScreening: RainfallScreening;
}

export interface OperationalImpactIntelligence {
  impacts: OperationalImpact[];
  fetchedAt: string;
  observedAt: string | null;
  coverage: string;
  warnings: string[];
  sourceHealth: ConnectorHealth;
}

const SOURCE_URL = "https://traffic.houstontranstar.org/roadclosures/roadclosures.aspx";
const EMPTY_RAINFALL: Record<RainfallPeriod, number | null> = { 1: null, 3: null, 6: null, 24: null };

function decodeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function centralTimeToIso(value: string) {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
  if (!match) return null;
  const [, month, day, year, rawHour, minute, meridiem] = match;
  let hour = Number(rawHour) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;
  const guess = Date.UTC(Number(year), Number(month) - 1, Number(day), hour, Number(minute));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const zoneAsUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"));
  return new Date(guess - (zoneAsUtc - guess)).toISOString();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function section(html: string, id: string, followingIds: string[]) {
  const startMatch = new RegExp(`<div[^>]+id=["']${id}["'][^>]*>`, "i").exec(html);
  if (!startMatch) return "";
  const start = startMatch.index;
  const ends = followingIds.map((nextId) => {
    const match = new RegExp(`<div[^>]+id=["']${nextId}["'][^>]*>`, "i").exec(html.slice(start + 1));
    return match ? start + 1 + match.index : html.length;
  });
  return html.slice(start, Math.min(...ends));
}

function rows(value: string) {
  return [...value.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => ({
    raw: row[1],
    cells: [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decodeHtml(cell[1])),
  })).filter((row) => row.cells.length > 0);
}

function coordinates(raw: string) {
  const match = raw.match(/layers_ve\.aspx\?[^"']*x=([-\d.]+)&(?:amp;)?y=([-\d.]+)/i);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function impactStatus(kind: OperationalImpactKind, statusText: string, lanesAffected: string) : OperationalImpactStatus {
  const status = statusText.toLowerCase();
  if (/cleared|inactive/.test(status)) return "RESOLVED";
  if (kind === "ROAD_CLOSURE") {
    if (/currently closed/.test(status) || (/active/.test(status) && /total closure/i.test(lanesAffected))) return "CLOSED";
    return "RESTRICTED";
  }
  if (kind === "HIGH_WATER") return "VERIFIED";
  if (/verified/.test(status)) return "VERIFIED";
  return "REPORTED";
}

function impactSeverity(kind: OperationalImpactKind, description: string, lanesAffected: string, status: OperationalImpactStatus): OperationalImpactSeverity {
  const text = `${description} ${lanesAffected}`.toLowerCase();
  if (status === "CLOSED" || kind === "HIGH_WATER" || /hazmat|major accident|total closure|mainlane/.test(text)) return "HIGH";
  if (status === "VERIFIED" || /accident|traffic hazard|\blane/.test(text)) return "MODERATE";
  return "LOW";
}

function makeImpact(kind: OperationalImpactKind, row: ReturnType<typeof rows>[number], observedAt: string, index: number): OperationalImpact | null {
  const point = coordinates(row.raw);
  if (!point) return null;
  const [location, description = "Reported transport disruption"] = row.cells;
  let lanesAffected = "";
  let duration = "";
  let statusText = "Reported";
  if (kind === "FREEWAY_INCIDENT") {
    lanesAffected = row.cells[3] ?? "";
    statusText = row.cells[4] ?? "Reported";
  } else if (kind === "STREET_INCIDENT") {
    statusText = row.cells[2] ?? "Reported";
  } else if (kind === "STALL") {
    lanesAffected = row.cells[2] ?? "";
    statusText = row.cells[3] ?? "Reported";
  } else if (kind === "ROAD_CLOSURE") {
    lanesAffected = row.cells[2] ?? "";
    duration = row.cells[3] ?? "";
    statusText = row.cells[4] ?? "Active";
  } else {
    statusText = row.cells.at(-2) ?? "Reported";
  }
  const status = impactStatus(kind, statusText, lanesAffected);
  return {
    id: `TRANSTAR-${kind}-${slug(location)}-${index}`,
    title: `${location} · ${description}`,
    location,
    kind,
    status,
    severity: impactSeverity(kind, description, lanesAffected, status),
    description: statusText,
    lanesAffected: lanesAffected || null,
    duration: duration || null,
    ...point,
    observedAt,
    source: "Houston TranStar",
    sourceUrl: SOURCE_URL,
    nearbyInfrastructure: [],
    rainfallIn: { ...EMPTY_RAINFALL },
    rainfallScreening: "UNAVAILABLE",
  };
}

function parsePanel(html: string, id: string, followingIds: string[], kind: OperationalImpactKind, fallbackTime: string) {
  const panel = section(html, id, followingIds);
  const updateText = panel.match(/Updated on\s+([^<]+)<\/i>/i)?.[1] ?? "";
  const observedAt = centralTimeToIso(updateText) ?? fallbackTime;
  return {
    observedAt,
    impacts: rows(panel).map((row, index) => makeImpact(kind, row, observedAt, index)).filter((impact): impact is OperationalImpact => Boolean(impact)),
  };
}

function distanceKm(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const demoOperationalImpacts: OperationalImpactIntelligence = {
  impacts: [],
  fetchedAt: "2026-08-17T16:01:00.000Z",
  observedAt: null,
  coverage: "Houston TranStar monitored road network",
  warnings: ["Connecting to the Houston TranStar operational-impact feed."],
  sourceHealth: {
    id: "houston-transtar-impacts",
    name: "Houston TranStar",
    role: "Reported incidents, verified freeway disruptions, stalls, high water and road closures",
    status: "DEMO",
    eventTime: null,
    receivedAt: "2026-08-17T16:01:00.000Z",
    ageMinutes: null,
    lastAttemptAt: "2026-08-17T16:01:00.000Z",
    lastSuccessAt: null,
    fallback: "Live hazard, water and infrastructure-reference layers remain available",
    message: "Connecting to the official operational-impact surface.",
    affects: ["Disruption map", "Infrastructure assessment", "Operational impact summary"],
  },
};

export async function fetchOperationalImpacts(): Promise<OperationalImpactIntelligence> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { Accept: "text/html", "User-Agent": "Osprey/0.4 private operational-awareness prototype" },
      cache: "no-store",
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) throw new Error(`Houston TranStar request failed with ${response.status}`);
    const html = await response.text();
    const panels = [
      parsePanel(html, "freeway", ["street", "stalls", "highwater", "roadclosures"], "FREEWAY_INCIDENT", fetchedAt),
      parsePanel(html, "street", ["stalls", "highwater", "roadclosures"], "STREET_INCIDENT", fetchedAt),
      parsePanel(html, "stalls", ["highwater", "roadclosures"], "STALL", fetchedAt),
      parsePanel(html, "highwater", ["ice", "roadclosures"], "HIGH_WATER", fetchedAt),
      parsePanel(html, "roadclosures", [], "ROAD_CLOSURE", fetchedAt),
    ];
    const impacts = panels.flatMap((panel) => panel.impacts);
    const observedAt = new Date(Math.max(...panels.map((panel) => Date.parse(panel.observedAt)))).toISOString();
    const ageMinutes = minutesSince(observedAt, Date.parse(fetchedAt));
    const status: ConnectorHealth["status"] = ageMinutes == null ? "DEGRADED" : ageMinutes > 60 ? "STALE" : ageMinutes > 15 ? "DEGRADED" : "LIVE";
    const active = impacts.filter((impact) => impact.status !== "RESOLVED").length;
    return {
      impacts,
      fetchedAt,
      observedAt,
      coverage: "Houston TranStar monitored road network",
      warnings: status === "LIVE" ? [] : ["Houston TranStar is reporting, but its event time is outside Osprey's 15-minute freshness target."],
      sourceHealth: {
        id: "houston-transtar-impacts",
        name: "Houston TranStar",
        role: "Reported incidents, verified freeway disruptions, stalls, high water and road closures",
        status,
        eventTime: observedAt,
        receivedAt: fetchedAt,
        ageMinutes,
        lastAttemptAt: fetchedAt,
        lastSuccessAt: fetchedAt,
        fallback: null,
        message: `${active} active or recently verified impacts and ${impacts.length - active} recently resolved records received.`,
        affects: ["Disruption map", "Infrastructure assessment", "Operational impact summary"],
      },
    };
  } catch {
    return {
      ...demoOperationalImpacts,
      fetchedAt,
      warnings: ["Houston TranStar operational impacts are temporarily unavailable; Osprey has not inferred closures."],
      sourceHealth: {
        ...demoOperationalImpacts.sourceHealth,
        status: "UNAVAILABLE",
        receivedAt: fetchedAt,
        lastAttemptAt: fetchedAt,
        message: "The official operational-impact surface did not respond; no closure or incident status has been inferred.",
      },
    };
  }
}

export function operationalImpactSamplePoints(impacts: OperationalImpactIntelligence): RainfallSamplePoint[] {
  return impacts.impacts.filter((impact) => impact.status !== "RESOLVED").slice(0, 12).map(({ id, title: name, latitude, longitude }) => ({ id, name, latitude, longitude }));
}

export function enrichOperationalImpacts(impacts: OperationalImpactIntelligence, register: AssetRegister, rainfall: RainfallIntelligence): OperationalImpactIntelligence {
  const candidates = register.features.filter((feature) => feature.category !== "WATERSHED");
  return {
    ...impacts,
    impacts: impacts.impacts.map((impact) => {
      const nearbyInfrastructure = candidates
        .map((feature) => ({
          id: feature.id,
          name: feature.name,
          type: feature.category.replaceAll("_", " "),
          distanceKm: Math.round(distanceKm(impact, feature) * 10) / 10,
        }))
        .filter((feature) => feature.distanceKm <= 3)
        .sort((first, second) => first.distanceKm - second.distanceKm)
        .slice(0, 3);
      const rainfallSample = rainfall.samples.find((sample) => sample.id === impact.id);
      return {
        ...impact,
        nearbyInfrastructure,
        rainfallIn: rainfallSample?.accumulationIn ?? { ...EMPTY_RAINFALL },
        rainfallScreening: rainfallSample?.screening ?? "UNAVAILABLE",
      };
    }),
  };
}
