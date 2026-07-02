"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Crosshair,
  Layers3,
  LocateFixed,
  MapPin,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import {
  assessPlatformLocation,
  getPlatformOpportunityCells,
  saveLocation,
  type BusinessCategoryKey,
  type OpportunityCell,
  type PlatformAssessment,
} from "@/lib/platform-api";

type Mode = "opportunity" | "scout" | "competitive";
type LayerKey = "opportunity" | "demand" | "competition" | "access" | "commercial" | "confidence";

type FeatureProps = {
  id: string;
  area: string;
  district: string;
  category: string;
  opportunity: number;
  demand: number;
  access: number;
  commercial: number;
  competition: number;
  confidence: number;
  type: string;
  risk: string;
  source: "api" | "selected";
  lat: number;
  lng: number;
};

type OpportunityFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: FeatureProps;
};

type FeatureCollection = { type: "FeatureCollection"; features: OpportunityFeature[] };

type Props = {
  mode?: Mode;
  title?: string;
  subtitle?: string;
};

const KIGALI: [number, number] = [30.0619, -1.9441];

const layers: Array<{ key: LayerKey; label: string; help: string }> = [
  { key: "opportunity", label: "Opportunity", help: "Overall fit for the selected business" },
  { key: "demand", label: "Demand", help: "Population, households and purchasing-power signals" },
  { key: "competition", label: "Competition", help: "Category saturation and nearby supply" },
  { key: "access", label: "Access", help: "Roads, transport and movement convenience" },
  { key: "commercial", label: "Activity", help: "Markets, services and commercial anchors" },
  { key: "confidence", label: "Confidence", help: "How complete the available data looks" },
];

const modeCopy = {
  opportunity: {
    eyebrow: "Opportunity map",
    title: "Find business opportunity zones across Kigali",
    subtitle:
      "Select a business category, switch between demand, access and competition layers, then open areas worth investigating before making a rental decision.",
    primaryAction: "Save area",
    hint: "Start with the strongest zones, then verify rent, visibility and informal competition in the field.",
  },
  scout: {
    eyebrow: "Scout mode",
    title: "Check a candidate shop location",
    subtitle:
      "Click the map or select an opportunity cell to diagnose local demand, access, competition pressure and confidence for a specific business category.",
    primaryAction: "Save location",
    hint: "Use this before calling a landlord or paying a deposit. Compare at least two alternatives before committing.",
  },
  competitive: {
    eyebrow: "Competitive advantage",
    title: "Understand where your business can compete",
    subtitle:
      "Study saturated corridors, underserved pockets and positioning opportunities around a candidate business location.",
    primaryAction: "Track competition",
    hint: "High competition is not always bad. It becomes risky when differentiation, access or nearby demand are weak.",
  },
} satisfies Record<Mode, { eyebrow: string; title: string; subtitle: string; primaryAction: string; hint: string }>;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreTone(value: number) {
  if (value >= 78) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function scoreLabel(value: number) {
  if (value >= 78) return "Strong";
  if (value >= 60) return "Promising";
  return "Caution";
}

function metricHelp(key: LayerKey) {
  return layers.find((layer) => layer.key === key)?.help ?? "Location signal";
}

function paintFor(layer: LayerKey): Record<string, unknown> {
  const property = layer === "opportunity" ? "opportunity" : layer;
  const invert = layer === "competition";
  return {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 5, 12, 9, 15, 18],
    "circle-blur": 0.1,
    "circle-color": invert
      ? ["interpolate", ["linear"], ["get", property], 15, "#059669", 45, "#f59e0b", 75, "#e11d48", 95, "#881337"]
      : ["interpolate", ["linear"], ["get", property], 15, "#e11d48", 45, "#f59e0b", 68, "#0f766e", 90, "#2563eb"],
    "circle-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.55, 14, 0.88],
    "circle-stroke-width": 1.25,
    "circle-stroke-color": "rgba(255,255,255,0.92)",
  };
}

function normaliseCell(cell: OpportunityCell, category: string): OpportunityFeature {
  const id = String(cell.grid_id || cell.id || `${cell.latitude},${cell.longitude}`);
  const opportunity = clamp(Number(cell.opportunity_score || 0));
  const access = clamp(Number(cell.accessibility_score ?? cell.access_score ?? 0));
  const feature: OpportunityFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [Number(cell.longitude), Number(cell.latitude)] },
    properties: {
      id,
      area: cell.name || cell.area || cell.grid_id || "Opportunity zone",
      district: cell.district || "Kigali",
      category,
      opportunity,
      demand: clamp(Number(cell.demand_score || 0)),
      access,
      commercial: clamp(Number(cell.commercial_activity_score || 0)),
      competition: clamp(Number(cell.competition_pressure || 0)),
      confidence: clamp(Number(cell.confidence_score || 0)),
      type: cell.opportunity_type || cell.experience_badge || "Worth comparing",
      risk: String(cell.risk_level || "medium"),
      source: "api",
      lat: Number(cell.latitude),
      lng: Number(cell.longitude),
    },
  };
  return feature;
}

