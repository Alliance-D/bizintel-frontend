"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Crosshair,
  FileText,
  GitCompare,
  LocateFixed,
  MapPin,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import {
  assessPlatformLocation,
  getBestBusinessForArea,
  getCompetitionAnalysis,
  getPlatformOpportunityGeoJson,
  saveLocation,
  type BusinessCategoryKey,
  type PlatformAssessment,
} from "@/lib/platform-api";
import { useLocale } from "@/lib/locale";
import type { TranslationKey } from "@/lib/translations";

type T = (key: TranslationKey) => string;

type Mode = "opportunity" | "scout" | "competitive";
type LayerKey = "opportunity" | "demand" | "competition" | "access" | "commercial" | "confidence";
type GeoJsonGeometry = { type: string; coordinates: any };
type RiskLevel = "low" | "medium" | "high" | string;

type Zone = {
  id: string;
  geometry?: GeoJsonGeometry;
  area: string;
  district: string;
  sector?: string;
  category: string;
  latitude: number;
  longitude: number;
  opportunity: number;
  demand: number;
  access: number;
  commercial: number;
  competition: number;
  confidence: number;
  type: string;
  risk: RiskLevel;
  population?: number;
  householdSignal?: number;
  spendingSignal?: number;
  roadSignal?: number;
  transitSignal?: number;
  anchorSignal?: number;
  directSupply?: number;
  underservedSignal?: number;
  source?: string;
};

type HexFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Omit<Zone, "geometry"> & { layer_value: number; layer: LayerKey; grid_id?: string };
};

type FeatureCollection = { type: "FeatureCollection"; features: HexFeature[] };
type Props = { initialMode?: Mode };

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

function getModes(t: T): Array<{ key: Mode; label: string; icon: any }> {
  return [
    { key: "opportunity", label: t("mode_opportunity"), icon: Sparkles },
    { key: "scout", label: t("mode_scout"), icon: MapPin },
    { key: "competitive", label: t("mode_competitive"), icon: Radar },
  ];
}

function getLensByMode(t: T): Record<Exclude<Mode, "scout">, Array<{ key: LayerKey; label: string; help: string }>> {
  return {
    opportunity: [
      { key: "opportunity", label: t("lens_opportunity_label"), help: t("lens_opportunity_help") },
      { key: "demand", label: t("lens_demand_label"), help: t("lens_demand_help") },
      { key: "access", label: t("lens_access_label"), help: t("lens_access_help") },
      { key: "commercial", label: t("lens_commercial_label"), help: t("lens_commercial_help") },
      { key: "confidence", label: t("lens_confidence_label"), help: t("lens_confidence_help") },
    ],
    competitive: [
      { key: "competition", label: t("lens_competition_label"), help: t("lens_competition_help") },
      { key: "opportunity", label: t("lens_opportunity_label"), help: t("lens_opportunity_competitive_help") },
      { key: "demand", label: t("lens_demand_label"), help: t("lens_demand_competitive_help") },
      { key: "confidence", label: t("lens_confidence_label"), help: t("lens_confidence_competitive_help") },
    ],
  };
}

