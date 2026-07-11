"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { NearbyPoi, VillageBoundary } from "@/lib/platform-api";

type ReportMapProps = {
  latitude: number;
  longitude: number;
  competitors?: NearbyPoi[];
  anchors?: NearbyPoi[];
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

function fc(points: NearbyPoi[]) {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({ type: "Feature", properties: { name: p.name || "" }, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })),
  } as any;
}

export function ReportMap({ latitude, longitude, competitors = [], anchors = [], villageBoundary = null, height = 320 }: ReportMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let mounted = true;
    const map = new maplibregl.Map({
      container: mapEl.current,
      center: [longitude, latitude],
      zoom: 15,
      interactive: false,
      attributionControl: false,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm-base", type: "raster", source: "osm", paint: { "raster-opacity": 0.92, "raster-saturation": -0.32, "raster-brightness-min": 0.1, "raster-brightness-max": 1.0 } }],
      },
    });
    mapRef.current = map;

    const transport = anchors.filter((a) => a.category_key === "transport");
    const others = anchors.filter((a) => a.category_key !== "transport");

    map.on("load", () => {
      if (!mounted) return;

      if (villageBoundary?.geometry) {
        map.addSource("area", { type: "geojson", data: { type: "Feature", properties: {}, geometry: villageBoundary.geometry } as any });
        map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#0E7A62", "fill-opacity": 0.09 } });
        map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#0E7A62", "line-width": 2, "line-dasharray": [2, 1.6] } });
      }

      if (others.length) {
        map.addSource("anchors", { type: "geojson", data: fc(others) });
        map.addLayer({ id: "anchors-circle", type: "circle", source: "anchors", paint: { "circle-radius": 4.5, "circle-color": "#B08033", "circle-stroke-color": "#fff", "circle-stroke-width": 1.2, "circle-opacity": 0.9 } });
      }
      if (transport.length) {
        map.addSource("transport", { type: "geojson", data: fc(transport) });
        map.addLayer({ id: "transport-circle", type: "circle", source: "transport", paint: { "circle-radius": 4.5, "circle-color": "#0E7A62", "circle-stroke-color": "#fff", "circle-stroke-width": 1.2, "circle-opacity": 0.92 } });
      }
      if (competitors.length) {
        map.addSource("competitors", { type: "geojson", data: fc(competitors) });
        map.addLayer({ id: "competitors-circle", type: "circle", source: "competitors", paint: { "circle-radius": 5, "circle-color": "#B9543A", "circle-stroke-color": "#fff", "circle-stroke-width": 1.4, "circle-opacity": 0.9 } });
      }

      new maplibregl.Marker({ color: "#14231C" }).setLngLat([longitude, latitude]).addTo(map);

      const pts: [number, number][] = [
        [longitude, latitude],
        ...geometryPoints(villageBoundary?.geometry),
        ...competitors.slice(0, 8).map((c) => [c.longitude, c.latitude] as [number, number]),
        ...anchors.slice(0, 8).map((a) => [a.longitude, a.latitude] as [number, number]),
      ];
      if (pts.length > 1) map.fitBounds(boundsFromPoints(pts), { padding: 30, duration: 0, maxZoom: 16.2 });
      window.setTimeout(() => map.resize(), 80);
    });

    return () => { mounted = false; map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return <div ref={mapEl} style={{ height, width: "100%", overflow: "hidden" }} />;
}
