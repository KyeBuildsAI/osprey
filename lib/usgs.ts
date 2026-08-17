import { infrastructureAssetFixtures } from "@/lib/intelligence";

const USGS_ENDPOINT = "https://epqs.nationalmap.gov/v1/json";
const CACHED_USGS_SAMPLES: Record<string, number> = {
  "ASSET-HOSP-01": 1.767987609,
  "ASSET-PUMP-14": 9.195146561,
  "ASSET-ROUTE-45": 6.559643269,
};

function readElevation(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const direct = Number(root.value);
  if (Number.isFinite(direct) && direct > -1000) return direct;

  const legacy = root.USGS_Elevation_Point_Query_Service;
  if (legacy && typeof legacy === "object") {
    const query = (legacy as Record<string, unknown>).Elevation_Query;
    if (query && typeof query === "object") {
      const value = Number((query as Record<string, unknown>).Elevation);
      return Number.isFinite(value) && value > -1000 ? value : null;
    }
  }
  return null;
}

async function fetchElevation(longitude: number, latitude: number) {
  const url = new URL(USGS_ENDPOINT);
  url.searchParams.set("x", String(longitude));
  url.searchParams.set("y", String(latitude));
  url.searchParams.set("wkid", "4326");
  url.searchParams.set("units", "Meters");
  url.searchParams.set("includeDate", "false");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Osprey/0.2 geospatial incident-room prototype" },
    cache: "force-cache",
    signal: AbortSignal.timeout(2_500),
  });
  if (!response.ok) return null;
  return readElevation(await response.json());
}

export async function fetchAssetElevations(): Promise<Record<string, number | null>> {
  const samples = await Promise.all(
    infrastructureAssetFixtures.map(async (asset) => {
      try {
        const liveSample = await fetchElevation(asset.longitude, asset.latitude);
        return [asset.id, liveSample ?? CACHED_USGS_SAMPLES[asset.id] ?? null] as const;
      } catch {
        return [asset.id, CACHED_USGS_SAMPLES[asset.id] ?? null] as const;
      }
    }),
  );
  return Object.fromEntries(samples);
}
