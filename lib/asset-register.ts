import type { Feature, FeatureCollection, Geometry } from "geojson";
import { minutesSince, type ConnectorHealth } from "@/lib/source-health";

export type AssetRegisterCategory = "HOSPITAL" | "FIRE_EMS" | "LAW_ENFORCEMENT" | "BRIDGE" | "HIGHWAY" | "WATERSHED";

export interface AssetRegisterFeature {
  id: string;
  name: string;
  category: AssetRegisterCategory;
  geometry: Geometry;
  latitude: number;
  longitude: number;
  location: string;
  source: string;
  sourceUpdatedAt: string | null;
  reference: string | null;
  condition: string | null;
  detail: string;
}

export interface AssetRegister {
  features: AssetRegisterFeature[];
  counts: Record<AssetRegisterCategory, number>;
  fetchedAt: string;
  coverage: string;
  warnings: string[];
  sourceHealth: ConnectorHealth[];
}

const BOUNDS = "-95.95,29.25,-94.75,30.15";
const USGS_STRUCTURES = "https://carto.nationalmap.gov/arcgis/rest/services/structures/MapServer";
const NBI = "https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Bridge_Inventory/FeatureServer/0";
const NHS = "https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Highway_System/FeatureServer/0";
const HCFCD_WATERSHEDS = "https://services2.arcgis.com/nLl0k0Mja5hnSeSl/arcgis/rest/services/Regional_Watersheds/FeatureServer/0";
const EMPTY_COUNTS: Record<AssetRegisterCategory, number> = {
  HOSPITAL: 0,
  FIRE_EMS: 0,
  LAW_ENFORCEMENT: 0,
  BRIDGE: 0,
  HIGHWAY: 0,
  WATERSHED: 0,
};

type JsonProperties = Record<string, unknown>;

function property(properties: JsonProperties, ...keys: string[]) {
  const entries = Object.entries(properties);
  for (const key of keys) {
    const match = entries.find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
    if (match && match[1] != null && String(match[1]).trim()) return match[1];
  }
  return null;
}

function text(properties: JsonProperties, ...keys: string[]) {
  const value = property(properties, ...keys);
  return value == null ? "" : String(value).trim();
}

function dateFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && value.trim()) {
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  }
  return null;
}

