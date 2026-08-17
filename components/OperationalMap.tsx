"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AttributionControl, Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Feature, FeatureCollection, Geometry, Point, Polygon } from "geojson";
import type { AlertGeometry, InfrastructureAsset, WeatherAlert } from "@/lib/intelligence";

type MapLayer = "Risk" | "Impact" | "Assets";
type ExposureQuery = "Radius" | "Polygon" | "Assets";
type HazardId = "compound" | "flood" | "wind" | "heat";

const HOUSTON: [number, number] = [-95.3698, 29.7604];
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

function queryFeature(query: ExposureQuery): Feature<Polygon> {
  return {
    type: "Feature",
    properties: { query },
    geometry: query === "Radius" ? circlePolygon(HOUSTON, 75) : OPERATIONAL_POLYGON,
  };
}

function setSourceData(map: MapLibreMap, id: string, data: FeatureCollection | Feature<Polygon>) {
  const source = map.getSource(id) as GeoJSONSource | undefined;
  if (source) source.setData(data);
}

export function OperationalMap({
  alerts,
  assets,
  layer,
  forecastHour,
  hazard,
}: {
  alerts: WeatherAlert[];
  assets: InfrastructureAsset[];
  layer: MapLayer;
  forecastHour: number;
  hazard: HazardId;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latestRef = useRef({ alerts, assets });
  const [query, setQuery] = useState<ExposureQuery>("Polygon");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

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
    latestRef.current = { alerts, assets };
  }, [alerts, assets]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-95.25, 29.58],
      zoom: 8.15,
      minZoom: 6.2,
      maxZoom: 15,
      maxBounds: [[-97.2, 27.9], [-93.4, 31.3]],
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      map.addSource("osprey-warnings", { type: "geojson", data: warningCollection(latestRef.current.alerts) });
      map.addSource("osprey-query", { type: "geojson", data: queryFeature("Polygon") });
      map.addSource("osprey-assets", { type: "geojson", data: assetCollection(latestRef.current.assets) });
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
        paint: { "line-color": "#f0c369", "line-width": 2, "line-dasharray": [3, 2] },
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
        paint: { "line-color": "#ffb091", "line-width": 2.5 },
      });
      map.addLayer({
        id: "osprey-assets",
        type: "circle",
        source: "osprey-assets",
        paint: {
          "circle-radius": ["match", ["get", "criticality"], "CRITICAL", 10, 8],
          "circle-color": ["match", ["get", "exposure"], "ELEVATED", "#de5b36", "MONITOR", "#e6ae48", "#65b889"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.96,
        },
      });

      map.on("click", "osprey-assets", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const properties = feature.properties ?? {};
        const content = document.createElement("div");
        content.className = "map-popup-content";
        const kicker = document.createElement("span");
        kicker.textContent = `${properties.type ?? "Asset"} · ${properties.criticality ?? ""}`;
        const title = document.createElement("strong");
        title.textContent = String(properties.name ?? "Infrastructure asset");
        const detail = document.createElement("p");
        detail.textContent = `${properties.location ?? ""} · ${properties.elevation ?? ""}`;
        content.append(kicker, title, detail);
        new Popup({ offset: 14, closeButton: true })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setDOMContent(content)
          .addTo(map);
      });
      map.on("mouseenter", "osprey-assets", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "osprey-assets", () => { map.getCanvas().style.cursor = ""; });
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
    setSourceData(map, "osprey-query", queryFeature(query));
    map.setPaintProperty("osprey-warning-fill", "fill-opacity", layer === "Risk" ? 0.42 : layer === "Impact" ? 0.28 : 0.12);
    map.setPaintProperty("osprey-assets", "circle-radius", layer === "Assets" ? ["match", ["get", "criticality"], "CRITICAL", 13, 10] : ["match", ["get", "criticality"], "CRITICAL", 10, 8]);
    map.setPaintProperty("osprey-query-fill", "fill-opacity", query === "Assets" ? 0.015 : 0.08 + forecastHour * 0.002);
  }, [assets, forecastHour, layer, mapReady, query, visibleAlerts]);

  return (
    <div className="geospatial-map-shell">
      <div className="map-fallback-base" aria-hidden="true">
        <div className="map-grid-lines" />
        <div className="coast-shape" />
        <div className="bay-water"><span>GALVESTON BAY</span></div>
        <div className="place place-houston"><i /><strong>Houston</strong><small>Operational centre</small></div>
        <div className="place place-clear-lake"><i /><strong>Clear Lake</strong><small>Access corridor</small></div>
        <div className="place place-galveston"><i /><strong>Galveston</strong><small>Coastal assets</small></div>
      </div>
      <div ref={containerRef} className="geospatial-map" aria-label="Interactive Houston–Galveston geospatial operations map" />
      <div className="map-time"><span>{layer.toUpperCase()} · LIVE GEOSPATIAL WINDOW</span><strong>NOW + {forecastHour} HOURS</strong></div>
      <div className="geo-source-status"><i className={mapReady ? "geo-ready" : ""} /><span>{mapError && !mapReady ? "GEOGRAPHIC FALLBACK ACTIVE" : mapReady ? "MAPLIBRE · LIVE MAP" : "LOADING GEOSPATIAL MAP"}</span></div>
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
        <small>{geospatialAlerts.length} NWS warning polygons · {warningExposures.length} direct intersections · {elevationSamples}/{assets.length} USGS elevation samples</small>
      </div>
      <div className="map-legend"><span><i className="legend-high" />NWS warning</span><span><i className="legend-medium" />Monitor</span><span><i className="legend-normal" />Normal</span></div>
      {mapReady && geospatialAlerts.length === 0 && (
        <div className="no-warning-geometry"><i>✓</i><span>No active {hazard === "compound" ? "" : `${hazard} `}NWS warning polygons in the operating area</span></div>
      )}
    </div>
  );
}
