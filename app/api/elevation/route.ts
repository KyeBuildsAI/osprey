import { fetchPointElevation } from "@/lib/usgs";

export const dynamic = "force-dynamic";

const OPERATING_BOUNDS = {
  west: -97.2,
  east: -93.4,
  south: 27.9,
  north: 31.3,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < OPERATING_BOUNDS.south
    || latitude > OPERATING_BOUNDS.north
    || longitude < OPERATING_BOUNDS.west
    || longitude > OPERATING_BOUNDS.east
  ) {
    return Response.json(
      { error: "Select a location inside the Houston–Galveston operating area." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const elevationM = await fetchPointElevation(longitude, latitude);
    if (elevationM == null) {
      return Response.json(
        { error: "USGS elevation is unavailable at this location." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      {
        elevationM,
        latitude,
        longitude,
        source: "USGS 3DEP Elevation Point Query Service",
      },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch {
    return Response.json(
      { error: "USGS elevation service did not respond." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