function cellsToGeoJson(cells: OpportunityCell[], category: string): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cells
      .filter((cell) => Number.isFinite(Number(cell.latitude)) && Number.isFinite(Number(cell.longitude)))
      .map((cell) => normaliseCell(cell, category)),
  };
}

function cellFromAssessment(assessment: PlatformAssessment): FeatureProps {
  return {
    id: "selected-location",
    area: "Selected location",
    district: "Kigali",
    category: assessment.business_category,
    opportunity: Number(assessment.overall?.opportunity_score || 0),
    demand: Number(assessment.factors?.demand_score || 0),
    access: Number(assessment.factors?.accessibility_score || 0),
    commercial: Number(assessment.factors?.commercial_activity_score || 0),
    competition: Number(assessment.factors?.competition_pressure || 0),
    confidence: Number(assessment.overall?.confidence_score || 0),
    type: assessment.overall?.opportunity_type || "Location assessment",
    risk: assessment.risk_notes?.length ? "medium" : "low",
    source: "selected",
    lat: assessment.latitude,
    lng: assessment.longitude,
  };
}

function Progress({ value, tone = "teal" }: { value: number; tone?: "teal" | "amber" | "rose" | "blue" }) {
  const color = tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-500" : tone === "blue" ? "bg-blue-600" : "bg-teal-700";
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${clamp(value, 5, 100)}%` }} />
    </div>
  );
}

export function OpportunityWorkspace({ mode = "opportunity", title, subtitle }: Props) {
  const copy = modeCopy[mode];
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [category, setCategory] = useState<BusinessCategoryKey>(mode === "competitive" ? "salon" : "salon");
  const [activeLayer, setActiveLayer] = useState<LayerKey>(mode === "competitive" ? "competition" : "opportunity");
  const [cells, setCells] = useState<OpportunityCell[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<FeatureProps | null>(null);
  const [assessment, setAssessment] = useState<PlatformAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("Kimironko");

  const featureCollection = useMemo(() => cellsToGeoJson(cells, category), [cells, category]);
  const topZones = useMemo(() => [...featureCollection.features].sort((a, b) => b.properties.opportunity - a.properties.opportunity).slice(0, 6), [featureCollection]);
  const activeSelection = selected ?? topZones[0]?.properties ?? null;

  const loadCells = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPlatformOpportunityCells(category, undefined, 160);
      setCells(response.cells || []);
      setSummary(response.summary);
      setSelected(null);
      setAssessment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load opportunity layer.");
      setCells([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadCells();
  }, [loadCells]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapEl.current,
      center: KIGALI,
      zoom: 11.15,
      pitch: 30,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
          opportunities: {
            type: "geojson",
            data: featureCollection as any,
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: { "raster-opacity": 0.74, "raster-saturation": -0.34, "raster-brightness-max": 0.98 },
          },
          {
            id: "opportunity-points",
            type: "circle",
            source: "opportunities",
            paint: paintFor(activeLayer),
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => setMapReady(true));

    map.on("mousemove", "opportunity-points", (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0] as any;
      const properties = feature?.properties as FeatureProps | undefined;
      if (!properties) return;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 14 })
        .setLngLat(event.lngLat)
        .setHTML(
          `<div style="padding:12px 14px;min-width:220px"><div style="font-weight:800;font-size:13px;color:#0f172a">${properties.area}</div><div style="margin-top:6px;color:#475569;font-size:12px">${properties.type}</div><div style="margin-top:10px;font-weight:800;color:#0f766e">${layers.find((l)=>l.key===activeLayer)?.label}: ${Math.round(Number((properties as any)[activeLayer] || properties.opportunity || 0))}</div></div>`,
        )
        .addTo(map);
    });

    map.on("mouseleave", "opportunity-points", () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });

    map.on("click", async (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["opportunity-points"] });
      if (features[0]) {
        const properties = features[0].properties as FeatureProps;
        setSelected(properties);
        setAssessment(null);
        return;
      }

      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({ color: "#10231f" }).setLngLat(event.lngLat).addTo(map);
      setWorking(true);
      try {
        const result = await assessPlatformLocation({ latitude: event.lngLat.lat, longitude: event.lngLat.lng, business_category: category, radius_meters: 500 });
        setAssessment(result);
        setSelected(cellFromAssessment(result));
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Location assessment failed.");
      } finally {
        setWorking(false);
      }
    });

    mapRef.current = map;
    return () => {
      popupRef.current?.remove();
      markerRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || typeof map.getSource !== "function") return;
    const source = map.getSource("opportunities") as maplibregl.GeoJSONSource | undefined;
    if (!source || typeof source.setData !== "function") return;
    source.setData(featureCollection as any);
  }, [featureCollection, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || typeof map.getLayer !== "function" || !map.getLayer("opportunity-points")) return;
    const paint = paintFor(activeLayer);
    Object.entries(paint).forEach(([property, value]) => map.setPaintProperty("opportunity-points", property, value as any));
  }, [activeLayer, mapReady]);

  function focusZone(feature: OpportunityFeature) {
    const [lng, lat] = feature.geometry.coordinates;
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14.1, pitch: 44, duration: 850 });
    setSelected(feature.properties);
    setAssessment(null);
  }

  async function saveCurrentLocation() {
    if (!activeSelection) return;
    setWorking(true);
    try {
      await saveLocation({
        label: `${activeSelection.area} — ${categoryLabel(category)}`,
        business_category: category,
        latitude: activeSelection.lat,
        longitude: activeSelection.lng,
        notes: `${activeSelection.type}. Opportunity ${Math.round(activeSelection.opportunity)} / Confidence ${Math.round(activeSelection.confidence)}.`,
      });
      setNotice("Saved to your shortlist.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save this location.");
    } finally {
      setWorking(false);
      window.setTimeout(() => setNotice(null), 2800);
    }
  }

  return (
    <main className="workspace-page">
      <section className="app-container pt-6 lg:pt-8">
        <Link href="/opportunity" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-slate-600 shadow-sm ring-1 ring-[#e6ded2] transition hover:text-slate-950">
          <ArrowLeft size={16} /> Back to opportunity map
        </Link>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <div className="kicker">{copy.eyebrow}</div>
            <h1 className="mt-3 max-w-5xl text-4xl font-bold leading-[0.98] text-slate-950 md:text-6xl">{title || copy.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{subtitle || copy.subtitle}</p>
          </div>

          <div className="subtle-card rounded-[1.5rem] p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Sparkles size={20} /></div>
              <div>
                <div className="text-sm font-extrabold text-slate-950">Business category</div>
                <div className="text-sm text-slate-500">The map updates for the selected category.</div>
              </div>
            </div>
            <select value={category} onChange={(event) => setCategory(event.target.value as BusinessCategoryKey)} className="input-modern mt-4 font-bold">
              {BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="app-container mt-6">
        <div className="soft-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="relative min-h-[70dvh] overflow-hidden bg-slate-100 md:min-h-[76dvh] xl:min-h-[780px]">
              <div ref={mapEl} className="absolute inset-0" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 sm:p-4">
                <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-3 rounded-[1.35rem] border border-white/70 bg-white/92 p-3 shadow-xl backdrop-blur md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-[#f6f4ef] px-3 py-2">
                    <Search size={18} className="text-slate-400" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none" placeholder="Search area, e.g. Kimironko" />
                  </div>
                  <button onClick={() => mapRef.current?.flyTo({ center: KIGALI, zoom: 11.4, duration: 700 })} className="btn-secondary justify-center px-4 py-2 text-sm"><LocateFixed size={16} /> Recenter</button>
                  <button onClick={loadCells} className="btn-secondary justify-center px-4 py-2 text-sm"><RefreshCw size={16} /> Refresh</button>
                  <Link href="/compare" className="btn-primary justify-center px-4 py-2 text-sm">Compare</Link>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden max-w-[430px] rounded-[1.5rem] border border-white/70 bg-white/92 p-4 shadow-xl backdrop-blur lg:block">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500"><Layers3 size={15} /> Map layer</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {layers.map((layer) => (
                    <button key={layer.key} onClick={() => setActiveLayer(layer.key)} className={`pointer-events-auto rounded-2xl border px-3 py-2 text-left text-sm font-extrabold transition ${activeLayer === layer.key ? "border-[#10231f] bg-[#10231f] text-white" : "border-[#e6ded2] bg-white text-slate-700 hover:border-teal-300"}`}>{layer.label}</button>
                  ))}
                </div>
              </div>

              {(loading || !mapReady) && (
                <div className="absolute inset-0 grid place-items-center bg-[#f6f4ef]/90">
                  <div className="rounded-3xl bg-white px-5 py-4 text-sm font-extrabold text-slate-700 shadow-xl">Loading market intelligence…</div>
                </div>
              )}

              {error && (
                <div className="absolute bottom-4 right-4 z-10 max-w-md rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-xl">
                  <div className="flex items-center gap-2 font-extrabold"><AlertCircle size={17} /> Connection issue</div>
                  <p className="mt-1 text-rose-600">{error}</p>
                </div>
              )}
            </div>

            <aside className="border-t border-[#e8dfd2] bg-[#fbfaf7] p-5 xl:border-l xl:border-t-0">
              {activeSelection ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Selected area</div>
                        <h2 className="mt-2 display-font text-3xl font-bold text-slate-950">{activeSelection.area}</h2>
                        <div className="mt-1 text-sm font-bold text-slate-500">{activeSelection.district} · {categoryLabel(category)}</div>
                      </div>
                      <div className={`rounded-2xl border px-3 py-2 text-center ${scoreTone(activeSelection.opportunity)}`}>
                        <div className="text-2xl font-extrabold">{Math.round(activeSelection.opportunity)}</div>
                        <div className="text-[10px] font-extrabold uppercase">{scoreLabel(activeSelection.opportunity)}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{activeSelection.type}. Review the signals, compare alternatives and validate the area before committing.</p>
                  </div>

                  <div className="grid gap-3">
                    {(["demand", "access", "commercial", "competition", "confidence"] as LayerKey[]).map((key) => {
                      const value = Number(activeSelection[key] ?? 0);
                      const isCompetition = key === "competition";
                      return (
                        <div key={key} className="rounded-2xl border border-[#eee5d8] bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-extrabold capitalize text-slate-950">{key === "commercial" ? "Activity" : key}</div>
                              <div className="mt-1 text-xs text-slate-500">{metricHelp(key)}</div>
                            </div>
                            <div className={`text-lg font-extrabold ${isCompetition && value > 70 ? "text-rose-600" : "text-teal-700"}`}>{Math.round(value)}</div>
                          </div>
                          <div className="mt-3"><Progress value={value} tone={isCompetition ? "amber" : "teal"} /></div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl bg-[#10231f] p-5 text-white">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-teal-200"><Radar size={17} /> Recommended next move</div>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{assessment?.recommendation || copy.hint}</p>
                    {assessment?.risk_notes?.length ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        {assessment.risk_notes.slice(0, 3).map((risk) => <li key={risk}>• {risk}</li>)}
                      </ul>
                    ) : null}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <button disabled={working} onClick={saveCurrentLocation} className="btn-primary bg-white text-[#10231f] shadow-none hover:bg-teal-50 disabled:opacity-70"><Bookmark size={16} /> {copy.primaryAction}</button>
                      <Link href="/reports" className="btn-secondary bg-white/10 text-white hover:bg-white/15">Create report</Link>
                    </div>
                  </div>

                  {notice && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-extrabold text-emerald-800">{notice}</div>}
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-5 text-sm text-slate-600">Select an opportunity point or click the map to inspect a location.</div>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section className="app-container mt-6 grid gap-5 pb-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="soft-card rounded-[2rem] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="kicker">Priority areas</div>
              <h2 className="mt-2 display-font text-3xl font-bold text-slate-950">Where to look first</h2>
              {summary && <p className="mt-2 text-sm text-slate-600">Average opportunity {Math.round(summary.average_opportunity || 0)} across {summary.total_cells || cells.length} analysed areas.</p>}
            </div>
            <Link href="/watchlist" className="btn-secondary px-4 py-2 text-sm">Create a watchlist</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {topZones.map((zone, index) => (
              <button key={zone.properties.id} onClick={() => focusZone(zone)} className="rounded-2xl border border-[#eee5d8] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-teal-50 text-sm font-extrabold text-teal-800">{index + 1}</span>
                  <span className="rounded-full bg-[#10231f] px-2.5 py-1 text-xs font-extrabold text-white">{Math.round(zone.properties.opportunity)}</span>
                </div>
                <div className="mt-4 font-extrabold text-slate-950">{zone.properties.area}</div>
                <div className="mt-2 text-sm leading-5 text-slate-600">{zone.properties.type}</div>
              </button>
            ))}
          </div>
        </div>

        <aside className="subtle-card rounded-[2rem] p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Crosshair size={20} /></div>
            <div>
              <div className="font-extrabold text-slate-950">Recommended workflow</div>
              <div className="text-sm text-slate-500">A practical flow for entrepreneurs.</div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              "Choose the business category you are considering.",
              "Switch layers to understand demand, access and competition.",
              "Open the strongest areas and shortlist two or three candidates.",
              "Validate rent, visibility and informal competitors before committing.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" /> {item}</div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
