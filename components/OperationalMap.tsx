"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Feature, FeatureCollection, GeoJsonObject, Geometry, Point, Polygon } from "geojson";
import type { AlertGeometry, InfrastructureAsset, WeatherAlert } from "@/lib/intelligence";
import type { WaterIntelligence } from "@/lib/water";

type MapLayer = "Risk" | "Impact" | "Assets";
type ExposureQuery = "Radius" | "Polygon" | "Assets";
type HazardId = "compound" | "flood" | "wind" | "heat";
type ContextLayer = "Roads" | "Water" | "Rail" | "Places" | "Terrain" | "Flood zones";

export interface MapFeatureSelection {
  id: string;
  name: string;
  category: string;
  classification: string;
  source: string;
  longitude: number;
  latitude: number;
  reference: string | null;
  detail: string;
  elevationM: number | null;
  elevationStatus: "loading" | "ready" | "unavailable";
}

const HOUSTON: [number, number] = [-95.3698, 29.7604];
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const CONTEXT_LAYERS: ContextLayer[] = ["Roads", "Water", "Rail", "Places", "Terrain", "Flood zones"];
const OSPREY_LAYER_PREFIX = "osprey-";
setWorkerUrl(mapLibreWorkerUrl);

const OPERATIONAL_POLYGON: Polygon = {
  type: "Polygon",
  coordinates: [[
    [-95.91, 30.12],
    [-95.06, 30.15],
    [-94.55, 29.72],
    [-94.67, 29.08],
    [-95.08, 28.98],
    [-95.48, 29.38],
    [-95.91, 30.12],
  ]],
};

function circlePolygon(center: [number, number], radiusKm: number, steps = 72): Polygon {
  const [longitude, latitude] = center;
  const latitudeRadius = radiusKm / 111.32;
  const longitudeRadius = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));
  const ring = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [longitude + longitudeRadius * Math.cos(angle), latitude + latitudeRadius * Math.sin(angle)];
  });
  return { type: "Polygon", coordinates: [ring] };
}

function pointInRing(longitude: number, latitude: number, ring: number[][]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects = y > latitude !== previousY > latitude
      && longitude < ((previousX - x) * (latitude - y)) / ((previousY - y) || Number.EPSILON) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(longitude: number, latitude: number, geometry: AlertGeometry | Polygon) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => pointInRing(longitude, latitude, polygon[0] ?? []));
}

function matchesHazard(alert: WeatherAlert, hazard: HazardId) {
  if (hazard === "compound") return true;
  const text = `${alert.event} ${alert.headline}`.toLowerCase();
  if (hazard === "flood") return /flood|rain|surge|coastal|hydrolog/.test(text);
  if (hazard === "wind") return /wind|tornado|hurricane|storm|gale/.test(text);
  return /heat|temperature/.test(text);
}

function warningCollection(alerts: WeatherAlert[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts
      .filter((alert) => alert.geometry)
      .map((alert) => ({
        type: "Feature",
        id: alert.id,
        geometry: alert.geometry as Geometry,
        properties: { id: alert.id, event: alert.event, severity: alert.severity, headline: alert.headline },
      })),
  };
}

function assetCollection(assets: InfrastructureAsset[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: assets.map((asset) => ({
      type: "Feature",
      id: asset.id,
      geometry: { type: "Point", coordinates: [asset.longitude, asset.latitude] },
      properties: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        location: asset.location,
        exposure: asset.exposure,
        criticality: asset.criticality,
        elevation: asset.elevationM == null ? "Elevation unavailable" : `${Math.round(asset.elevationM)} m USGS elevation`,
      },
    })),
  };
}

function nextGaugeThreshold(gauge: WaterIntelligence["riverGauges"][number]) {
  if (gauge.observedValue == null) return null;
  const stages = [
    ["Action", gauge.actionStage],
    ["Minor", gauge.minorStage],
    ["Moderate", gauge.moderateStage],
    ["Major", gauge.majorStage],
  ] as const;
  const next = stages.find(([, value]) => value != null && gauge.observedValue! < value);
  return next ? `Next ${next[0].toLowerCase()} at ${next[1]} ${gauge.observedUnit}` : null;
}

