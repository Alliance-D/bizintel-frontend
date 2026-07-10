"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { NearbyCompetitor, VillageBoundary } from "@/lib/platform-api";

type ReportMapProps = {
  latitude: number;
  longitude: number;
  competitors?: NearbyCompetitor[];
  villageBoundary?: VillageBoundary;
  height?: number;
};

function boundsFromPoints(points: [number, number][]): maplibregl.LngLatBoundsLike {
  let minLng = points[0][0], maxLng = points[0][0], minLat = points[0][1], maxLat = points[0][1];
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

function geometryPoints(geometry: GeoJSON.Geometry | null | undefined): [number, number][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.flat(1) as [number, number][];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2) as [number, number][];
  return [];
}

export function ReportMap({ latitude, longitude, competitors = [], villageBoundary = null, height = 320 }: ReportMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let mounted = true;
    const map = new maplibregl.Map({
      container: mapEl.current,
      center: [longitude, latitude],
      zoom: 15.4,
      interactive: false,
      attributionControl: false,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm-base", type: "raster", source: "osm", paint: { "raster-opacity": 0.9, "raster-saturation": -0.28, "raster-brightness-min": 0.08, "raster-brightness-max": 1.0 } }],
      },
    });
    mapRef.current = map;

    map.on("load", () => {
      if (!mounted) return;

      if (villageBoundary?.geometry) {
        map.addSource("village-boundary", { type: "geojson", data: { type: "Feature", properties: {}, geometry: villageBoundary.geometry } as any });
        map.addLayer({ id: "village-boundary-fill", type: "fill", source: "village-boundary", paint: { "fill-color": "#0f766e", "fill-opacity": 0.1 } });
        map.addLayer({ id: "village-boundary-line", type: "line", source: "village-boundary", paint: { "line-color": "#0f766e", "line-width": 2, "line-dasharray": [2, 1.4] } });
      }

      if (competitors.length > 0) {
        map.addSource("competitors", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: competitors.map((c) => ({
              type: "Feature",
              properties: { name: c.name || "" },
              geometry: { type: "Point", coordinates: [c.longitude, c.latitude] },
            })),
          } as any,
        });
        map.addLayer({
          id: "competitors-circle",
          type: "circle",
          source: "competitors",
          paint: { "circle-radius": 5, "circle-color": "#dc2626", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.4, "circle-opacity": 0.85 },
        });
      }

      new maplibregl.Marker({ color: "#0f172a" }).setLngLat([longitude, latitude]).addTo(map);

      const boundaryPoints = geometryPoints(villageBoundary?.geometry);
      const competitorPoints: [number, number][] = competitors.map((c) => [c.longitude, c.latitude]);
      const allPoints: [number, number][] = [[longitude, latitude], ...boundaryPoints, ...competitorPoints];
      if (allPoints.length > 1) {
        map.fitBounds(boundsFromPoints(allPoints), { padding: 32, duration: 0, maxZoom: 16.5 });
      }

      window.setTimeout(() => map.resize(), 80);
    });

    return () => {
      mounted = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return <div ref={mapEl} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}