function getCopyByMode(t: T): Record<Mode, { title: string; lead: string; nextMove: string; primary: string; helper: string; callout: string }> {
  return {
    opportunity: {
      title: t("wm_opportunity_title"),
      lead: t("wm_opportunity_lead"),
      nextMove: t("wm_opportunity_next"),
      primary: t("wm_opportunity_primary"),
      helper: t("wm_opportunity_helper"),
      callout: t("wm_opportunity_callout"),
    },
    scout: {
      title: t("wm_scout_title"),
      lead: t("wm_scout_lead"),
      nextMove: t("wm_scout_next"),
      primary: t("wm_scout_primary"),
      helper: t("wm_scout_helper"),
      callout: t("wm_scout_callout"),
    },
    competitive: {
      title: t("wm_competitive_title"),
      lead: t("wm_competitive_lead"),
      nextMove: t("wm_competitive_next"),
      primary: t("wm_competitive_primary"),
      helper: t("wm_competitive_helper"),
      callout: t("wm_competitive_callout"),
    },
  };
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

function metricValue(zone: Zone, layer: LayerKey) {
  return layer === "opportunity" ? zone.opportunity : zone[layer];
}

function scoreLabel(value: number, t: T) {
  if (value >= 78) return t("score_strong");
  if (value >= 60) return t("score_promising");
  return t("score_needs_checks");
}

function scoreClass(value: number) {
  if (value >= 78) return "score-strong";
  if (value >= 60) return "score-medium";
  return "score-risk";
}

function opportunityType(opportunity: number, competition: number, demand: number, access: number, t: T) {
  if (demand > 78 && competition < 55) return t("opp_type_high_demand_lower_supply");
  if (competition > 78 && opportunity > 68) return t("opp_type_strong_demand_crowded");
  if (access > 78 && demand > 65) return t("opp_type_accessible_demand_pocket");
  if (opportunity < 52) return t("opp_type_needs_stronger_signals");
  return t("opp_type_worth_comparing");
}

function zoneFromAssessment(assessment: PlatformAssessment, t: T): Zone {
  return {
    id: "selected-location",
    area: t("selected_location_area"),
    district: t("kigali_label"),
    category: assessment.business_category,
    latitude: assessment.latitude,
    longitude: assessment.longitude,
    opportunity: clamp(Number(assessment.overall?.opportunity_score || 0)),
    demand: clamp(Number(assessment.factors?.demand_score || 0)),
    access: clamp(Number(assessment.factors?.accessibility_score || 0)),
    commercial: clamp(Number(assessment.factors?.commercial_activity_score || 0)),
    competition: clamp(Number(assessment.factors?.competition_pressure || 0)),
    confidence: clamp(Number(assessment.overall?.confidence_score || 0)),
    type: assessment.overall?.opportunity_type || t("location_screen"),
    risk: assessment.risk_notes?.length ? "medium" : "low",
    population: Math.round(1200 + clamp(Number(assessment.factors?.demand_score || 0)) * 95),
    directSupply: Math.max(0, Math.round(clamp(Number(assessment.factors?.competition_pressure || 0)) / 12)),
    source: "assessment",
  };
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

function toHexGeoJson(zones: Zone[], layer: LayerKey): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => {
      const { geometry, ...properties } = zone;
      return {
        type: "Feature",
        geometry: geometry || { type: "Polygon", coordinates: [hexCoordinates(zone)] },
        properties: { ...properties, id: zone.id, grid_id: zone.id, layer_value: metricValue(zone, layer), layer },
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
  const demand = clamp(Number(props.demand_score ?? props.demand ?? Math.max(0, opportunity - 6)));
  const access = clamp(Number(props.accessibility_score ?? props.access_score ?? props.access ?? Math.max(0, opportunity - 10)));
  const commercial = clamp(Number(props.commercial_activity_score ?? props.commercial ?? props.activity ?? Math.max(0, opportunity - 12)));
  const competition = clamp(Number(props.competition_pressure ?? props.competition ?? 52));
  const confidence = clamp(Number(props.confidence_score ?? props.confidence ?? 68));
  const district = String(props.district || t("kigali_label"));
  const sector = props.sector ? String(props.sector) : undefined;
  const cell = props.cell ? String(props.cell) : undefined;
  const area = [sector, cell].filter(Boolean).join(" · ") || district || String(props.grid_id || t("opportunity_cell_fallback"));
  return {
    id: String(props.grid_id || props.id || `${latitude},${longitude}`),
    geometry,
    area,
    district,
    sector,
    category: String(props.business_category || props.category || category),
    latitude,
    longitude,
    opportunity,
    demand,
    access,
    commercial,
    competition,
    confidence,
    type: String(props.opportunity_type || props.zone_key || opportunityType(opportunity, competition, demand, access, t)),
    risk: String(props.risk_level || "medium"),
    population: Math.round(1200 + demand * 95),
    householdSignal: demand,
    spendingSignal: clamp(demand * 0.72 + commercial * 0.18),
    roadSignal: access,
    transitSignal: clamp(access * 0.86),
    anchorSignal: commercial,
    directSupply: Math.max(0, Math.round(competition / 12)),
    underservedSignal: clamp(demand - competition + 45),
    source: "backend-geojson",
  };
}

function cellColor(layer: LayerKey): any {
  if (layer === "competition") return ["interpolate", ["linear"], ["get", "competition"], 20, "#14b8a6", 45, "#a3e635", 65, "#f59e0b", 84, "#e11d48"];
  if (layer === "confidence") return ["interpolate", ["linear"], ["get", "confidence"], 25, "#cbd5e1", 55, "#99f6e4", 82, "#0f766e"];
  if (layer === "access") return ["interpolate", ["linear"], ["get", "access"], 25, "#ecfdf5", 55, "#5eead4", 82, "#0f766e"];
  if (layer === "commercial") return ["interpolate", ["linear"], ["get", "commercial"], 25, "#fef3c7", 55, "#f59e0b", 82, "#b45309"];
  if (layer === "demand") return ["interpolate", ["linear"], ["get", "demand"], 25, "#dcfce7", 55, "#22c55e", 82, "#047857"];
  return ["interpolate", ["linear"], ["get", "opportunity"], 25, "#e2e8f0", 52, "#ccfbf1", 68, "#2dd4bf", 82, "#0f766e"];
}

function layerLabel(layer: LayerKey, t: T) {
  return layer === "commercial" ? t("lens_commercial_label") : t(`lens_${layer}_label` as TranslationKey);
}

function lensInsight(zone: Zone, layer: LayerKey, t: T) {
  const value = Math.round(metricValue(zone, layer));
  if (layer === "demand") return { title: t("demand_lens_title"), body: `${t("lens_demand_help")}: ${Math.round(zone.population || 0).toLocaleString()} ${t("people_suffix")}, ${Math.round(zone.householdSignal || zone.demand)}/${Math.round(zone.spendingSignal || zone.demand)}`, value };
  if (layer === "competition") return { title: t("saturation_lens_title"), body: `${zone.directSupply ?? Math.round(zone.competition / 12)} ${t("nearby_businesses_suffix")} · ${zone.competition > 75 ? t("risk_high") : zone.competition > 55 ? t("risk_moderate") : t("risk_lower")}`, value };
  if (layer === "access") return { title: t("access_lens_title"), body: `${t("lens_access_help")}: ${Math.round(zone.roadSignal || zone.access)}/${Math.round(zone.transitSignal || zone.access)}`, value };
  if (layer === "commercial") return { title: t("activity_lens_title"), body: `${t("lens_commercial_help")}: ${zone.commercial > 75 ? t("level_strong") : zone.commercial > 55 ? t("level_moderate") : t("level_limited")}`, value };
  if (layer === "confidence") return { title: t("confidence_lens_title"), body: `${zone.confidence > 75 ? t("level_strong") : zone.confidence > 55 ? t("level_usable") : t("level_limited")}`, value };
  return { title: t("opportunity_lens_title"), body: `${zone.type} · ${t("lens_demand_label")} ${Math.round(zone.demand)} · ${t("lens_access_label")} ${Math.round(zone.access)} · ${t("lens_competition_label")} ${Math.round(zone.competition)} · ${t("lens_confidence_label")} ${Math.round(zone.confidence)}`, value };
}

function MetricRow({ label, value, help, danger }: { label: string; value: number; help: string; danger?: boolean }) {
  const safe = clamp(value);
  return (
    <div className="workspace-metric">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-black text-slate-950">{label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{help}</div></div>
        <div className={danger ? "font-black text-rose-600" : "font-black text-teal-700"}>{Math.round(safe)}</div>
      </div>
      <div className="mt-3 metric-track"><div className={danger ? "metric-fill danger" : "metric-fill"} style={{ width: `${safe}%` }} /></div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state-card"><strong>{title}</strong><span>{text}</span></div>;
}

function EmptyMapCallout({ mode, t }: { mode: Mode; t: T }) {
  return <div className="map-empty-callout"><Sparkles size={18} /><div><strong>{mode === "scout" ? t("place_candidate_pin") : t("select_opportunity_area")}</strong><span>{mode === "scout" ? t("click_exact_place") : t("review_score_action")}</span></div></div>;
}

function LayerLegend({ layer, t }: { layer: LayerKey; t: T }) {
  const items: Record<LayerKey, Array<{ label: string; color: string }>> = {
    opportunity: [{ label: t("legend_needs_checks"), color: "#ccfbf1" }, { label: t("legend_promising"), color: "#2dd4bf" }, { label: t("legend_strong"), color: "#0f766e" }],
    demand: [{ label: t("legend_lower_demand"), color: "#dcfce7" }, { label: t("legend_growing"), color: "#22c55e" }, { label: t("legend_high_demand"), color: "#047857" }],
    competition: [{ label: t("legend_low_supply"), color: "#14b8a6" }, { label: t("legend_balanced"), color: "#f59e0b" }, { label: t("legend_crowded"), color: "#e11d48" }],
    access: [{ label: t("legend_limited"), color: "#ecfdf5" }, { label: t("legend_good"), color: "#5eead4" }, { label: t("legend_strong"), color: "#0f766e" }],
    commercial: [{ label: t("legend_quiet"), color: "#fef3c7" }, { label: t("legend_active"), color: "#f59e0b" }, { label: t("legend_hub"), color: "#b45309" }],
    confidence: [{ label: t("legend_limited"), color: "#cbd5e1" }, { label: t("legend_usable"), color: "#99f6e4" }, { label: t("legend_strong"), color: "#0f766e" }],
  };
  return <div className="map-legend"><strong>{layerLabel(layer, t)} {t("legend_suffix")}</strong><div>{items[layer].map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div></div>;
}

function propsToZone(props: any, t: T): Zone {
  return {
    id: String(props.id || props.grid_id), area: String(props.area || props.cell || props.sector || props.grid_id || t("opportunity_cell_fallback")), district: String(props.district || t("kigali_label")), sector: props.sector ? String(props.sector) : undefined, category: String(props.category || props.business_category || "pharmacy"), latitude: Number(props.latitude), longitude: Number(props.longitude), opportunity: clamp(Number(props.opportunity)), demand: clamp(Number(props.demand)), access: clamp(Number(props.access)), commercial: clamp(Number(props.commercial)), competition: clamp(Number(props.competition)), confidence: clamp(Number(props.confidence)), type: String(props.type || props.opportunity_type || t("opp_type_worth_comparing")), risk: String(props.risk || props.risk_level || "medium"), population: Number(props.population || 0), householdSignal: Number(props.householdSignal || props.demand || 0), spendingSignal: Number(props.spendingSignal || props.demand || 0), roadSignal: Number(props.roadSignal || props.access || 0), transitSignal: Number(props.transitSignal || props.access || 0), anchorSignal: Number(props.anchorSignal || props.commercial || 0), directSupply: Number(props.directSupply || 0), underservedSignal: Number(props.underservedSignal || 0), source: String(props.source || "grid") };
}

export function LocationIntelligenceWorkspace({ initialMode = "opportunity" }: Props) {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [category, setCategory] = useState<BusinessCategoryKey>("pharmacy");
  const [activeLayer, setActiveLayer] = useState<LayerKey>(initialMode === "competitive" ? "competition" : "opportunity");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [assessment, setAssessment] = useState<PlatformAssessment | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "ready" | "failed">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [bestBusiness, setBestBusiness] = useState<any[]>([]);
  const [competitionDetails, setCompetitionDetails] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [dataSource, setDataSource] = useState<"loading" | "live" | "offline">("loading");

  const modeRef = useRef(mode);
  const categoryRef = useRef(category);
  const activeLayerRef = useRef(activeLayer);
  const tRef = useRef(t);
  const localeRef = useRef(locale);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => { modeRef.current = mode; categoryRef.current = category; activeLayerRef.current = activeLayer; tRef.current = t; localeRef.current = locale; }, [mode, category, activeLayer, t, locale]);

  const gridZones = useMemo(() => zones.filter((zone) => zone.category === category && zone.source !== "assessment"), [zones, category]);
  const selectedZone = selected;
  const mapZones = useMemo(() => (mode === "scout" ? [] : gridZones), [gridZones, mode]);
  const topZones = useMemo(() => [...gridZones].sort((a, b) => b.opportunity - a.opportunity).slice(0, 9), [gridZones]);
  const mapData = useMemo(() => toHexGeoJson(mapZones, activeLayer), [mapZones, activeLayer]);
  const copy = useMemo(() => getCopyByMode(t)[mode], [t, mode]);
  const activeLensOptions = useMemo(() => (mode === "competitive" ? getLensByMode(t).competitive : getLensByMode(t).opportunity), [t, mode]);
  const guideSteps = [
    { title: t("guide_step1_title"), body: t("guide_step1_body") },
    { title: t("guide_step2_title"), body: t("guide_step2_body") },
    { title: t("guide_step3_title"), body: t("guide_step3_body") },
    { title: t("guide_step4_title"), body: t("guide_step4_body") },
    { title: t("guide_step5_title"), body: t("guide_step5_body") },
  ];

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

  useEffect(() => { setMode(initialMode); setActiveLayer(initialMode === "competitive" ? "competition" : "opportunity"); }, [initialMode]);
  useEffect(() => { loadZones(); }, [loadZones]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem("bizintel_workspace_guide_done")) {
        const timer = window.setTimeout(() => setShowGuide(true), 700);
        return () => window.clearTimeout(timer);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }, []);

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
      map.addLayer({ id: "opportunity-cells-fill", type: "fill", source: "opportunity-cells", paint: { "fill-color": cellColor(activeLayerRef.current), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.36, 13.4, 0.20, 15.5, 0.07] } });
      map.addLayer({ id: "opportunity-cells-line", type: "line", source: "opportunity-cells", paint: { "line-color": ["case", [">", ["get", "layer_value"], 78], "#0f766e", "#ffffff"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.55, 13, 1.2, 15, 1.8], "line-opacity": 0.56 } });
      map.addLayer({ id: "opportunity-cells-selected", type: "line", source: "opportunity-cells", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#10231f", "line-width": 3.2, "line-opacity": 1 } });
      setMapState("ready");
      window.setTimeout(() => map.resize(), 100);
    });
    map.on("error", (event) => { console.warn("Map warning", event?.error || event); });
    map.on("mouseenter", "opportunity-cells-fill", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "opportunity-cells-fill", () => { map.getCanvas().style.cursor = ""; });
    map.on("click", "opportunity-cells-fill", (event) => {
      if (modeRef.current === "scout") return;
      const feature = event.features?.[0];
      if (!feature) return;
      const zone = propsToZone(feature.properties as any, tRef.current);
      setSelected(zone);
      setAssessment(null);
      if (map.getLayer("opportunity-cells-selected")) {
        map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], zone.id]);
      }
      map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 15.15, duration: 720 });
    });
    map.on("dblclick", "opportunity-cells-fill", (event) => {
      if (modeRef.current === "scout") return;
      const feature = event.features?.[0];
      if (!feature) return;
      const zone = propsToZone(feature.properties as any, tRef.current);
      map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 14.8, duration: 720 });
    });
    map.on("click", async (event) => {
      if (modeRef.current !== "scout") return;
      setWorking(true);
      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({ color: "#10231f" }).setLngLat(event.lngLat).addTo(map);
      map.flyTo({ center: event.lngLat, zoom: 14.3, duration: 650 });
      try {
        const result = await assessPlatformLocation({ latitude: event.lngLat.lat, longitude: event.lngLat.lng, business_category: categoryRef.current, locale: localeRef.current });
        const zone = zoneFromAssessment(result, tRef.current);
        setAssessment(result);
        setSelected(zone);
        setNotice(tRef.current("location_screen_created"));
      } catch (error) {
        console.error("Scout assessment failed", error);
        setAssessment(null);
        setSelected(null);
        setNotice(tRef.current("assessment_temp_unavailable"));
      } finally {
        setWorking(false);
        window.setTimeout(() => setNotice(null), 3200);
      }
    });
    mapRef.current = map;
    return () => { mounted = false; popupRef.current?.remove(); markerRef.current?.remove(); mapRef.current = null; map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;
    const source = map.getSource("opportunity-cells") as maplibregl.GeoJSONSource | undefined;
    source?.setData(mapData as any);
    if (map.getLayer("opportunity-cells-selected")) map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], selectedZone?.source === "assessment" ? "" : selectedZone?.id || ""]);
  }, [mapData, mapState, selectedZone?.id, selectedZone?.source]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready" || !map.getLayer("opportunity-cells-fill")) return;
    map.setPaintProperty("opportunity-cells-fill", "fill-color", cellColor(activeLayer) as any);
    const visible = mode === "scout" ? "none" : "visible";
    map.setLayoutProperty("opportunity-cells-fill", "visibility", visible);
    map.setLayoutProperty("opportunity-cells-line", "visibility", visible);
    map.setLayoutProperty("opportunity-cells-selected", "visibility", visible);
  }, [activeLayer, mode, mapState]);

  function switchMode(next: Mode) {
    setMode(next);
    popupRef.current?.remove();
    if (next === "opportunity") { setActiveLayer("opportunity"); markerRef.current?.remove(); setAssessment(null); setSelected(null); }
    if (next === "scout") { setActiveLayer("demand"); setAssessment(null); setSelected(null); }
    if (next === "competitive") { setActiveLayer("competition"); markerRef.current?.remove(); setAssessment(null); setSelected(null); }
  }

  function focusZone(zone: Zone) {
    setSelected(zone);
    setAssessment(null);
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

  function completeGuide() {
    try { window.localStorage.setItem("bizintel_workspace_guide_done", "1"); } catch {}
    setShowGuide(false);
    setGuideStep(0);
  }

  function closeInsightPanel() {
    setSelected(null);
    setAssessment(null);
    setNotice(null);
    const map = mapRef.current;
    if (map?.getLayer("opportunity-cells-selected")) {
      map.setFilter("opportunity-cells-selected", ["==", ["get", "id"], ""]);
    }
  }

  function selectedLocationParams() {
    if (!selectedZone) return "";
    const params = new URLSearchParams({
      label: `${selectedZone.area} for ${categoryLabel(category)}`,
      category,
      lat: String(selectedZone.latitude),
      lon: String(selectedZone.longitude),
    });
    return params.toString();
  }

  async function saveCurrent() {
    if (!selectedZone) return;
    setWorking(true);
    try {
      await saveLocation({ label: `${selectedZone.area} for ${categoryLabel(category)}`, business_category: category, latitude: selectedZone.latitude, longitude: selectedZone.longitude, notes: `${selectedZone.type}. Opportunity ${Math.round(selectedZone.opportunity)}, confidence ${Math.round(selectedZone.confidence)}` });
      setNotice(t("saved_to_shortlist"));
    } catch { setNotice(t("could_not_save")); }
    finally { setWorking(false); window.setTimeout(() => setNotice(null), 3200); }
  }

  const currentLens = activeLayer === "commercial" ? t("lens_commercial_label") : layerLabel(activeLayer, t);
  const selectedLensInsight = selectedZone ? lensInsight(selectedZone, activeLayer, t) : null;
  const sourceLabel = dataSource === "live"
    ? t("kigali_opportunity_map")
    : dataSource === "loading"
      ? t("loading_intelligence")
      : t("intelligence_unavailable");
  const modes = useMemo(() => getModes(t), [t]);

  return (
    <main className="workspace-root">
      <section className="workspace-toolbar" aria-label="Location intelligence controls">
        <div className="workspace-mode-tabs" role="tablist" aria-label="Workspace mode">
          {modes.map(({ key, label, icon: Icon }) => <button key={key} role="tab" aria-selected={mode === key} onClick={() => switchMode(key)} className={mode === key ? "mode-tab active" : "mode-tab"}><Icon size={16} /> <span>{label}</span></button>)}
        </div>
        <div className="workspace-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchArea(); }} placeholder={t("search_placeholder")} /></div>
        <select value={category} onChange={(event) => setCategory(event.target.value as BusinessCategoryKey)} className="workspace-select" aria-label="Business category">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        {mode !== "scout" && (
          <div className="workspace-layer-tabs" role="tablist" aria-label="Map lens">
            {activeLensOptions.map((layer) => <button key={layer.key} role="tab" aria-selected={activeLayer === layer.key} title={layer.help} onClick={() => setActiveLayer(layer.key)} className={activeLayer === layer.key ? "layer-tab active" : "layer-tab"}>{layer.label}</button>)}
          </div>
        )}
        <button onClick={() => mapRef.current?.fitBounds(KIGALI_BOUNDS, { padding: { top: 40, bottom: 40, left: 330, right: 390 }, duration: 700 })} className="workspace-icon-button" aria-label={t("recenter_map")}><LocateFixed size={18} /></button>
        <button onClick={loadZones} className="workspace-icon-button" aria-label={t("refresh_layer")}><RefreshCw size={18} /></button>
      </section>

      <section className="workspace-grid">
        <div className="workspace-map-shell">
          <div ref={mapEl} className="workspace-map" />
          {mapState === "failed" && <div className="map-fallback"><AlertCircle size={22} /><strong>{t("map_tiles_failed")}</strong><span>{t("map_tiles_failed_text")}</span></div>}
          {(loading || mapState === "loading") && <div className="map-loading">{t("preparing_map")}</div>}
          <EmptyMapCallout mode={mode} t={t} />
          {mode !== "scout" && <LayerLegend layer={activeLayer} t={t} />}
          <div className={`map-coverage-badge ${dataSource === "live" ? "is-live" : dataSource === "offline" ? "is-offline" : ""}`}><span className="status-dot" /> {sourceLabel}{mode !== "scout" ? ` · ${currentLens}` : ` · ${t("place_a_pin")}`}</div>
        </div>

        <aside className="workspace-left-panel">
          <div className="workspace-panel-card mode-card">
            <div className="kicker">{mode === "opportunity" ? t("opportunity_map_kicker") : mode === "scout" ? t("scout_mode_kicker") : t("competitive_view_kicker")}</div>
            <h1>{copy.title}</h1>
            <p>{copy.lead}</p>
            <div className="coverage-summary"><ShieldCheck size={16} /> {copy.helper}</div>
            <div className={`data-source-card ${dataSource === "live" ? "live" : dataSource === "offline" ? "offline" : ""}`}>
              <strong>{dataSource === "live" ? t("intelligence_ready") : dataSource === "offline" ? t("intelligence_unavailable") : t("loading_intelligence")}</strong>
              <span>{dataSource === "live" ? t("explore_map_hint") : t("try_again_shortly")}</span>
            </div>
            <button type="button" onClick={() => { setGuideStep(0); setShowGuide(true); }} className="guide-link">{t("show_quick_guide")}</button>
          </div>

          {mode === "scout" && <div className="workspace-panel-card compact scout-card"><div className="panel-title"><MapPin size={17} /> {t("scout_checklist")}</div><p>{t("scout_checklist_text")}</p><div className="mt-3 grid gap-2 text-sm font-bold text-slate-700"><span className="rounded-2xl bg-white p-3">{t("scout_step_click")}</span><span className="rounded-2xl bg-white p-3">{t("scout_step_read")}</span><span className="rounded-2xl bg-white p-3">{t("scout_step_save")}</span></div></div>}

          {mode !== "scout" && <div className="workspace-panel-card priority-list"><div className="panel-title"><Sparkles size={17} /> {t("highlighted_areas")}</div>{topZones.length ? <div className="zone-list">{topZones.map((zone, index) => <button key={zone.id} onClick={() => focusZone(zone)} className={selectedZone?.id === zone.id ? "zone-row active" : "zone-row"}><span className="zone-rank">{index + 1}</span><span className="zone-name"><strong>{zone.area}</strong><small>{zone.type}</small></span><span className="zone-score">{Math.round(zone.opportunity)}</span></button>)}</div> : <EmptyState title={t("location_layer_unavailable")} text={t("location_layer_unavailable_text")} />}</div>}
        </aside>

        <aside className={selectedZone ? "workspace-right-panel" : "workspace-right-panel panel-hidden"}>
          {selectedZone ? (
            <div className="insight-panel-card">
              <button type="button" onClick={closeInsightPanel} className="insight-close" aria-label="Close insight panel">
                <X size={18} />
              </button>
              <div className="selected-header">
                <div>
                  <div className="kicker">{mode === "scout" ? t("selected_place") : t("selected_area")}</div>
                  <h2>{selectedZone.area}</h2>
                  <p>{selectedZone.district}{selectedZone.sector ? ` · ${selectedZone.sector}` : ""} · {categoryLabel(category)}</p>
                </div>
                <div className={`score-badge ${scoreClass(selectedZone.opportunity)}`}>
                  <strong>{Math.round(selectedZone.opportunity)}</strong>
                  <span>{scoreLabel(selectedZone.opportunity, t)}</span>
                </div>
              </div>
              <p className="selected-summary">{selectedZone.type}. {t("selected_summary_suffix")}</p>
              {selectedLensInsight && (
                <div className="lens-detail-card">
                  <div className="kicker">{selectedLensInsight.title}</div>
                  <strong>{selectedLensInsight.value}</strong>
                  <p>{selectedLensInsight.body}</p>
                </div>
              )}
              <div className="metric-stack">
                <MetricRow label={t("demand_label")} value={selectedZone.demand} help={t("metric_demand_help")} />
                <MetricRow label={t("access_label")} value={selectedZone.access} help={t("metric_access_help")} />
                <MetricRow label={t("activity_label")} value={selectedZone.commercial} help={t("metric_activity_help")} />
                <MetricRow label={t("competition_label")} value={selectedZone.competition} help={t("metric_competition_help")} danger />
                <MetricRow label={t("confidence_label")} value={selectedZone.confidence} help={t("metric_confidence_help")} />
              </div>
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
                <p>{assessment?.recommendation || copy.nextMove}</p>
                <div className="next-actions">
                  <button disabled={working} onClick={saveCurrent} className="btn-primary"><Bookmark size={16} /> {working ? t("saving") : copy.primary}</button>
                  <Link href={`/advisor?${selectedLocationParams()}`} className="btn-secondary"><Sparkles size={16} /> {t("ask_advisor")}</Link>
                  <Link href={`/compare?${selectedLocationParams()}`} className="btn-secondary"><GitCompare size={16} /> {t("compare_action")}</Link>
                  <Link href={`/reports?${selectedLocationParams()}`} className="btn-secondary"><FileText size={16} /> {t("report")}</Link>
                </div>
              </div>
              {notice && <div className="notice-card"><CheckCircle2 size={16} /> {notice}</div>}
            </div>
          ) : null}
        </aside>
      </section>

      {showGuide && (
        <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="BizIntel quick guide">
          <div className="tour-card">
            <button type="button" className="tour-close" onClick={completeGuide} aria-label="Close guide"><X size={18} /></button>
            <div className="kicker">{t("first_time_guide")}</div>
            <h2>{guideSteps[guideStep].title}</h2>
            <p>{guideSteps[guideStep].body}</p>
            <div className="tour-progress" aria-label={`Step ${guideStep + 1} of ${guideSteps.length}`}>
              {guideSteps.map((_, index) => <span key={index} className={index <= guideStep ? "active" : ""} />)}
            </div>
            <div className="tour-actions">
              <button type="button" className="btn-secondary" onClick={() => setGuideStep(Math.max(0, guideStep - 1))} disabled={guideStep === 0}>{t("guide_back")}</button>
              {guideStep < guideSteps.length - 1 ? (
                <button type="button" className="btn-primary" onClick={() => setGuideStep(guideStep + 1)}>{t("guide_next")}</button>
              ) : (
                <button type="button" className="btn-primary" onClick={completeGuide}>{t("guide_done")}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