function waterStationCollection(water: WaterIntelligence): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: [
      ...water.riverGauges.map((gauge) => ({
        type: "Feature" as const,
        id: gauge.id,
        geometry: { type: "Point" as const, coordinates: [gauge.longitude, gauge.latitude] },
        properties: {
          id: gauge.id,
          ref: gauge.usgsId ?? gauge.id,
          name: gauge.name,
          type: "River gauge",
          category: gauge.category,
          reading: `${gauge.observedValue ?? "—"} ${gauge.observedUnit}`,
          trend: gauge.trend,
          threshold: gauge.thresholdMetadataStatus === "PENDING"
            ? "Threshold Metadata pending · live level unaffected"
            : gauge.actionStage == null
              ? "No NOAA action stage published"
              : `${gauge.percentToAction ?? "—"}% of ${gauge.actionStage} ${gauge.observedUnit} action stage${nextGaugeThreshold(gauge) ? ` · ${nextGaugeThreshold(gauge)}` : ""} · ${gauge.thresholdMetadataStatus.toLowerCase()} metadata`,
          sourceName: gauge.source,
        },
      })),
      ...water.coastalStations.map((station) => ({
        type: "Feature" as const,
        id: station.id,
        geometry: { type: "Point" as const, coordinates: [station.longitude, station.latitude] },
        properties: {
          id: station.id,
          ref: station.id,
          name: station.name,
          type: "Coastal station",
          category: "COASTAL",
          reading: `${station.observedM ?? "—"} m MLLW`,
          trend: station.trend,
          threshold: station.anomalyM == null ? "Tide anomaly unavailable" : `${station.anomalyM >= 0 ? "+" : ""}${station.anomalyM} m versus prediction`,
          sourceName: station.source,
        },
      })),
    ],
  };
}

function queryFeature(query: ExposureQuery): Feature<Polygon> {
  return {
    type: "Feature",
    properties: { query },
    geometry: query === "Radius" ? circlePolygon(HOUSTON, 75) : OPERATIONAL_POLYGON,
  };
}

function selectionFeature(longitude: number, latitude: number): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [longitude, latitude] },
  };
}

function setSourceData(map: MapLibreMap, id: string, data: GeoJsonObject) {
  const source = map.getSource(id) as GeoJSONSource | undefined;
  if (source) source.setData(data);
}

