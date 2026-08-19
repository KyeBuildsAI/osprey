import { fetchRainfallAtPoint } from "@/lib/rainfall";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return Response.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
  }
  try {
    const result = await fetchRainfallAtPoint({ id: "MAP-SELECTION", name: "Selected map location", latitude, longitude });
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "NOAA MRMS rainfall is temporarily unavailable." }, { status: 502 });
  }
}
