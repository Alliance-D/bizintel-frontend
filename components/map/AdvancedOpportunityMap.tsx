"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { MapMouseEvent } from "maplibre-gl";
import { API_BASE_URL, getExperienceCellInsight, trackExperienceEvent } from "@/lib/api";
import { CategoryRibbon } from "@/components/experience/CategoryRibbon";
import { InsightDrawer } from "@/components/experience/InsightDrawer";
import { LayerControlPanel, type ExperienceLayer } from "@/components/experience/LayerControlPanel";

const KIGALI: [number, number] = [30.0619, -1.9441];

const layerProperty: Record<ExperienceLayer, string> = {
  opportunity: "opportunity_score",
  demand: "demand_score",
  access: "accessibility_score",
  commercial: "commercial_activity_score",
  competition: "competition_pressure",
  confidence: "confidence_score",
};

export function AdvancedOpportunityMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [category, setCategory] = useState("salon");
  const [activeLayer, setActiveLayer] = useState<ExperienceLayer>("opportunity");
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; score?: number; badge?: string } | null>(null);
  const [insight, setInsight] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const paint = useMemo(() => paintFor(activeLayer), [activeLayer]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: KIGALI,
      zoom: 11.4,
      pitch: 48,
      bearing: -10,
      antialias: true,
      style: {
        version: 8,
        sources: {
          osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" },
        },
        layers: [
          { id: "osm", type: "raster", source: "osm", paint: { "raster-opacity": 0.42, "raster-saturation": -0.7, "raster-brightness-min": 0.05 } },
        ],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.on("load", () => addSourceAndLayer(map, category, activeLayer));
    map.on("mousemove", "opportunity-cells", (event: any) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const prop = layerProperty[activeLayer];
      setHoverInfo({ x: event.point.x, y: event.point.y, score: Number(feature.properties?.[prop] || 0), badge: String(feature.properties?.opportunity_type || feature.properties?.experience_badge || "Opportunity cell") });
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "opportunity-cells", () => { setHoverInfo(null); map.getCanvas().style.cursor = ""; });
    map.on("click", async (event) => {
      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({ color: "#34d399" }).setLngLat(event.lngLat).addTo(map);
      setLoadingInsight(true);
      setInsight(null);
      trackExperienceEvent({ event_name: "map_cell_clicked", business_category: category, latitude: event.lngLat.lat, longitude: event.lngLat.lng, payload: { activeLayer } });
      const data = await getExperienceCellInsight({ latitude: event.lngLat.lat, longitude: event.lngLat.lng, business_category: category, radius_meters: 500 });
      setInsight(data);
      setLoadingInsight(false);
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    removeOpportunityLayer(map);
    addSourceAndLayer(map, category, activeLayer);
    setInsight(null);
  }, [category]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("opportunity-cells")) return;
    Object.entries(paint).forEach(([key, value]) => map.setPaintProperty("opportunity-cells", key, value as any));
  }, [paint]);

  function flyTo(lng: number, lat: number) {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, pitch: 55, duration: 1100 });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-panel">
        <div ref={containerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,.14),transparent_30%),linear-gradient(to_top,rgba(2,6,23,.55),transparent_35%)]" />
        <div className="absolute left-4 right-4 top-4 z-10 space-y-3 lg:left-5 lg:right-auto lg:w-[520px]">
          <CategoryRibbon value={category} onChange={setCategory} />
          <div className="hidden lg:block"><LayerControlPanel activeLayer={activeLayer} onChange={setActiveLayer}/></div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 z-10 lg:left-5 lg:right-auto lg:w-[520px]">
          <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Active intelligence layer</div>
                <div className="mt-1 text-xl font-semibold capitalize text-white">{activeLayer.replace("_", " ")}</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">ML vector tiles</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-emerald-400 to-sky-400" />
            <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.14em] text-slate-500"><span>weak</span><span>moderate</span><span>strong</span></div>
          </div>
        </div>
        {hoverInfo && <div className="pointer-events-none absolute z-20 rounded-2xl border border-white/10 bg-slate-950/90 px-3 py-2 text-sm shadow-2xl backdrop-blur" style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}><div className="font-medium text-white">{hoverInfo.badge}</div><div className="text-slate-300">Score: {Math.round(hoverInfo.score || 0)}</div></div>}
      </div>
      <InsightDrawer insight={insight} loading={loadingInsight}/>
    </div>
  );
}

function addSourceAndLayer(map: maplibregl.Map, category: string, layer: ExperienceLayer) {
  if (!map.getSource("opportunity")) {
    map.addSource("opportunity", {
      type: "vector",
      tiles: [`${API_BASE_URL}/api/v1/tiles/opportunity/{z}/{x}/{y}.mvt?category=${category}`],
      minzoom: 8,
      maxzoom: 15,
    });
  }
  map.addLayer({
    id: "opportunity-cells",
    type: "circle",
    source: "opportunity",
    "source-layer": "opportunity",
    paint: paintFor(layer),
  });
}

function removeOpportunityLayer(map: maplibregl.Map) {
  if (map.getLayer("opportunity-cells")) map.removeLayer("opportunity-cells");
  if (map.getSource("opportunity")) map.removeSource("opportunity");
}

function paintFor(layer: ExperienceLayer): any {
  const property = layerProperty[layer];
  const invert = layer === "competition";
  const stops = invert
    ? [20, "#22c55e", 45, "#f59e0b", 70, "#ef4444", 90, "#be123c"]
    : [20, "#ef4444", 45, "#f59e0b", 70, "#22c55e", 90, "#38bdf8"];
  return {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 12, 6, 15, 12],
    "circle-color": ["interpolate", ["linear"], ["coalesce", ["get", property], 0], ...(stops as any)],
    "circle-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.48, 14, 0.76],
    "circle-stroke-width": 1,
    "circle-stroke-color": "rgba(255,255,255,0.38)",
  };
}
