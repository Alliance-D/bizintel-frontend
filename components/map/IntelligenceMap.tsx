"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { API_BASE_URL } from "@/lib/api";

const KIGALI: [number, number] = [30.0619, -1.9441];
const categories = ["salon", "pharmacy", "cafe", "grocery", "restaurant", "retail"];

export function IntelligenceMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [category, setCategory] = useState("salon");
  const [selected, setSelected] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: KIGALI,
      zoom: 11.6,
      pitch: 42,
      bearing: -12,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => addOpportunityLayer(map, category));
    map.on("click", (event) => {
      setSelected({ lng: event.lngLat.lng, lat: event.lngLat.lat });
      new maplibregl.Marker({ color: "#22c55e" }).setLngLat(event.lngLat).addTo(map);
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer("opportunity-fill")) map.removeLayer("opportunity-fill");
    if (map.getSource("opportunity")) map.removeSource("opportunity");
    addOpportunityLayer(map, category);
  }, [category]);

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-panel">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute left-4 top-4 z-10 w-[320px] rounded-3xl border border-white/10 bg-slate-950/85 p-4 shadow-panel backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Live map intelligence</div>
        <h2 className="mt-2 text-xl font-semibold">Opportunity Surface</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Switch categories, inspect opportunity density, and click a location to start a scout workflow.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {categories.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={`rounded-2xl px-3 py-2 text-sm capitalize transition ${category === item ? "bg-brand text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}>{item}</button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 z-10 w-[340px] rounded-3xl border border-white/10 bg-slate-950/85 p-4 shadow-panel backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Selection</div>
        {selected ? (
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div>Longitude: <span className="text-white">{selected.lng.toFixed(5)}</span></div>
            <div>Latitude: <span className="text-white">{selected.lat.toFixed(5)}</span></div>
            <button className="mt-3 w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-slate-950">Run Scout Assessment</button>
          </div>
        ) : <p className="mt-3 text-sm text-slate-300">Click anywhere on the map to inspect a location.</p>}
      </div>
    </div>
  );
}

function addOpportunityLayer(map: maplibregl.Map, category: string) {
  map.addSource("opportunity", {
    type: "vector",
    tiles: [`${API_BASE_URL}/api/v1/tiles/opportunity/{z}/{x}/{y}.mvt?category=${category}`],
    minzoom: 8,
    maxzoom: 15,
  });
  map.addLayer({
    id: "opportunity-fill",
    type: "circle",
    source: "opportunity",
    "source-layer": "opportunity",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 10],
      "circle-color": ["interpolate", ["linear"], ["coalesce", ["get", "opportunity_score"], 0], 20, "#ef4444", 45, "#f59e0b", 70, "#22c55e", 90, "#38bdf8"],
      "circle-opacity": 0.68,
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255,255,255,0.45)",
    },
  });
}
