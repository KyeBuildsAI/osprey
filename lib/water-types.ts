export type FloodCategory = "NORMAL" | "ACTION" | "MINOR" | "MODERATE" | "MAJOR" | "UNKNOWN";
export type WaterTrend = "RISING" | "FALLING" | "STEADY" | "UNKNOWN";
export type ThresholdMetadataStatus = "LIVE" | "CACHED" | "PENDING";

export interface FloodZoneGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface FloodZoneFeature {
  type: "Feature";
  id?: string | number;
  geometry: FloodZoneGeometry;
  properties: {
    FLD_ZONE?: string;
    ZONE_SUBTY?: string;
    SFHA_TF?: string;
    [key: string]: unknown;
  };
}

export interface FloodZoneCollection {
  type: "FeatureCollection";
  features: FloodZoneFeature[];
}

export interface RiverGauge {
  id: string;
  usgsId: string | null;
  name: string;
  latitude: number;
  longitude: number;
  observedValue: number | null;
  observedUnit: string;
  observedAt: string;
  quality: string;
  category: FloodCategory;
  trend: WaterTrend;
  changeSixHours: number | null;
  actionStage: number | null;
  minorStage: number | null;
  moderateStage: number | null;
  majorStage: number | null;
  forecastValue: number | null;
  forecastAt: string | null;
  forecastCategory: FloodCategory;
  percentToAction: number | null;
  impact: string | null;
  thresholdMetadataStatus: ThresholdMetadataStatus;
  thresholdMetadataUpdatedAt: string | null;
  source: "NOAA NWPS + USGS";
}

export interface CoastalStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  observedM: number | null;
  predictedM: number | null;
  anomalyM: number | null;
  observedAt: string;
  quality: string;
  trend: WaterTrend;
  source: "NOAA CO-OPS";
}

export interface WaterIntelligence {
  riverGauges: RiverGauge[];
  coastalStations: CoastalStation[];
  floodZones: FloodZoneCollection;
  floodZoneStatus: "LIVE" | "CACHED" | "PENDING" | "UNAVAILABLE" | "DEMO";
  floodZoneMetadata: {
    publisher: string;
    dataset: string;
    coverage: string;
    dataUpdatedAt: string | null;
    verifiedAt: string | null;
    lastRefreshAttemptAt: string | null;
    refreshIntervalDays: number;
    sourceKind: "FEMA_OFFICIAL" | "REGIONAL_MIRROR" | "NONE";
  };
  highestCategory: FloodCategory;
  thresholdMetadata: {
    live: number;
    cached: number;
    pending: number;
    cacheTtlHours: 24;
    pendingRetryMinutes: 15;
  };
  fetchedAt: string;
  isLive: boolean;
  warnings: string[];
  sourceHealth: ConnectorHealth[];
}

export const demoWaterIntelligence: WaterIntelligence = {
  riverGauges: [
    {
      id: "BBST2",
      usgsId: "08074000",
      name: "Buffalo Bayou at Houston",
      latitude: 29.761,
      longitude: -95.409,
      observedValue: 1.45,
      observedUnit: "ft",
      observedAt: "2026-08-17T16:00:00.000Z",
      quality: "Representative preview",
      category: "NORMAL",
      trend: "STEADY",
      changeSixHours: 0.02,
      actionStage: 17,
      minorStage: 28,
      moderateStage: 29.5,
      majorStage: 32,
      forecastValue: null,
      forecastAt: null,
      forecastCategory: "UNKNOWN",
      percentToAction: 9,
      impact: "Flood impacts begin above published action and flood stages.",
      thresholdMetadataStatus: "CACHED",
      thresholdMetadataUpdatedAt: "2026-08-17T19:15:00.000Z",
      source: "NOAA NWPS + USGS",
    },
  ],
  coastalStations: [
    {
      id: "8771450",
      name: "Galveston Pier 21",
      latitude: 29.31,
      longitude: -94.793,
      observedM: 0.14,
      predictedM: 0.11,
      anomalyM: 0.03,
      observedAt: "2026-08-17T16:00:00.000Z",
      quality: "Representative preview",
      trend: "RISING",
      source: "NOAA CO-OPS",
    },
  ],
  floodZones: { type: "FeatureCollection", features: [] },
  floodZoneStatus: "DEMO",
  floodZoneMetadata: {
    publisher: "Houston–Galveston Area Council",
    dataset: "FEMA NFHL verified regional snapshot",
    coverage: "Houston–Galveston operating area · Special Flood Hazard Areas",
    dataUpdatedAt: "2026-05-13T16:56:59.825Z",
    verifiedAt: "2026-08-17T22:29:32.086Z",
    lastRefreshAttemptAt: "2026-08-17T22:29:32.086Z",
    refreshIntervalDays: 7,
    sourceKind: "REGIONAL_MIRROR",
  },
  highestCategory: "NORMAL",
  thresholdMetadata: { live: 0, cached: 1, pending: 0, cacheTtlHours: 24, pendingRetryMinutes: 15 },
  fetchedAt: "2026-08-17T16:01:00.000Z",
  isLive: false,
  warnings: [],
  sourceHealth: [
    {
      id: "river-observations",
      name: "NOAA NWPS + USGS",
      role: "River levels, trends and flood-stage metadata",
      status: "DEMO",
      eventTime: "2026-08-17T16:00:00.000Z",
      receivedAt: "2026-08-17T16:01:00.000Z",
      ageMinutes: 1,
      lastAttemptAt: "2026-08-17T16:01:00.000Z",
      lastSuccessAt: null,
      fallback: "Verified NOAA threshold metadata cache",
      message: "Connecting to live river observations.",
      affects: ["Flood lens", "Gauge stage ladder", "Infrastructure exposure"],
    },
    {
      id: "coastal-observations",
      name: "NOAA CO-OPS",
      role: "Observed and predicted coastal water levels",
      status: "DEMO",
      eventTime: "2026-08-17T16:00:00.000Z",
      receivedAt: "2026-08-17T16:01:00.000Z",
      ageMinutes: 1,
      lastAttemptAt: "2026-08-17T16:01:00.000Z",
      lastSuccessAt: null,
      fallback: null,
      message: "Connecting to live coastal observations.",
      affects: ["Coastal lens", "Tide anomaly", "Coastal asset exposure"],
    },
    {
      id: "fema-nfhl",
      name: "FEMA NFHL",
      role: "Mapped Special Flood Hazard Areas",
      status: "DEMO",
      eventTime: "2026-05-13T16:56:59.825Z",
      receivedAt: "2026-08-17T22:29:32.086Z",
      ageMinutes: null,
      lastAttemptAt: "2026-08-17T22:29:32.086Z",
      lastSuccessAt: "2026-08-17T22:29:32.086Z",
      fallback: "Bundled verified regional snapshot",
      message: "Loading the verified flood-zone snapshot.",
      affects: ["Flood-zone overlay", "Feature identify", "Mapped hazard context"],
    },
  ],
};
import type { ConnectorHealth } from "@/lib/source-health";
