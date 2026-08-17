import { createIncidentIntelligence } from "@/lib/intelligence";
import { fetchHoustonWeather } from "@/lib/nws";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const weather = await fetchHoustonWeather();
    return Response.json(createIncidentIntelligence(weather), {
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
