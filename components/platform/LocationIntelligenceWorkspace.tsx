"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  AlertCircle,
  CheckCircle2,
  Crosshair,
  FileText,
  LocateFixed,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import {
  getBestBusinessForArea,
  getCompetitionAnalysis,
  getPlatformOpportunityGeoJson,
  type BusinessCategoryKey,
} from "@/lib/platform-api";
import { useLocale } from "@/lib/locale";
import type { TranslationKey } from "@/lib/translations";

type T = (key: TranslationKey) => string;

type GeoJsonGeometry = { type: string; coordinates: any };

// A single grid cell on the opportunity map. It carries only the model's own
// outputs - the gap percentile (0-100, higher = more underserved), the band
// label, the expected/observed counts and gap, and the viability probability.
type Zone = {
  id: string;
  geometry?: GeoJsonGeometry;
  area: string;
  district: string;
  sector?: string;
  village?: string;
  category: string;
  latitude: number;
  longitude: number;
  opportunity: number;
  type: string;
  expectedCount?: number | null;
  observedCount?: number | null;
  gap?: number | null;
  viability?: number | null;
  source?: string;
};

type HexFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Omit<Zone, "geometry"> & { layer_value: number; grid_id?: string };
};

type FeatureCollection = { type: "FeatureCollection"; features: HexFeature[] };

const KIGALI: [number, number] = [30.0619, -1.9441];
const KIGALI_BOUNDS: [[number, number], [number, number]] = [[29.82, -2.13], [30.27, -1.78]];
const KM_PER_DEGREE_LAT = 110.574;
const HEX_RADIUS_KM = 0.48;

const KIGALI_POLYGON: [number, number][] = [
  [29.86, -1.80], [30.02, -1.78], [30.18, -1.81], [30.25, -1.88],
  [30.24, -2.03], [30.18, -2.09], [30.05, -2.12], [29.91, -2.08],
  [29.83, -2.00], [29.82, -1.90], [29.86, -1.80],
];

const KIGALI_COVERAGE = {
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: { name: "Kigali working area" }, geometry: { type: "Polygon", coordinates: [KIGALI_POLYGON] } }],
} as const;

const DISTRICT_GUIDES = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "Nyarugenge" }, geometry: { type: "Polygon", coordinates: [[[29.86, -1.90], [30.06, -1.86], [30.08, -1.98], [29.94, -2.08], [29.84, -2.02], [29.86, -1.90]]] } },
    { type: "Feature", properties: { name: "Gasabo" }, geometry: { type: "Polygon", coordinates: [[[30.02, -1.80], [30.25, -1.86], [30.22, -2.00], [30.08, -1.98], [30.06, -1.86], [30.02, -1.80]]] } },
    { type: "Feature", properties: { name: "Kicukiro" }, geometry: { type: "Polygon", coordinates: [[[30.04, -1.98], [30.22, -2.00], [30.20, -2.10], [30.05, -2.12], [29.94, -2.08], [30.04, -1.98]]] } },
  ],
} as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

// `opportunity` is the gap percentile within category (0-100, higher = more
// underserved). These bands match gap_percentile_classification() in
// scripts/train_and_score_opportunity_model.py exactly, so a cell's colour,
// badge and label are never inconsistent with the backend's own classification.
function scoreLabel(value: number, t: T) {
  if (value >= 80) return t("score_underserved");
  if (value >= 55) return t("score_room_to_grow");
  if (value >= 25) return t("score_balanced");
  return t("score_saturated");
}

function scoreClass(value: number) {
  if (value >= 80) return "score-underserved";
  if (value >= 55) return "score-medium";
  if (value >= 25) return "score-balanced";
  return "score-saturated";
}

// Fallback only - the backend's own opportunity_type/zone_key is used whenever
// it is present.
function opportunityType(opportunity: number, t: T) {
  if (opportunity >= 80) return t("opp_type_underserved");
  if (opportunity >= 55) return t("opp_type_room_to_grow");
  if (opportunity >= 25) return t("opp_type_balanced");
  return t("opp_type_saturated");
}

