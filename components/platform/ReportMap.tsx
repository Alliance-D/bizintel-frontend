"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { NearbyPoi, VillageBoundary } from "@/lib/platform-api";
import { POI_GLYPHS, COMPETITOR_COLOR, COMPLEMENTARY_COLOR, ANCHOR_COLORS, anchorIconKey, competitorGlyphKey, discSvgMarkup } from "./poiGlyphs";

type ReportMapProps = {
  latitude: number;
  longitude: number;
  competitors?: NearbyPoi[];
  anchors?: NearbyPoi[];
  complementary?: NearbyPoi[];
  villageBoundary?: VillageBoundary;
  height?: number;
  interactive?: boolean;
  category?: string;
};

function loadIcon(map: maplibregl.Map, name: string, color: string, glyph: string): Promise<void> {
  return new Promise((resolve) => {
    if (map.hasImage(name)) return resolve();
    const img = new Image(52, 52);
    img.onload = () => { if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 }); resolve(); };
    img.onerror = () => resolve();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(discSvgMarkup(color, glyph));
  });
}

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

export function ReportMap({ latitude, longitude, competitors = [], anchors = [], complementary = [], villageBoundary = null, height = 320, interactive = false, category = "" }: ReportMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let mounted = true;
    const map = new maplibregl.Map({
      container: mapEl.current,
      center: [longitude, latitude],
      zoom: 15,
      interactive,
      attributionControl: false,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm-base", type: "raster", source: "osm", paint: { "raster-opacity": 0.92, "raster-saturation": -0.32, "raster-brightness-min": 0.1, "raster-brightness-max": 1.0 } }],
      },
    });
    mapRef.current = map;
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const compGlyph = POI_GLYPHS[competitorGlyphKey(category)];

    map.on("load", async () => {
      if (!mounted) return;

      if (villageBoundary?.geometry) {
        map.addSource("area", { type: "geojson", data: { type: "Feature", properties: {}, geometry: villageBoundary.geometry } as any });
        map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#0E7A62", "fill-opacity": 0.09 } });
        map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#0E7A62", "line-width": 2, "line-dasharray": [2, 1.6] } });
      }

      // group anchors by the icon they use
      const groups: Record<string, NearbyPoi[]> = {};
      for (const a of anchors) {
        const key = anchorIconKey(a.category_key);
        (groups[key] ||= []).push(a);
      }
      // group complementary businesses by their own category glyph
      const compl: Record<string, NearbyPoi[]> = {};
      for (const c of complementary) {
        const key = competitorGlyphKey(c.category_key);
        (compl[key] ||= []).push(c);
      }

      await Promise.all([
        loadIcon(map, "competitor", COMPETITOR_COLOR, compGlyph),
        ...Object.keys(groups).map((k) => loadIcon(map, k, ANCHOR_COLORS[k], POI_GLYPHS[k])),
        ...Object.keys(compl).map((k) => loadIcon(map, `compl-${k}`, COMPLEMENTARY_COLOR, POI_GLYPHS[k])),
      ]);
      if (!mounted) return;

      for (const [key, items] of Object.entries(groups)) {
        map.addSource(`anchors-${key}`, { type: "geojson", data: fc(items) });
        map.addLayer({ id: `anchors-${key}`, type: "symbol", source: `anchors-${key}`, layout: { "icon-image": key, "icon-size": 1.0, "icon-allow-overlap": true } });
      }
      for (const [key, items] of Object.entries(compl)) {
        map.addSource(`compl-${key}`, { type: "geojson", data: fc(items) });
        map.addLayer({ id: `compl-${key}`, type: "symbol", source: `compl-${key}`, layout: { "icon-image": `compl-${key}`, "icon-size": 0.92, "icon-allow-overlap": true } });
      }
      if (competitors.length) {
        map.addSource("competitors", { type: "geojson", data: fc(competitors) });
        map.addLayer({ id: "competitors", type: "symbol", source: "competitors", layout: { "icon-image": "competitor", "icon-size": 1.08, "icon-allow-overlap": true } });
      }

      new maplibregl.Marker({ color: "#14231C" }).setLngLat([longitude, latitude]).addTo(map);

      const pts: [number, number][] = [
        [longitude, latitude],
        ...geometryPoints(villageBoundary?.geometry),
        ...competitors.slice(0, 8).map((c) => [c.longitude, c.latitude] as [number, number]),
        ...anchors.slice(0, 8).map((a) => [a.longitude, a.latitude] as [number, number]),
        ...complementary.slice(0, 6).map((c) => [c.longitude, c.latitude] as [number, number]),
      ];
      if (pts.length > 1) map.fitBounds(boundsFromPoints(pts), { padding: 30, duration: 0, maxZoom: 16.2 });
      window.setTimeout(() => map.resize(), 80);
    });

    return () => { mounted = false; map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return <div ref={mapEl} style={{ height, width: "100%", overflow: "hidden" }} />;
}
