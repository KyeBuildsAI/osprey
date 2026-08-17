import { env } from "cloudflare:workers";
import seedSnapshot from "@/data/fema-houston-galveston-snapshot.json";
import type { FloodZoneCollection, FloodZoneFeature } from "@/lib/water-types";

export type FemaSnapshotKind = "FEMA_OFFICIAL" | "REGIONAL_MIRROR";
export type FemaRefreshOutcome = "SUCCESS" | "FAILURE";

export interface FemaSnapshot {
  schemaVersion: 1;
  source: {
    kind: FemaSnapshotKind;
    publisher: string;
    dataset: string;
    itemId: string | null;
    url: string;
    upstream: "FEMA National Flood Hazard Layer";
    coverage: string;
    dataUpdatedAt: string;
    verifiedAt: string;
  };
  refresh: {
    lastAttemptAt: string;
    lastOutcome: FemaRefreshOutcome;
    message: string;
  };
  collection: FloodZoneCollection;
}

interface R2ObjectLike {
  json<T>(): Promise<T>;
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

interface ArcGisSource {
  kind: FemaSnapshotKind;
  publisher: string;
  dataset: string;
  itemId: string | null;
  endpoint: string;
  pageSize: number;
  timeoutMs: number;
}

const SNAPSHOT_KEY = "fema/houston-galveston-sfha-v1.json";
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const BOUNDS = "-95.91,28.98,-94.55,30.15";
const OUT_FIELDS = "OBJECTID,DFIRM_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE";
const sources: ArcGisSource[] = [
  {
    kind: "FEMA_OFFICIAL",
    publisher: "Federal Emergency Management Agency",
    dataset: "National Flood Hazard Layer · Flood Hazard Zones",
    itemId: "ae38b6f94eaf4abf97f986fa01921e13",
    endpoint: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
    pageSize: 500,
    timeoutMs: 6500,
  },
  {
    kind: "REGIONAL_MIRROR",
    publisher: "Houston–Galveston Area Council",
    dataset: "FEMA_NFHL_Floodplain_8co_2026_v1",
    itemId: "7ccc7191bf8349b0a477946d87cc6856",
    endpoint: "https://services1.arcgis.com/Z6SBWLWGRRejblAA/arcgis/rest/services/FEMA_NFHL_Floodplain_8co/FeatureServer/0",
    pageSize: 2000,
    timeoutMs: 30_000,
  },
];

let memorySnapshot: FemaSnapshot | null = null;
let storageChecked = false;
let refreshPromise: Promise<{ snapshot: FemaSnapshot; updated: boolean }> | null = null;

function bucket() {
  return (env as unknown as { FEMA_SNAPSHOTS?: R2BucketLike }).FEMA_SNAPSHOTS ?? null;
}

function validCollection(value: unknown): value is FloodZoneCollection {
  if (!value || typeof value !== "object") return false;
  const collection = value as { type?: unknown; features?: unknown };
  return collection.type === "FeatureCollection" && Array.isArray(collection.features) && collection.features.every((feature) => {
    const geometry = (feature as { geometry?: { type?: unknown } })?.geometry;
    return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
  });
}

function validSnapshot(value: unknown): value is FemaSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<FemaSnapshot>;
  return snapshot.schemaVersion === 1
    && typeof snapshot.source?.verifiedAt === "string"
    && typeof snapshot.source?.dataUpdatedAt === "string"
    && validCollection(snapshot.collection);
}

function bundledSnapshot(): FemaSnapshot {
  if (!validSnapshot(seedSnapshot)) throw new Error("Bundled FEMA snapshot is invalid");
  return seedSnapshot;
}

async function saveSnapshot(snapshot: FemaSnapshot) {
  const store = bucket();
  if (!store) return;
  await store.put(SNAPSHOT_KEY, JSON.stringify(snapshot), { httpMetadata: { contentType: "application/json" } });
}

export async function getFemaSnapshot() {
  if (memorySnapshot) return memorySnapshot;
  if (!storageChecked) {
    storageChecked = true;
    try {
      const stored = await bucket()?.get(SNAPSHOT_KEY);
      const value = stored ? await stored.json<unknown>() : null;
      if (validSnapshot(value)) memorySnapshot = value;
    } catch {
      // The bundled snapshot remains the durable cold-start fallback.
    }
  }
  memorySnapshot ??= bundledSnapshot();
  return memorySnapshot;
}