function hexCoordinates(zone: Zone, radiusKm = HEX_RADIUS_KM): [number, number][] {
  const lat = zone.latitude;
  const lon = zone.longitude;
  const kmPerDegreeLon = 111.32 * Math.cos((lat * Math.PI) / 180);
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const dxKm = radiusKm * Math.cos(angle);
    const dyKm = radiusKm * Math.sin(angle);
    points.push([lon + dxKm / kmPerDegreeLon, lat + dyKm / KM_PER_DEGREE_LAT]);
  }
  points.push(points[0]);
  return points;
}

function toHexGeoJson(zones: Zone[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => {
      const { geometry, ...properties } = zone;
      return {
        type: "Feature",
        geometry: geometry || { type: "Polygon", coordinates: [hexCoordinates(zone)] },
        properties: { ...properties, id: zone.id, grid_id: zone.id, layer_value: zone.opportunity },
      };
    }),
  };
}

function zoneFromGeoJsonFeature(feature: any, category: string, t: T): Zone | null {
  const props = feature?.properties || {};
  const geometry = feature?.geometry as GeoJsonGeometry | undefined;
  const rawLat = props.latitude ?? props.lat;
  const rawLon = props.longitude ?? props.lon ?? props.lng;
  let latitude = Number(rawLat);
  let longitude = Number(rawLon);

  if ((!Number.isFinite(latitude) || !Number.isFinite(longitude)) && geometry?.coordinates) {
    const coords = geometry.type === "Polygon" ? geometry.coordinates?.[0] : geometry.type === "MultiPolygon" ? geometry.coordinates?.[0]?.[0] : undefined;
    if (Array.isArray(coords) && coords.length) {
      const totals = coords.reduce((acc: [number, number], point: [number, number]) => [acc[0] + Number(point[0] || 0), acc[1] + Number(point[1] || 0)], [0, 0]);
      longitude = totals[0] / coords.length;
      latitude = totals[1] / coords.length;
    }
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const opportunity = clamp(Number(props.opportunity_score ?? props.opportunity ?? props.layer_value ?? 0));
  const district = String(props.district || t("kigali_label"));
  const sector = props.sector ? String(props.sector) : undefined;
  const cell = props.cell ? String(props.cell) : undefined;
  const village = props.village ? String(props.village) : undefined;
  const area = props.location_label ? String(props.location_label) : ([sector, cell].filter(Boolean).join(" · ") || district || String(props.grid_id || t("opportunity_cell_fallback")));
  const gapDetails = props.explanation?.gap_details;
  return {
    id: String(props.grid_id || props.id || `${latitude},${longitude}`),
    geometry,
    area,
    district,
    sector,
    village,
    category: String(props.business_category || props.category || category),
    latitude,
    longitude,
    opportunity,
    // The backend already writes an honest gap-based classification
    // (Underserved/Room to grow/Balanced/Saturated) - only fall back to the
    // local heuristic if it's genuinely missing.
    type: String(props.opportunity_type || props.zone_key || opportunityType(opportunity, t)),
    expectedCount: gapDetails?.expected_count ?? null,
    observedCount: gapDetails?.observed_count ?? null,
    gap: gapDetails?.gap ?? null,
    viability: gapDetails?.viability ?? null,
    source: "backend-geojson",
  };
}

// The gap percentile is a diverging scale, not a low-to-high one: low values
// mean saturated (bad), high values mean underserved (an opportunity).
// Breakpoints match gap_percentile_classification() (25/55/80) so a cell's
// colour never disagrees with its label.
function cellColor(): any {
  return ["interpolate", ["linear"], ["get", "opportunity"],
    0, "#e11d48",
    25, "#fda4af",
    40, "#f8fafc",
    55, "#f8fafc",
    65, "#99f6e4",
    80, "#2dd4bf",
    100, "#0f766e"];
}

function OpportunityLegend({ t }: { t: T }) {
  const items = [
    { label: t("legend_saturated"), color: "#e11d48" },
    { label: t("legend_balanced"), color: "#cbd5e1" },
    { label: t("legend_room_to_grow"), color: "#2dd4bf" },
    { label: t("legend_underserved"), color: "#0f766e" },
  ];
  return <div className="map-legend"><strong>{t("lens_opportunity_label")} {t("legend_suffix")}</strong><div>{items.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div></div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state-card"><strong>{title}</strong><span>{text}</span></div>;
}

function propsToZone(props: any, t: T): Zone {
  return {
    id: String(props.id || props.grid_id),
    area: String(props.area || props.cell || props.sector || props.grid_id || t("opportunity_cell_fallback")),
    district: String(props.district || t("kigali_label")),
    sector: props.sector ? String(props.sector) : undefined,
    village: props.village ? String(props.village) : undefined,
    category: String(props.category || props.business_category || "pharmacy"),
    latitude: Number(props.latitude),
    longitude: Number(props.longitude),
    opportunity: clamp(Number(props.opportunity)),
    type: String(props.type || props.opportunity_type || t("opp_type_balanced")),
    expectedCount: props.expectedCount ?? null,
    observedCount: props.observedCount ?? null,
    gap: props.gap ?? null,
    viability: props.viability ?? null,
    source: String(props.source || "grid"),
  };
}

export function LocationIntelligenceWorkspace() {
  const { t, locale } = useLocale();
  const [category, setCategory] = useState<BusinessCategoryKey>("pharmacy");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "ready" | "failed">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [bestBusiness, setBestBusiness] = useState<any[]>([]);
  const [competitionDetails, setCompetitionDetails] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"loading" | "live" | "offline">("loading");

  const tRef = useRef(t);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => { tRef.current = t; }, [t]);

  const gridZones = useMemo(() => zones.filter((zone) => zone.category === category), [zones, category]);
  const selectedZone = selected;
  const topZones = useMemo(() => [...gridZones].sort((a, b) => b.opportunity - a.opportunity).slice(0, 9), [gridZones]);
  const mapData = useMemo(() => toHexGeoJson(gridZones), [gridZones]);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setDataSource("loading");
    try {
      const response = await getPlatformOpportunityGeoJson(category, "opportunity", 5000, locale);
      const backend = (response.features || []).map((feature: any) => zoneFromGeoJsonFeature(feature, category, t)).filter(Boolean) as Zone[];
      if (!backend.length) throw new Error("No location features returned");
      setZones(backend);
      setSelected(null);
      setDataSource("live");
      setNotice(t("layer_refreshed"));
      window.setTimeout(() => setNotice(null), 2600);
    } catch (error) {
      console.error("Could not load opportunity areas", error);
      setZones([]);
      setSelected(null);
      setDataSource("offline");
      setNotice(t("intelligence_temp_unavailable"));
      window.setTimeout(() => setNotice(null), 4600);
    } finally { setLoading(false); }
  }, [category, t, locale]);

  useEffect(() => { loadZones(); }, [loadZones]);

  useEffect(() => {
    if (!selectedZone) {
      setBestBusiness([]);
      setCompetitionDetails(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    Promise.allSettled([
      getBestBusinessForArea(selectedZone.latitude, selectedZone.longitude),
      getCompetitionAnalysis(selectedZone.latitude, selectedZone.longitude, selectedZone.category || category),
    ]).then(([best, competition]) => {
      if (cancelled) return;
      if (best.status === "fulfilled") setBestBusiness(best.value?.ranked_categories || []);
      else setBestBusiness([]);
      if (competition.status === "fulfilled") setCompetitionDetails(competition.value || null);
      else setCompetitionDetails(null);
    }).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedZone?.id, selectedZone?.latitude, selectedZone?.longitude, selectedZone?.category, category]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let mounted = true;
    const map = new maplibregl.Map({
      container: mapEl.current,
      center: KIGALI,
      zoom: 11.55,
      minZoom: 10.3,
      maxZoom: 16.2,
      maxBounds: KIGALI_BOUNDS,
      pitch: 0,
      attributionControl: false,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm-base", type: "raster", source: "osm", paint: { "raster-opacity": 0.86, "raster-saturation": -0.32, "raster-brightness-min": 0.06, "raster-brightness-max": 1.0 } }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.on("load", () => {
      if (!mounted) return;
      map.addSource("kigali-coverage", { type: "geojson", data: KIGALI_COVERAGE as any });
      map.addLayer({ id: "kigali-coverage-line", type: "line", source: "kigali-coverage", paint: { "line-color": "#0f766e", "line-width": 1.4, "line-opacity": 0.34 } });
      map.addSource("district-guides", { type: "geojson", data: DISTRICT_GUIDES as any });
      map.addLayer({ id: "district-guide-line", type: "line", source: "district-guides", paint: { "line-color": "#334155", "line-width": 1, "line-dasharray": [2, 2], "line-opacity": 0.24 } });
      map.addLayer({ id: "district-guide-label", type: "symbol", source: "district-guides", layout: { "text-field": ["get", "name"], "text-size": 13, "text-font": ["Open Sans Bold"] }, paint: { "text-color": "#334155", "text-halo-color": "#ffffff", "text-halo-width": 1.4, "text-opacity": 0.45 } });
      map.addSource("opportunity-cells", { type: "geojson", data: mapData as any });
      map.addLayer({ id: "opportunity-cells-fill", type: "fill", source: "opportunity-cells", paint: { "fill-color": cellColor(), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.36, 13.4, 0.20, 15.5, 0.07] } });
      map.addLayer({ id: "opportunity-cells-line", type: "line", source: "opportunity-cells", paint: { "line-color": ["case", [">", ["get", "layer_value"], 78], "#0f766e", "#ffffff"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.55, 13, 1.2, 15, 1.8], "line-opacity": 0.56 } });
      map.addLayer({ id: "opportunity-cells-selected", type: "line", source: "opportunity-cells", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#10231f", "line-width": 3.2, "line-opacity": 1 } });
      setMapState("ready");
      window.setTimeout(() => map.resize(), 100);
    });
    map.on("error", (event) => { console.warn("Map warning", event?.error || event); });
    map.on("mouseenter", "opportunity-cells-fill", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "opportunity-cells-fill", () => { map.getCanvas().style.cursor = ""; });
    map.on("click", "opportunity-cells-fill", (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const zone = propsToZone(feature.properties as any, tRef.current);
      setSelected(zone);
      if (map.getLayer("opportunity-cells-selected")) {
        map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], zone.id]);
      }
      map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 15.15, duration: 720 });
    });
    map.on("dblclick", "opportunity-cells-fill", (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const zone = propsToZone(feature.properties as any, tRef.current);
      map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 14.8, duration: 720 });
    });
    mapRef.current = map;
    return () => { mounted = false; popupRef.current?.remove(); mapRef.current = null; map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;
    const source = map.getSource("opportunity-cells") as maplibregl.GeoJSONSource | undefined;
    source?.setData(mapData as any);
    if (map.getLayer("opportunity-cells-selected")) map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], selectedZone?.id || ""]);
  }, [mapData, mapState, selectedZone?.id]);

  function focusZone(zone: Zone) {
    setSelected(zone);
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("opportunity-cells-selected")) map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], zone.id]);
    map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 15.15, duration: 720 });
  }

  function searchArea() {
    const term = query.trim().toLowerCase();
    if (!term) return;
    const match = gridZones.find((zone) => [zone.area, zone.district, zone.sector, zone.type].filter(Boolean).join(" ").toLowerCase().includes(term));
    if (match) {
      focusZone(match);
      setNotice(t("showing_area").replace("{area}", match.area));
    } else {
      setNotice(t("no_matching_area"));
    }
    window.setTimeout(() => setNotice(null), 3200);
  }

  function closeInsightPanel() {
    setSelected(null);
    setNotice(null);
    const map = mapRef.current;
    if (map?.getLayer("opportunity-cells-selected")) {
      map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], ""]);
    }
  }

  function reportParams() {
    if (!selectedZone) return "";
    return new URLSearchParams({
      label: `${selectedZone.area} for ${categoryLabel(category)}`,
      category,
      lat: String(selectedZone.latitude),
      lon: String(selectedZone.longitude),
    }).toString();
  }

  const sourceLabel = dataSource === "live"
    ? t("kigali_opportunity_map")
    : dataSource === "loading"
      ? t("loading_intelligence")
      : t("intelligence_unavailable");

  return (
    <main className="workspace-root">
      <section className="workspace-toolbar" aria-label="Location intelligence controls">
        <div className="workspace-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchArea(); }} placeholder={t("search_placeholder")} /></div>
        <select value={category} onChange={(event) => setCategory(event.target.value as BusinessCategoryKey)} className="workspace-select" aria-label="Business category">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <button onClick={() => mapRef.current?.fitBounds(KIGALI_BOUNDS, { padding: { top: 40, bottom: 40, left: 330, right: 390 }, duration: 700 })} className="workspace-icon-button" aria-label={t("recenter_map")}><LocateFixed size={18} /></button>
        <button onClick={loadZones} className="workspace-icon-button" aria-label={t("refresh_layer")}><RefreshCw size={18} /></button>
      </section>

      <section className="workspace-grid">
        <div className="workspace-map-shell">
          <div ref={mapEl} className="workspace-map" />
          {mapState === "failed" && <div className="map-fallback"><AlertCircle size={22} /><strong>{t("map_tiles_failed")}</strong><span>{t("map_tiles_failed_text")}</span></div>}
          {(loading || mapState === "loading") && <div className="map-loading">{t("preparing_map")}</div>}
          <OpportunityLegend t={t} />
          <div className={`map-coverage-badge ${dataSource === "live" ? "is-live" : dataSource === "offline" ? "is-offline" : ""}`}><span className="status-dot" /> {sourceLabel}</div>
        </div>

        <aside className="workspace-left-panel">
          <div className="workspace-panel-card mode-card">
            <div className="kicker">{t("opportunity_map_kicker")}</div>
            <h1>{t("wm_opportunity_title")}</h1>
            <p>{t("wm_opportunity_lead")}</p>
            <div className="coverage-summary"><ShieldCheck size={16} /> {t("wm_opportunity_helper")}</div>
            <div className={`data-source-card ${dataSource === "live" ? "live" : dataSource === "offline" ? "offline" : ""}`}>
              <strong>{dataSource === "live" ? t("intelligence_ready") : dataSource === "offline" ? t("intelligence_unavailable") : t("loading_intelligence")}</strong>
              <span>{dataSource === "live" ? t("explore_map_hint") : t("try_again_shortly")}</span>
            </div>
          </div>

          <div className="workspace-panel-card priority-list"><div className="panel-title"><Sparkles size={17} /> {t("highlighted_areas")}</div>{topZones.length ? <div className="zone-list">{topZones.map((zone, index) => <button key={zone.id} onClick={() => focusZone(zone)} className={selectedZone?.id === zone.id ? "zone-row active" : "zone-row"}><span className="zone-rank">{index + 1}</span><span className="zone-name"><strong>{zone.area}</strong><small>{zone.type}</small></span><span className="zone-score">{Math.round(zone.opportunity)}</span></button>)}</div> : <EmptyState title={t("location_layer_unavailable")} text={t("location_layer_unavailable_text")} />}</div>
        </aside>

        <aside className={selectedZone ? "workspace-right-panel" : "workspace-right-panel panel-hidden"}>
          {selectedZone ? (
            <div className="insight-panel-card">
              <button type="button" onClick={closeInsightPanel} className="insight-close" aria-label="Close insight panel">
                <X size={18} />
              </button>
              <div className="selected-header">
                <div>
                  <div className="kicker">{t("selected_area")}</div>
                  <h2>{selectedZone.area}</h2>
                  <p>{selectedZone.district}{selectedZone.sector ? ` · ${selectedZone.sector}` : ""} · {categoryLabel(category)}</p>
                </div>
                <div className={`score-badge ${scoreClass(selectedZone.opportunity)}`}>
                  <strong>{Math.round(selectedZone.opportunity)}</strong>
                  <span>{scoreLabel(selectedZone.opportunity, t)}</span>
                </div>
              </div>
              <p className="selected-summary">{selectedZone.type}. {t("selected_summary_suffix")}</p>
              {(selectedZone.expectedCount != null || selectedZone.observedCount != null) && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("report_expected_label")}</div>
                    <div className="mt-1 font-black text-slate-950">{selectedZone.expectedCount != null ? selectedZone.expectedCount.toFixed(1) : "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("report_observed_label")}</div>
                    <div className="mt-1 font-black text-slate-950">{selectedZone.observedCount != null ? selectedZone.observedCount.toFixed(0) : "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("report_gap_label")}</div>
                    <div className="mt-1 font-black text-slate-950">{selectedZone.gap != null ? (selectedZone.gap > 0 ? `+${selectedZone.gap.toFixed(1)}` : selectedZone.gap.toFixed(1)) : "-"}</div>
                  </div>
                </div>
              )}
              {selectedZone.viability != null && (
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                  <span className="text-[var(--ink-soft)]">{t("report_signal_viability")}</span>
                  <b>{Math.round(selectedZone.viability * 100)}%</b>
                </div>
              )}
              {(detailLoading || competitionDetails?.competitors || bestBusiness.length > 0) && (
                <div className="real-context-stack">
                  {detailLoading && <div className="mini-loading">{t("loading_area_context")}</div>}
                  {competitionDetails?.competitors && (
                    <div className="real-context-card">
                      <div className="panel-title"><Radar size={17} /> {t("competition_context")}</div>
                      <div className="context-stat-grid">
                        <span><strong>{Number(competitionDetails.competitors.within_300m || 0)}</strong><small>{t("within_300m")}</small></span>
                        <span><strong>{Number(competitionDetails.competitors.within_500m || 0)}</strong><small>{t("within_500m")}</small></span>
                        <span><strong>{Number(competitionDetails.competitors.within_1000m || 0)}</strong><small>{t("within_1km")}</small></span>
                      </div>
                      {competitionDetails.competitors.nearest_competitor_m != null && <p>{t("nearest_competitor_text").replace("{distance}", String(Math.round(Number(competitionDetails.competitors.nearest_competitor_m))))}</p>}
                      {!!competitionDetails.nearby_complementary_and_demand_generators?.length && <p>{t("nearby_anchors_text")}: {competitionDetails.nearby_complementary_and_demand_generators.slice(0, 4).map((item: any) => `${categoryLabel(item.category_key)} (${item.count})`).join(", ")}</p>}
                    </div>
                  )}
                  {bestBusiness.length > 0 && (
                    <div className="real-context-card">
                      <div className="panel-title"><Sparkles size={17} /> {t("best_business_fit")}</div>
                      <div className="best-fit-list">
                        {bestBusiness.slice(0, 5).map((item: any, index: number) => (
                          <div key={item.business_category} className="best-fit-row">
                            <span>{index + 1}</span>
                            <strong>{categoryLabel(item.business_category)}</strong>
                            <em>{Math.round(Number(item.opportunity_score || 0))}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="next-move-card">
                <div className="panel-title"><Crosshair size={17} /> {t("recommended_next_move")}</div>
                <p>{t("wm_opportunity_next")}</p>
                <div className="next-actions">
                  <Link href={`/start?${reportParams()}`} className="btn-primary"><FileText size={16} /> {t("report")}</Link>
                </div>
              </div>
              {notice && <div className="notice-card"><CheckCircle2 size={16} /> {notice}</div>}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
