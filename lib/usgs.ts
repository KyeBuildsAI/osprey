const USGS_ENDPOINT = "https://epqs.nationalmap.gov/v1/json";

export interface ElevationPoint {
  id: string;
  latitude: number;
  longitude: number;
}

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

export async function fetchPointElevation(longitude: number, latitude: number) {
  const url = new URL(USGS_ENDPOINT);
  url.searchParams.set("x", String(longitude));
  url.searchParams.set("y", String(latitude));
  url.searchParams.set("wkid", "4326");
  url.searchParams.set("units", "Meters");
  url.searchParams.set("includeDate", "false");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Osprey/0.2 geospatial incident-room prototype" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  return readElevation(await response.json());
}

export async function fetchAssetElevations(points: ElevationPoint[]): Promise<Record<string, number | null>> {
  const samples = await Promise.all(
    points.map(async (asset) => {
      try {
        const liveSample = await fetchPointElevation(asset.longitude, asset.latitude);
        return [asset.id, liveSample] as const;
      } catch {
        return [asset.id, null] as const;
      }
    }),
  );
  return Object.fromEntries(samples);
}
