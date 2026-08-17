import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SERVICE = "https://services1.arcgis.com/Z6SBWLWGRRejblAA/arcgis/rest/services/FEMA_NFHL_Floodplain_8co/FeatureServer/0";
const ITEM_ID = "7ccc7191bf8349b0a477946d87cc6856";
const BOUNDS = "-95.91,28.98,-94.55,30.15";
const PAGE_SIZE = 2000;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../data/fema-houston-galveston-snapshot.json");

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function baseParams() {
  return new URLSearchParams({
    where: "SFHA_TF='T'",
    geometry: BOUNDS,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
  });
}

async function fetchSnapshot() {
  const idsParams = baseParams();
  idsParams.set("returnIdsOnly", "true");
  idsParams.set("f", "json");
  const idPayload = await getJson(`${SERVICE}/query?${idsParams}`);
  const objectIds = [...new Set(idPayload.objectIds ?? [])].sort((a, b) => a - b);
  if (objectIds.length === 0) throw new Error("The H-GAC FEMA NFHL service returned no flood-zone identifiers.");

  const pages = await Promise.all(Array.from({ length: Math.ceil(objectIds.length / PAGE_SIZE) }, async (_, index) => {
    const params = baseParams();
    Object.entries({
      outSR: "4326",
      outFields: "OBJECTID,DFIRM_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE",
      returnGeometry: "true",
      maxAllowableOffset: "0.003",
      geometryPrecision: "4",
      orderByFields: "OBJECTID",
      resultOffset: String(index * PAGE_SIZE),
      resultRecordCount: String(PAGE_SIZE),
      f: "geojson",
    }).forEach(([key, value]) => params.set(key, value));
    return getJson(`${SERVICE}/query?${params}`);
  }));
  const features = pages.flatMap((page) => page.features ?? []).filter((feature) => feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon");
  if (features.length !== objectIds.length) throw new Error(`Expected ${objectIds.length} polygons but received ${features.length}.`);

  const [item, layer] = await Promise.all([
    getJson(`https://www.arcgis.com/sharing/rest/content/items/${ITEM_ID}?f=json`),
    getJson(`${SERVICE}?f=json`),
  ]);
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    source: {
      kind: "REGIONAL_MIRROR",
      publisher: "Houston–Galveston Area Council",
      dataset: layer.name ?? "FEMA NFHL Floodplain — eight-county region",
      itemId: ITEM_ID,
      url: SERVICE,
      upstream: "FEMA National Flood Hazard Layer",
      coverage: "Houston–Galveston operating area · Special Flood Hazard Areas",
      dataUpdatedAt: new Date(layer.editingInfo?.dataLastEditDate ?? item.modified).toISOString(),
      verifiedAt: now,
    },
    refresh: {
      lastAttemptAt: now,
      lastOutcome: "SUCCESS",
      message: "Verified regional FEMA NFHL snapshot loaded from H-GAC.",
    },
    collection: { type: "FeatureCollection", features },
  };
}

const snapshot = await fetchSnapshot();
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(snapshot));
console.log(`${snapshot.collection.features.length} verified FEMA NFHL polygons written to ${OUTPUT}`);