function coordinatePairs(geometry: Geometry): number[][] {
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates;
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

function representativePoint(geometry: Geometry) {
  const coordinates = coordinatePairs(geometry);
  if (coordinates.length === 0) return { longitude: -95.3698, latitude: 29.7604 };
  const longitude = coordinates.reduce((total, pair) => total + pair[0], 0) / coordinates.length;
  const latitude = coordinates.reduce((total, pair) => total + pair[1], 0) / coordinates.length;
  return { longitude, latitude };
}

async function queryGeoJson(endpoint: string, options: { where?: string; outFields: string; limit: number; orderBy?: string; simplify?: string }) {
  const url = new URL(`${endpoint}/query`);
  url.searchParams.set("where", options.where ?? "1=1");
  url.searchParams.set("geometry", BOUNDS);
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", options.outFields);
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("resultRecordCount", String(options.limit));
  url.searchParams.set("geometryPrecision", "5");
  if (options.orderBy) url.searchParams.set("orderByFields", options.orderBy);
  if (options.simplify) url.searchParams.set("maxAllowableOffset", options.simplify);
  url.searchParams.set("f", "geojson");
  const response = await fetch(url, {
    headers: { Accept: "application/geo+json, application/json", "User-Agent": "Osprey/0.3 official infrastructure register" },
    cache: "no-store",
    signal: AbortSignal.timeout(14_000),
  });
  if (!response.ok) throw new Error(`Infrastructure reference request failed with ${response.status}`);
  const payload = await response.json() as FeatureCollection;
  if (!Array.isArray(payload.features)) throw new Error("Infrastructure reference response was incomplete");
  return payload.features.filter((feature): feature is Feature<Geometry, JsonProperties> => Boolean(feature.geometry));
}

function normalizeStructure(feature: Feature<Geometry, JsonProperties>, category: AssetRegisterCategory): AssetRegisterFeature {
  const properties = feature.properties ?? {};
  const point = representativePoint(feature.geometry);
  const address = [text(properties, "address"), text(properties, "city"), text(properties, "state")].filter(Boolean).join(", ");
  const reference = text(properties, "permanent_identifier") || String(feature.id ?? "");
  return {
    id: `USGS-${category}-${reference || text(properties, "objectid")}`,
    name: text(properties, "name") || category.replaceAll("_", " "),
    category,
    geometry: feature.geometry,
    ...point,
    location: address || "Houston–Galveston operating area",
    source: "USGS National Structures Dataset",
    sourceUpdatedAt: dateFrom(property(properties, "loaddate")),
    reference: reference || null,
    condition: null,
    detail: `${category === "HOSPITAL" ? "Hospital / medical centre" : category === "FIRE_EMS" ? "Fire / EMS station" : "Law-enforcement facility"}${address ? ` · ${address}` : ""}`,
  };
}

function bridgeCondition(value: string) {
  return value === "P" ? "Poor" : value === "F" ? "Fair" : value === "G" ? "Good" : "Not reported";
}

function normalizeBridge(feature: Feature<Geometry, JsonProperties>): AssetRegisterFeature {
  const properties = feature.properties ?? {};
  const point = representativePoint(feature.geometry);
  const reference = text(properties, "STRUCTURE_NUMBER_008") || String(feature.id ?? "");
  const route = text(properties, "ROUTE_NUMBER_005D").replace(/^0+/, "");
  const crossed = text(properties, "FEATURES_DESC_006A") || "reported feature";
  const condition = bridgeCondition(text(properties, "BRIDGE_CONDITION"));
  return {
    id: `NBI-${reference}`,
    name: `${route ? `Route ${route}` : "Public road"} bridge over ${crossed}`,
    category: "BRIDGE",
    geometry: feature.geometry,
    ...point,
    location: "Houston–Galveston operating area",
    source: "FHWA National Bridge Inventory",
    sourceUpdatedAt: "2025-06-20T00:00:00.000Z",
    reference: reference || null,
    condition,
    detail: `${condition} bridge condition · lowest component rating ${text(properties, "LOWEST_RATING") || "not reported"} · NBI status ${text(properties, "STATUS") || "not reported"}`,
  };
}

function normalizeHighway(feature: Feature<Geometry, JsonProperties>): AssetRegisterFeature {
  const properties = feature.properties ?? {};
  const point = representativePoint(feature.geometry);
  const route = text(properties, "SIGN1") || text(properties, "ROUTEID") || "NHS route";
  const reference = text(properties, "ROUTEID") || String(feature.id ?? "");
  const aadt = Number(property(properties, "AADT"));
  return {
    id: `NHS-${text(properties, "OBJECTID") || reference}`,
    name: `${route.replace(/^I(?=\d)/, "I-").replace(/^S(?=\d)/, "SH ")} National Highway System segment`,
    category: "HIGHWAY",
    geometry: feature.geometry,
    ...point,
    location: "Houston–Galveston operating area",
    source: "FHWA / BTS National Highway System",
    sourceUpdatedAt: dateFrom(text(properties, "VERSION").replaceAll(".", "-")) ?? "2025-08-08T00:00:00.000Z",
    reference: reference || null,
    condition: null,
    detail: `${Number.isFinite(aadt) ? `${Math.round(aadt).toLocaleString("en-US")} annual average daily traffic · ` : ""}${text(properties, "MILES") || "—"} segment miles · federal functional class ${text(properties, "FCLASS") || "—"}`,
  };
}

function normalizeWatershed(feature: Feature<Geometry, JsonProperties>): AssetRegisterFeature {
  const properties = feature.properties ?? {};
  const point = representativePoint(feature.geometry);
  const name = text(properties, "Label", "WTSHNAME") || "HCFCD watershed";
  const reference = text(properties, "WTSHUNIT", "OBJECTID");
  return {
    id: `HCFCD-WATERSHED-${reference || name}`,
    name: `${name} watershed`,
    category: "WATERSHED",
    geometry: feature.geometry,
    ...point,
    location: "Harris County drainage network",
    source: "Harris County Flood Control District",
    sourceUpdatedAt: null,
    reference: reference || null,
    condition: null,
    detail: "Regional drainage watershed boundary · reference context, not a current inundation extent",
  };
}

function health(id: string, name: string, role: string, features: AssetRegisterFeature[], fetchedAt: string, fallback: string): ConnectorHealth {
  const dates = features.map((feature) => feature.sourceUpdatedAt).filter((value): value is string => Boolean(value));
  const eventTime = dates.length > 0 ? new Date(Math.max(...dates.map((value) => Date.parse(value)))).toISOString() : null;
  return {
    id,
    name,
    role,
    status: features.length > 0 ? "CACHED" : "UNAVAILABLE",
    eventTime,
    receivedAt: fetchedAt,
    ageMinutes: minutesSince(eventTime, Date.parse(fetchedAt)),
    lastAttemptAt: fetchedAt,
    lastSuccessAt: features.length > 0 ? fetchedAt : null,
    fallback: features.length > 0 ? null : fallback,
    message: features.length > 0 ? `${features.length} verified reference features loaded for the operating area.` : "The reference inventory is temporarily unavailable; live hazard feeds are unaffected.",
    affects: ["Infrastructure map", "Asset register", "Exposure screening"],
  };
}

export const demoAssetRegister: AssetRegister = {
  features: [],
  counts: { ...EMPTY_COUNTS },
  fetchedAt: "2026-08-17T16:01:00.000Z",
  coverage: "Houston–Galveston operating area",
  warnings: ["Connecting to official infrastructure reference inventories."],
  sourceHealth: [],
};

export async function fetchAssetRegister(): Promise<AssetRegister> {
  const fetchedAt = new Date().toISOString();
  const requests = await Promise.allSettled([
    queryGeoJson(`${USGS_STRUCTURES}/49`, { outFields: "OBJECTID,PERMANENT_IDENTIFIER,NAME,ADDRESS,CITY,STATE,ZIPCODE,LOADDATE", limit: 25, orderBy: "LOADDATE DESC" }),
    queryGeoJson(`${USGS_STRUCTURES}/51`, { outFields: "OBJECTID,PERMANENT_IDENTIFIER,NAME,ADDRESS,CITY,STATE,ZIPCODE,LOADDATE", limit: 30, orderBy: "LOADDATE DESC" }),
    queryGeoJson(`${USGS_STRUCTURES}/53`, { outFields: "OBJECTID,PERMANENT_IDENTIFIER,NAME,ADDRESS,CITY,STATE,ZIPCODE,LOADDATE", limit: 20, orderBy: "LOADDATE DESC" }),
    queryGeoJson(NBI, { where: "BRIDGE_CONDITION IN ('P','F')", outFields: "OBJECTID,STRUCTURE_NUMBER_008,ROUTE_NUMBER_005D,FEATURES_DESC_006A,BRIDGE_CONDITION,LOWEST_RATING,STATUS,DATE,LATDD,LONGDD", limit: 50, orderBy: "LOWEST_RATING ASC" }),
    queryGeoJson(NHS, { where: "FCLASS <= 2 AND STATUS = 1", outFields: "OBJECTID,VERSION,ROUTEID,SIGN1,LNAME,NHS,FCLASS,AADT,MILES,STATUS", limit: 80, orderBy: "AADT DESC", simplify: "0.0002" }),
    queryGeoJson(HCFCD_WATERSHEDS, { outFields: "OBJECTID,WTSHUNIT,Label,WTSHNAME", limit: 40, orderBy: "Label ASC", simplify: "0.001" }),
  ]);
  const warnings: string[] = [];
  const take = (index: number, label: string) => {
    const result = requests[index];
    if (result.status === "fulfilled") return result.value;
    warnings.push(`${label} reference inventory is temporarily unavailable.`);
    return [];
  };
  const hospitals = take(0, "USGS hospital").map((feature) => normalizeStructure(feature, "HOSPITAL"));
  const fire = take(1, "USGS fire / EMS").map((feature) => normalizeStructure(feature, "FIRE_EMS"));
  const police = take(2, "USGS law-enforcement").map((feature) => normalizeStructure(feature, "LAW_ENFORCEMENT"));
  const bridges = take(3, "FHWA bridge").map(normalizeBridge);
  const highways = take(4, "FHWA highway").map(normalizeHighway);
  const watersheds = take(5, "HCFCD watershed").map(normalizeWatershed);
  const features = [...hospitals, ...fire, ...police, ...bridges, ...highways, ...watersheds];
  const counts = features.reduce((current, feature) => ({ ...current, [feature.category]: current[feature.category] + 1 }), { ...EMPTY_COUNTS });
  const structures = [...hospitals, ...fire, ...police];
  return {
    features,
    counts,
    fetchedAt,
    coverage: "Houston–Galveston operating area",
    warnings,
    sourceHealth: [
      health("usgs-structures", "USGS National Structures", "Hospitals, fire / EMS and law-enforcement facilities", structures, fetchedAt, "Basemap places remain available"),
      health("fhwa-nbi", "FHWA National Bridge Inventory", "Fair and poor public-road bridge reference records", bridges, fetchedAt, "Basemap bridges remain available"),
      health("fhwa-nhs", "FHWA / BTS National Highway System", "Interstate and principal-arterial corridor geometry", highways, fetchedAt, "OpenStreetMap road context remains available"),
      health("hcfcd-watersheds", "Harris County Flood Control District", "Regional watershed and drainage-boundary context", watersheds, fetchedAt, "River gauges and FEMA flood zones remain available"),
    ],
  };
}

export function priorityAssetPoints(register: AssetRegister) {
  const select = (category: AssetRegisterCategory, limit: number) => register.features.filter((feature) => feature.category === category && feature.geometry.type === "Point").slice(0, limit);
  return [
    ...select("HOSPITAL", 4),
    ...select("FIRE_EMS", 3),
    ...select("LAW_ENFORCEMENT", 2),
    ...select("BRIDGE", 3),
  ];
}

export function assetRegisterCollection(register: AssetRegister, categories?: AssetRegisterCategory[]): FeatureCollection {
  const allowed = new Set(categories ?? Object.keys(EMPTY_COUNTS) as AssetRegisterCategory[]);
  return {
    type: "FeatureCollection",
    features: register.features.filter((feature) => allowed.has(feature.category)).map((feature) => ({
      type: "Feature",
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        id: feature.id,
        name: feature.name,
        category: feature.category,
        type: feature.category.replaceAll("_", " "),
        sourceName: feature.source,
        sourceUpdatedAt: feature.sourceUpdatedAt,
        ref: feature.reference,
        condition: feature.condition,
        detail: feature.detail,
      },
    })),
  };
}