function titleCase(value: unknown) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function property(feature: MapGeoJSONFeature, ...keys: string[]) {
  for (const key of keys) {
    const value = feature.properties?.[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return "";
}

function featureCategory(feature: MapGeoJSONFeature) {
  if (feature.source === "osprey-assets") return "Critical asset";
  if (feature.source === "osprey-warnings") return "Weather warning";
  if (feature.source === "osprey-water-stations") return property(feature, "type") || "Water station";
  if (feature.source === "osprey-flood-zones") return "FEMA flood hazard zone";

  const descriptor = `${feature.sourceLayer ?? ""} ${feature.layer.id} ${property(feature, "class", "subclass", "type", "kind", "brunnel")}`.toLowerCase();
  if (property(feature, "bridge") || /\bbridge\b/.test(descriptor)) return "Bridge";
  if (/rail|railway|tram|subway/.test(descriptor)) return "Railway";
  if (/road|street|transport|motorway|trunk|primary|secondary|tertiary|path/.test(descriptor)) return "Road";
  if (/water|river|lake|ocean|bay|canal|stream/.test(descriptor)) return "Water";
  if (/building/.test(descriptor)) return "Building";
  if (/poi|place|airport|aeroway|park|hospital|school|landmark/.test(descriptor)) return "Landmark";
  if (/landuse|landcover|natural/.test(descriptor)) return "Terrain";
  return "Map feature";
}

function contextCategory(layer: { id: string; sourceLayer?: string }): ContextLayer | null {
  if (layer.id.startsWith(OSPREY_LAYER_PREFIX)) return null;
  const descriptor = `${layer.id} ${layer.sourceLayer ?? ""}`.toLowerCase();
  if (/rail|railway|tram|subway/.test(descriptor)) return "Rail";
  if (/road|street|transport|motorway|trunk|primary|secondary|tertiary|path|bridge|tunnel/.test(descriptor)) return "Roads";
  if (/water|river|lake|ocean|bay|canal|stream/.test(descriptor)) return "Water";
  if (/poi|place|label|building|airport|aeroway|park|hospital|school|landmark/.test(descriptor)) return "Places";
  return null;
}

function identifyFeature(
  feature: MapGeoJSONFeature | undefined,
  longitude: number,
  latitude: number,
): MapFeatureSelection {
  const category = feature ? featureCategory(feature) : "Terrain location";
  const classValue = feature ? property(feature, "category", "FLD_ZONE", "class", "subclass", "type", "kind", "brunnel") : "";
  const reference = feature ? property(feature, "ref", "network", "icao", "iata") || null : null;
  const name = feature
    ? property(feature, "name_en", "name:en", "name", "ref") || `Unnamed ${category.toLowerCase()}`
    : "Selected terrain point";
  const structure = feature ? property(feature, "brunnel", "bridge", "tunnel") : "";
  const detailParts = [
    feature ? property(feature, "reading") : "",
    feature ? property(feature, "trend") : "",
    feature ? property(feature, "threshold", "ZONE_SUBTY") : "",
    classValue ? titleCase(classValue) : "",
    structure ? titleCase(structure) : "",
    feature ? titleCase(feature.sourceLayer ?? feature.layer.id) : "Ground elevation sample",
  ].filter(Boolean);
  const source = feature?.source === "osprey-assets"
    ? "Osprey demonstration asset"
    : feature?.source === "osprey-warnings"
      ? "National Weather Service"
      : feature?.source === "osprey-water-stations"
        ? property(feature, "sourceName") || "NOAA / USGS"
        : feature?.source === "osprey-flood-zones"
          ? "FEMA National Flood Hazard Layer"
      : "OpenStreetMap context · OpenFreeMap tiles";

  return {
    id: `${longitude.toFixed(5)}:${latitude.toFixed(5)}`,
    name: titleCase(name),
    category,
    classification: classValue ? `${category} · ${titleCase(classValue)}` : category,
    source,
    longitude,
    latitude,
    reference,
    detail: detailParts.join(" · ") || category,
    elevationM: null,
    elevationStatus: "loading",
  };
}

function isInspectable(feature: MapGeoJSONFeature) {
  if (["osprey-assets", "osprey-warnings", "osprey-water-stations", "osprey-flood-zones"].includes(String(feature.source))) return true;
  if (feature.layer.id.startsWith(OSPREY_LAYER_PREFIX)) return false;
  const category = featureCategory(feature);
  return category !== "Map feature" || Boolean(property(feature, "name", "name_en", "name:en", "ref"));
}

export function OperationalMap({
  alerts,
  assets,
  water,
  layer,
  forecastHour,
  hazard,
  onFeatureSelect,
  onOpenInfrastructure,
}: {
  alerts: WeatherAlert[];
  assets: InfrastructureAsset[];
  water: WaterIntelligence;
  layer: MapLayer;
  forecastHour: number;
  hazard: HazardId;
  onFeatureSelect?: (feature: MapFeatureSelection) => void;
  onOpenInfrastructure?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectionSequenceRef = useRef(0);
  const latestRef = useRef({ alerts, assets, water, onFeatureSelect });
  const [query, setQuery] = useState<ExposureQuery>("Polygon");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureSelection | null>(null);
  const [contextLayers, setContextLayers] = useState<Record<ContextLayer, boolean>>({
    Roads: true,
    Water: true,
    Rail: true,
    Places: true,
    Terrain: false,
    "Flood zones": true,
  });

  const visibleAlerts = useMemo(() => alerts.filter((alert) => matchesHazard(alert, hazard)), [alerts, hazard]);
  const geospatialAlerts = visibleAlerts.filter((alert) => alert.geometry);
  const selectedAssets = useMemo(() => {
    if (query === "Assets") return assets;
    const geometry = query === "Radius" ? circlePolygon(HOUSTON, 75) : OPERATIONAL_POLYGON;
    return assets.filter((asset) => pointInGeometry(asset.longitude, asset.latitude, geometry));
  }, [assets, query]);
  const warningExposures = assets.filter((asset) => geospatialAlerts.some((alert) => alert.geometry && pointInGeometry(asset.longitude, asset.latitude, alert.geometry)));
  const elevationSamples = assets.filter((asset) => asset.elevationM != null).length;
  const resultTitle = query === "Assets"
    ? `${assets.length} geocoded critical assets`
    : `${selectedAssets.length} assets inside ${query === "Radius" ? "75 km radius" : "operational polygon"}`;

  useEffect(() => {
    latestRef.current = { alerts, assets, water, onFeatureSelect };
  }, [alerts, assets, onFeatureSelect, water]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [-95.25, 29.58],
      zoom: 8.15,
      minZoom: 6.2,
      maxZoom: 17,
      maxBounds: [[-97.2, 27.9], [-93.4, 31.3]],
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      map.addSource("osprey-terrain", {
        type: "raster-dem",
        tiles: [TERRAIN_TILES],
        tileSize: 256,
        maxzoom: 15,
        encoding: "terrarium",
        attribution: "Terrain tiles: AWS Terrain Tiles",
      });
      const firstLabelLayer = map.getStyle().layers?.find((styleLayer) => styleLayer.type === "symbol")?.id;
      map.addLayer({
        id: "osprey-terrain-hillshade",
        type: "hillshade",
        source: "osprey-terrain",
        layout: { visibility: "none" },
        paint: {
          "hillshade-shadow-color": "#173b32",
          "hillshade-highlight-color": "#f4e6bd",
          "hillshade-accent-color": "#9d7b40",
          "hillshade-exaggeration": 0.42,
        },
      }, firstLabelLayer);
      map.addSource("osprey-warnings", { type: "geojson", data: warningCollection(latestRef.current.alerts) });
      map.addSource("osprey-query", { type: "geojson", data: queryFeature("Polygon") });
      map.addSource("osprey-assets", { type: "geojson", data: assetCollection(latestRef.current.assets) });
      map.addSource("osprey-water-stations", { type: "geojson", data: waterStationCollection(latestRef.current.water) });
      map.addSource("osprey-flood-zones", { type: "geojson", data: latestRef.current.water.floodZones as unknown as GeoJsonObject });
      map.addSource("osprey-selection", { type: "geojson", data: selectionFeature(HOUSTON[0], HOUSTON[1]) });
      map.addLayer({
        id: "osprey-query-fill",
        type: "fill",
        source: "osprey-query",
        paint: { "fill-color": "#e9b950", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "osprey-query-line",
        type: "line",
        source: "osprey-query",
        paint: { "line-color": "#c99224", "line-width": 2, "line-dasharray": [3, 2] },
      });
      map.addLayer({
        id: "osprey-warning-fill",
        type: "fill",
        source: "osprey-warnings",
        paint: { "fill-color": ["match", ["get", "severity"], "Extreme", "#b7322c", "Severe", "#de5b36", "Moderate", "#dda63f", "#edc86f"], "fill-opacity": 0.38 },
      });
      map.addLayer({
        id: "osprey-warning-line",
        type: "line",
        source: "osprey-warnings",
        paint: { "line-color": "#ba4a2e", "line-width": 2.5 },
      });
      map.addLayer({
        id: "osprey-flood-zone-fill",
        type: "fill",
        source: "osprey-flood-zones",
        paint: {
          "fill-color": ["match", ["get", "FLD_ZONE"], "VE", "#8b4770", "AE", "#438f9a", "A", "#5d9ca5", "#79b4b3"],
          "fill-opacity": 0.18,
        },
      }, firstLabelLayer);
      map.addLayer({
        id: "osprey-flood-zone-line",
        type: "line",
        source: "osprey-flood-zones",
        paint: { "line-color": "#367f89", "line-width": 0.8, "line-opacity": 0.65 },
      }, firstLabelLayer);
      map.addLayer({
        id: "osprey-water-stations",
        type: "circle",
        source: "osprey-water-stations",
        paint: {
          "circle-radius": ["match", ["get", "category"], "MAJOR", 11, "MODERATE", 10, "MINOR", 9, "ACTION", 8, "COASTAL", 8, 7],
          "circle-color": ["match", ["get", "category"], "MAJOR", "#9f2929", "MODERATE", "#ce5534", "MINOR", "#df8e36", "ACTION", "#edb84d", "COASTAL", "#316f91", "#3e8b78"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-opacity": 0.98,
        },
      });
      map.addLayer({
        id: "osprey-assets",
        type: "circle",
        source: "osprey-assets",
        paint: {
          "circle-radius": ["match", ["get", "criticality"], "CRITICAL", 10, 8],
          "circle-color": ["match", ["get", "exposure"], "ELEVATED", "#de5b36", "MONITOR", "#e6ae48", "#38815f"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.96,
        },
      });
      map.addLayer({
        id: "osprey-selection-halo",
        type: "circle",
        source: "osprey-selection",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 15,
          "circle-color": "rgba(255,255,255,0)",
          "circle-stroke-color": "#143c30",
          "circle-stroke-width": 3,
        },
      });

      map.on("click", async (event) => {
        const rendered = map.queryRenderedFeatures([
          [event.point.x - 5, event.point.y - 5],
          [event.point.x + 5, event.point.y + 5],
        ]);
        const waterStation = rendered.find((feature) => feature.source === "osprey-water-stations");
        const asset = rendered.find((feature) => feature.source === "osprey-assets");
        const floodZone = rendered.find((feature) => feature.source === "osprey-flood-zones");
        const context = rendered.find((feature) => isInspectable(feature) && feature.source !== "osprey-warnings");
        const warning = rendered.find((feature) => feature.source === "osprey-warnings");
        const selection = identifyFeature(waterStation ?? asset ?? floodZone ?? context ?? warning, event.lngLat.lng, event.lngLat.lat);
        const sequence = ++selectionSequenceRef.current;
        setSelectedFeature(selection);
        latestRef.current.onFeatureSelect?.(selection);
        setSourceData(map, "osprey-selection", selectionFeature(selection.longitude, selection.latitude));
        map.setLayoutProperty("osprey-selection-halo", "visibility", "visible");

        try {
          const response = await fetch(`/api/elevation?lat=${selection.latitude}&lon=${selection.longitude}`, { cache: "force-cache" });
          const payload = await response.json() as { elevationM?: number };
          const resolved: MapFeatureSelection = {
            ...selection,
            elevationM: response.ok && Number.isFinite(payload.elevationM) ? payload.elevationM ?? null : null,
            elevationStatus: response.ok && Number.isFinite(payload.elevationM) ? "ready" : "unavailable",
          };
          if (selectionSequenceRef.current !== sequence) return;
          setSelectedFeature(resolved);
          latestRef.current.onFeatureSelect?.(resolved);
        } catch {
          if (selectionSequenceRef.current !== sequence) return;
          const unresolved: MapFeatureSelection = { ...selection, elevationStatus: "unavailable" };
          setSelectedFeature(unresolved);
          latestRef.current.onFeatureSelect?.(unresolved);
        }
      });
      map.getCanvas().style.cursor = "crosshair";
      setMapReady(true);
    });
    map.on("error", () => setMapError(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setSourceData(map, "osprey-warnings", warningCollection(visibleAlerts));
    setSourceData(map, "osprey-assets", assetCollection(assets));
    setSourceData(map, "osprey-water-stations", waterStationCollection(water));
    setSourceData(map, "osprey-flood-zones", water.floodZones as unknown as GeoJsonObject);
    setSourceData(map, "osprey-query", queryFeature(query));
    map.setPaintProperty("osprey-warning-fill", "fill-opacity", layer === "Risk" ? 0.42 : layer === "Impact" ? 0.28 : 0.12);
    map.setPaintProperty("osprey-assets", "circle-radius", layer === "Assets" ? ["match", ["get", "criticality"], "CRITICAL", 13, 10] : ["match", ["get", "criticality"], "CRITICAL", 10, 8]);
    map.setPaintProperty("osprey-query-fill", "fill-opacity", query === "Assets" ? 0.015 : 0.08 + forecastHour * 0.002);
  }, [assets, forecastHour, layer, mapReady, query, visibleAlerts, water]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    for (const styleLayer of map.getStyle().layers ?? []) {
      const category = contextCategory({
        id: styleLayer.id,
        sourceLayer: "source-layer" in styleLayer ? styleLayer["source-layer"] : undefined,
      });
      if (category) map.setLayoutProperty(styleLayer.id, "visibility", contextLayers[category] ? "visible" : "none");
    }
    map.setLayoutProperty("osprey-terrain-hillshade", "visibility", contextLayers.Terrain ? "visible" : "none");
    map.setLayoutProperty("osprey-flood-zone-fill", "visibility", contextLayers["Flood zones"] ? "visible" : "none");
    map.setLayoutProperty("osprey-flood-zone-line", "visibility", contextLayers["Flood zones"] ? "visible" : "none");
    map.setTerrain(contextLayers.Terrain ? { source: "osprey-terrain", exaggeration: 1.25 } : null);
    map.easeTo({ pitch: contextLayers.Terrain ? 34 : 0, duration: 450 });
  }, [contextLayers, mapReady]);

  function toggleContextLayer(contextLayer: ContextLayer) {
    setContextLayers((current) => ({ ...current, [contextLayer]: !current[contextLayer] }));
  }

  return (
    <div className="map-intelligence-layout">
      <div className="geospatial-map-shell">
        <div className="map-fallback-base" aria-hidden="true">
          <div className="map-grid-lines" />
          <div className="coast-shape" />
          <div className="bay-water"><span>GALVESTON BAY</span></div>
          <div className="place place-houston"><i /><strong>Houston</strong><small>Operational centre</small></div>
          <div className="place place-clear-lake"><i /><strong>Clear Lake</strong><small>Access corridor</small></div>
          <div className="place place-galveston"><i /><strong>Galveston</strong><small>Coastal assets</small></div>
        </div>
        <div ref={containerRef} className="geospatial-map" aria-label="Interactive Houston–Galveston infrastructure and terrain map" />
        <div className="map-time"><span>{layer.toUpperCase()} · INFRASTRUCTURE WINDOW</span><strong>NOW + {forecastHour} HOURS</strong></div>
        <div className="geo-source-status"><i className={mapReady ? "geo-ready" : ""} /><span>{mapError && !mapReady ? "GEOGRAPHIC FALLBACK ACTIVE" : mapReady ? "DETAILED VECTOR MAP · LIVE" : "LOADING INFRASTRUCTURE MAP"}</span></div>
        <div className="query-toolbar" aria-label="Map exposure query">
          <span>EXPOSURE QUERY</span>
          <div>
            {(["Radius", "Polygon", "Assets"] as const).map((option) => (
              <button key={option} className={query === option ? "query-selected" : ""} onClick={() => setQuery(option)} aria-pressed={query === option}>{option}</button>
            ))}
          </div>
        </div>
        <div className="exposure-result">
          <span>LIVE SPATIAL RESULT</span>
          <strong>{resultTitle}</strong>
          <small>{geospatialAlerts.length === 0 ? "No active NWS warning polygons" : `${geospatialAlerts.length} NWS warning polygons`} · {warningExposures.length} asset intersections · {water.riverGauges.length + water.coastalStations.length} water stations · {water.floodZones.features.length} flood-zone features · {elevationSamples}/{assets.length} USGS elevations</small>
        </div>
        <div className="map-legend"><span><i className="legend-high" />NWS warning</span><span><i className="legend-water" />Flood zone</span><span><i className="legend-normal" />Water station</span><span><i className="legend-terrain" />Terrain</span></div>
      </div>

      <aside className="feature-inspector" aria-live="polite">
        <header>
          <span className="section-kicker">INFRASTRUCTURE IDENTIFY</span>
          <h3>Click the map to inspect</h3>
          <p>Identify roads, bridges, rail, water, places and terrain height at the selected location.</p>
        </header>

        <div className="context-layer-controls" aria-label="Context map layers">
          <span>VISIBLE CONTEXT</span>
          <div>
            {CONTEXT_LAYERS.map((contextLayer) => (
              <button
                key={contextLayer}
                className={contextLayers[contextLayer] ? "context-active" : ""}
                onClick={() => toggleContextLayer(contextLayer)}
                aria-pressed={contextLayers[contextLayer]}
              >
                <i />{contextLayer}
              </button>
            ))}
          </div>
        </div>

        {selectedFeature ? (
          <div className="selected-feature-card">
            <span className="selected-feature-type"><i />{selectedFeature.category}</span>
            <h4>{selectedFeature.name}</h4>
            <p>{selectedFeature.detail}</p>
            <dl>
              <div><dt>Classification</dt><dd>{selectedFeature.classification}</dd></div>
              {selectedFeature.reference && <div><dt>Reference</dt><dd>{selectedFeature.reference}</dd></div>}
              <div><dt>Terrain height</dt><dd>{selectedFeature.elevationStatus === "loading" ? "Reading USGS elevation…" : selectedFeature.elevationStatus === "ready" ? `${selectedFeature.elevationM?.toFixed(1)} m above mean sea level` : "Elevation unavailable"}</dd></div>
              <div><dt>Coordinates</dt><dd>{selectedFeature.latitude.toFixed(5)}, {selectedFeature.longitude.toFixed(5)}</dd></div>
              <div><dt>Feature source</dt><dd>{selectedFeature.source}</dd></div>
              <div><dt>Elevation source</dt><dd>USGS 3DEP</dd></div>
            </dl>
            <button className="share-map-context" onClick={onOpenInfrastructure}>Open in Infrastructure Agent →</button>
          </div>
        ) : (
          <div className="feature-empty-state">
            <span>＋</span>
            <strong>No feature selected</strong>
            <p>Click a road, bridge, lake, railway, building or any terrain point to inspect it.</p>
            <div><small>ROAD</small><small>BRIDGE</small><small>WATER</small><small>RAIL</small><small>PLACE</small><small>TERRAIN</small></div>
          </div>
        )}

        <footer>
          <strong>Source boundary</strong>
          <p>Basemap features provide contextual geometry. Verify ownership, condition and operational authority against an official asset register before consequential action.</p>
        </footer>
      </aside>
    </div>
  );
}
