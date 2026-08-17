import { createIncidentIntelligence, rainfallSamplePoints } from "@/lib/intelligence";
import { fetchHoustonWeather } from "@/lib/nws";
import { fetchRainfallIntelligence } from "@/lib/rainfall";
import { fetchAssetElevations } from "@/lib/usgs";
import { fetchWaterIntelligence } from "@/lib/water";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [weather, elevations, water, rainfall] = await Promise.all([
      fetchHoustonWeather(),
      fetchAssetElevations(),
      fetchWaterIntelligence(),
      fetchRainfallIntelligence(rainfallSamplePoints),
    ]);
    return Response.json(createIncidentIntelligence(weather, elevations, water, rainfall), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refresh NWS intelligence";
    return Response.json(
      { error: message, source: "National Weather Service" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
