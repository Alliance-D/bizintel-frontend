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
  interactive?: boolean;
  category?: string;
};

// Small lucide-style glyphs (24x24 path bodies) rendered white on a coloured
// disc, so each pin reads as a bus / market / clinic / shop at a glance instead
// of forcing a trip back to the legend.
const GLYPHS: Record<string, string> = {
  transport: '<rect x="4" y="5" width="16" height="12" rx="2.5"/><path d="M4 11h16"/><circle cx="8.5" cy="20" r="1.5"/><circle cx="15.5" cy="20" r="1.5"/>',
  market: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10 5.5 4h13L20 10"/><path d="M9 20v-5h6v5"/>',
  school: '<path d="M3 9 12 5l9 4-9 4z"/><path d="M7 11v4c0 1.2 2.2 2 5 2s5-.8 5-2v-4"/>',
  health: '<path d="M12 6v12M6 12h12"/>',
  anchor: '<circle cx="12" cy="12" r="5"/>',
  // per-category competitor glyphs ("shops like yours")
  pharmacy: '<rect x="4" y="9" width="16" height="6" rx="3"/><path d="M12 9v6"/>',
  restaurant: '<path d="M7 3v6a1.5 1.5 0 0 0 3 0V3"/><path d="M8.5 9v12"/><path d="M16 3c-1.3 0-2 1.7-2 4.5S15 12 16 12v9"/>',
  cafe: '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9h2a3 3 0 0 1 0 6h-2"/><path d="M7 3v2M11 3v2"/>',
  grocery: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  salon: '<circle cx="7" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><path d="M9 8.5 20 4M9 15.5 20 20"/>',
  store: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10 5.5 4h13L20 10"/>',
};

function iconSvg(color: string, glyph: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">` +
    `<circle cx="22" cy="22" r="13" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>` +
    `<g transform="translate(13,13) scale(0.75)" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`;
}

function loadIcon(map: maplibregl.Map, name: string, color: string, glyph: string): Promise<void> {
  return new Promise((resolve) => {
    if (map.hasImage(name)) return resolve();
    const img = new Image(44, 44);
    img.onload = () => { if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 }); resolve(); };
    img.onerror = () => resolve();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg(color, glyph));
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

// which anchor icon a POI category maps to
function anchorIcon(categoryKey: string): "transport" | "market" | "school" | "health" | "anchor" {
  if (categoryKey === "transport") return "transport";
  if (categoryKey === "market") return "market";
  if (categoryKey === "school") return "school";
  if (categoryKey === "health") return "health";
  return "anchor";
}

const ANCHOR_COLORS: Record<string, string> = { transport: "#0E7A62", market: "#B08033", school: "#7A6A33", health: "#0E7A62", anchor: "#B08033" };

export function ReportMap({ latitude, longitude, competitors = [], anchors = [], villageBoundary = null, height = 320, interactive = false, category = "" }: ReportMapProps) {
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

    const compGlyph = GLYPHS[category] || GLYPHS.store;

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
        const key = anchorIcon(a.category_key);
        (groups[key] ||= []).push(a);
      }

      await Promise.all([
        loadIcon(map, "competitor", "#B9543A", compGlyph),
        ...Object.keys(groups).map((k) => loadIcon(map, k, ANCHOR_COLORS[k], GLYPHS[k])),
      ]);
      if (!mounted) return;

      for (const [key, items] of Object.entries(groups)) {
        map.addSource(`anchors-${key}`, { type: "geojson", data: fc(items) });
        map.addLayer({ id: `anchors-${key}`, type: "symbol", source: `anchors-${key}`, layout: { "icon-image": key, "icon-size": 0.82, "icon-allow-overlap": true } });
      }
      if (competitors.length) {
        map.addSource("competitors", { type: "geojson", data: fc(competitors) });
        map.addLayer({ id: "competitors", type: "symbol", source: "competitors", layout: { "icon-image": "competitor", "icon-size": 0.9, "icon-allow-overlap": true } });
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
