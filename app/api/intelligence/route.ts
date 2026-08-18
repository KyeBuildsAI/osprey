import { createIncidentIntelligence, rainfallSamplePoints } from "@/lib/intelligence";
import { fetchHoustonWeather } from "@/lib/nws";
import { fetchRainfallIntelligence } from "@/lib/rainfall";
import { fetchAssetElevations } from "@/lib/usgs";
import { fetchWaterIntelligence } from "@/lib/water";
import { fetchAssetRegister, priorityAssetPoints } from "@/lib/asset-register";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assetRegister = await fetchAssetRegister();
    const priorityAssets = priorityAssetPoints(assetRegister);
    const rainfallPoints = rainfallSamplePoints(assetRegister);
    const [weather, elevations, water, rainfall] = await Promise.all([
      fetchHoustonWeather(),
      fetchAssetElevations(priorityAssets),
      fetchWaterIntelligence(),
      fetchRainfallIntelligence(rainfallPoints),
    ]);
    return Response.json(createIncidentIntelligence(weather, elevations, water, rainfall, assetRegister), {
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
