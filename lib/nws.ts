import type { AlertGeometry, WeatherAlert, WeatherState } from "@/lib/intelligence";

const HOUSTON = { latitude: 29.7604, longitude: -95.3698 };
const OPERATIONAL_BOUNDS = { west: -96.15, south: 28.95, east: -94.45, north: 30.45 };
const NWS_HEADERS = {
  Accept: "application/geo+json",
  "User-Agent": "Osprey/0.1 (portfolio incident-room prototype; https://github.com/KyeBuildsAI/osprey)",
};

async function nwsJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: NWS_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`NWS request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

const celsius = (value: number | null | undefined, unit?: string) => {
  if (value == null) return null;
  return unit === "F" ? Math.round(((value - 32) * 5) / 9) : Math.round(value);
};

const mph = (value: number | null | undefined, unitCode?: string) => {
  if (value == null) return null;
  if (unitCode?.includes("km_h")) return Math.round(value * 0.621371);
  if (unitCode?.includes("m_s")) return Math.round(value * 2.23694);
  return Math.round(value);
};

function isAlertGeometry(value: unknown): value is AlertGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: string; coordinates?: unknown };
  return (geometry.type === "Polygon" || geometry.type === "MultiPolygon") && Array.isArray(geometry.coordinates);
}

function coordinatePairs(value: unknown, pairs: number[][] = []): number[][] {
  if (!Array.isArray(value)) return pairs;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    pairs.push([value[0], value[1]]);
    return pairs;
  }
  value.forEach((child) => coordinatePairs(child, pairs));
  return pairs;
}

function intersectsOperationalArea(geometry: AlertGeometry | null, areaDescription: string) {
  if (!geometry) return /\b(?:Harris|Galveston|Brazoria|Fort Bend|Chambers|Liberty)\b/i.test(areaDescription);
  return coordinatePairs(geometry.coordinates).some(([longitude, latitude]) =>
    longitude >= OPERATIONAL_BOUNDS.west
    && longitude <= OPERATIONAL_BOUNDS.east
    && latitude >= OPERATIONAL_BOUNDS.south
    && latitude <= OPERATIONAL_BOUNDS.north,
  );
}

export async function fetchHoustonWeather(): Promise<WeatherState> {
  const point = await nwsJson<{
    properties: { forecast: string; observationStations: string; cwa: string };
  }>(`https://api.weather.gov/points/${HOUSTON.latitude},${HOUSTON.longitude}`);

  const [forecast, stations, alerts] = await Promise.all([
    nwsJson<{
      properties: { periods: Array<{ name: string; temperature: number; temperatureUnit: string; shortForecast: string; detailedForecast: string; probabilityOfPrecipitation?: { value: number | null } }> };
    }>(point.properties.forecast),
    nwsJson<{ features: Array<{ id: string }> }>(point.properties.observationStations),
    nwsJson<{ features: Array<{ id: string; geometry?: unknown; properties: { event?: string; severity?: string; urgency?: string; headline?: string; description?: string; sent?: string; expires?: string | null; areaDesc?: string } }> }>(
      "https://api.weather.gov/alerts/active?area=TX",
    ),
  ]);

  const station = stations.features[0]?.id;
  if (!station) throw new Error("NWS returned no observation station for Houston");
  const observation = await nwsJson<{
    properties: {
      timestamp: string;
      textDescription?: string;
      temperature?: { value: number | null; unitCode?: string };
      heatIndex?: { value: number | null; unitCode?: string };
      relativeHumidity?: { value: number | null };
      windSpeed?: { value: number | null; unitCode?: string };
      windDirection?: { value: number | null };
    };
  }>(`${station}/observations/latest`);

  const current = forecast.properties.periods[0];
  const degrees = observation.properties.windDirection?.value;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const windDirection = degrees == null ? null : directions[Math.round(degrees / 45) % 8];
  const normalizedAlerts: WeatherAlert[] = alerts.features
    .map((feature) => {
      const geometry = isAlertGeometry(feature.geometry) ? feature.geometry : null;
      return {
        id: feature.id,
        event: feature.properties.event ?? "Weather alert",
        severity: feature.properties.severity ?? "Unknown",
        urgency: feature.properties.urgency ?? "Unknown",
        headline: feature.properties.headline ?? feature.properties.event ?? "Active NWS alert",
        description: feature.properties.description ?? "",
        sentAt: feature.properties.sent ?? new Date().toISOString(),
        expiresAt: feature.properties.expires ?? null,
        areaDescription: feature.properties.areaDesc ?? "Houston–Galveston operational area",
        geometry,
      } satisfies WeatherAlert;
    })
    .filter((alert) => intersectsOperationalArea(alert.geometry, alert.areaDescription));

  return {
    location: "Houston–Galveston, Texas",
    ...HOUSTON,
    temperatureC: celsius(observation.properties.temperature?.value),
    heatIndexC: celsius(observation.properties.heatIndex?.value),
    humidityPercent: observation.properties.relativeHumidity?.value == null ? null : Math.round(observation.properties.relativeHumidity.value),
    windSpeedMph: mph(observation.properties.windSpeed?.value, observation.properties.windSpeed?.unitCode),
    windDirection,
    condition: observation.properties.textDescription || current?.shortForecast || "Conditions unavailable",
    forecast: {
      period: current?.name ?? "Next period",
      summary: current?.shortForecast ?? "Forecast unavailable",
      detail: current?.detailedForecast ?? "No detailed forecast was returned.",
      temperatureC: celsius(current?.temperature, current?.temperatureUnit),
      precipitationChance: current?.probabilityOfPrecipitation?.value ?? null,
    },
    activeAlerts: normalizedAlerts,
    observedAt: observation.properties.timestamp,
    fetchedAt: new Date().toISOString(),
    source: "National Weather Service",
    sourceOffice: point.properties.cwa || "HGX",
    isLive: true,
  };
}