function baseQuery() {
  return new URLSearchParams({
    where: "SFHA_TF='T'",
    geometry: BOUNDS,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
  });
}

async function fetchJson(url: string, timeoutMs: number) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Osprey flood reference refresh/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchSource(source: ArcGisSource): Promise<FemaSnapshot> {
  const idsQuery = baseQuery();
  idsQuery.set("returnIdsOnly", "true");
  idsQuery.set("f", "json");
  const idsPayload = await fetchJson(`${source.endpoint}/query?${idsQuery}`, source.timeoutMs);
  const objectIds = Array.isArray(idsPayload.objectIds) ? [...new Set(idsPayload.objectIds.filter((id): id is number => typeof id === "number"))] : [];
  if (objectIds.length === 0) throw new Error("No regional flood-zone identifiers returned");
  const pageCount = Math.ceil(objectIds.length / source.pageSize);
  const pages: FloodZoneFeature[][] = [];

  for (let batchStart = 0; batchStart < pageCount; batchStart += 5) {
    const batch = Array.from({ length: Math.min(5, pageCount - batchStart) }, async (_, batchIndex) => {
      const index = batchStart + batchIndex;
      const query = baseQuery();
      Object.entries({
        outSR: "4326",
        outFields: OUT_FIELDS,
        returnGeometry: "true",
        maxAllowableOffset: "0.003",
        geometryPrecision: "4",
        orderByFields: "OBJECTID",
        resultOffset: String(index * source.pageSize),
        resultRecordCount: String(source.pageSize),
        f: "geojson",
      }).forEach(([key, value]) => query.set(key, value));
      const payload = await fetchJson(`${source.endpoint}/query?${query}`, source.timeoutMs);
      const collection = { type: payload.type, features: payload.features };
      if (!validCollection(collection)) throw new Error(`Invalid flood-zone page ${index + 1}`);
      return collection.features;
    });
    pages.push(...await Promise.all(batch));
  }

  const features = pages.flat();
  if (features.length !== objectIds.length) throw new Error(`Incomplete flood-zone refresh: ${features.length} of ${objectIds.length}`);
  const metadata = await fetchJson(`${source.endpoint}?f=json`, source.timeoutMs);
  const editingInfo = metadata.editingInfo && typeof metadata.editingInfo === "object" ? metadata.editingInfo as Record<string, unknown> : {};
  const dataTimestamp = typeof editingInfo.dataLastEditDate === "number" ? editingInfo.dataLastEditDate : Date.now();
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    source: {
      kind: source.kind,
      publisher: source.publisher,
      dataset: typeof metadata.name === "string" ? metadata.name : source.dataset,
      itemId: source.itemId,
      url: source.endpoint,
      upstream: "FEMA National Flood Hazard Layer",
      coverage: "Houston–Galveston operating area · Special Flood Hazard Areas",
      dataUpdatedAt: new Date(dataTimestamp).toISOString(),
      verifiedAt: now,
    },
    refresh: {
      lastAttemptAt: now,
      lastOutcome: "SUCCESS",
      message: source.kind === "FEMA_OFFICIAL"
        ? "Official FEMA NFHL refresh completed."
        : "Verified regional FEMA NFHL snapshot refreshed from H-GAC.",
    },
    collection: { type: "FeatureCollection", features },
  };
}

async function doRefresh(force: boolean) {
  const current = await getFemaSnapshot();
  const store = bucket();
  if (store && current === bundledSnapshot()) await saveSnapshot(current).catch(() => {});
  if (!force && Date.now() - Date.parse(current.source.verifiedAt) < REFRESH_INTERVAL_MS) {
    return { snapshot: current, updated: false };
  }

  for (const source of sources) {
    try {
      const snapshot = await fetchSource(source);
      memorySnapshot = snapshot;
      await saveSnapshot(snapshot);
      return { snapshot, updated: true };
    } catch {
      // Try the next verified source. The last complete snapshot is never discarded.
    }
  }

  const failed: FemaSnapshot = {
    ...current,
    refresh: {
      lastAttemptAt: new Date().toISOString(),
      lastOutcome: "FAILURE",
      message: "FEMA update pending; the last verified snapshot remains displayed.",
    },
  };
  memorySnapshot = failed;
  await saveSnapshot(failed).catch(() => {});
  return { snapshot: failed, updated: false };
}

export function refreshFemaSnapshot(force = false) {
  if (!refreshPromise) {
    refreshPromise = doRefresh(force).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const FEMA_REFRESH_INTERVAL_DAYS = 7;
