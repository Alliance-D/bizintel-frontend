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
  Layers3,
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
  getMLOpportunityStatus,
  saveLocation,
  type BusinessCategoryKey,
  type OpportunityCell,
  type PlatformAssessment,
} from "@/lib/platform-api";

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

const modes: Array<{ key: Mode; label: string; icon: any }> = [
  { key: "opportunity", label: "Opportunity", icon: Sparkles },
  { key: "scout", label: "Scout", icon: MapPin },
  { key: "competitive", label: "Competitive", icon: Radar },
];

const lensByMode: Record<Exclude<Mode, "scout">, Array<{ key: LayerKey; label: string; help: string }>> = {
  opportunity: [
    { key: "opportunity", label: "Opportunity", help: "Overall fit from demand, access, activity, supply and reliability" },
    { key: "demand", label: "Demand", help: "Population, household and spending pull" },
    { key: "access", label: "Access", help: "Road, transport and movement convenience" },
    { key: "commercial", label: "Activity", help: "Markets, services and nearby commercial anchors" },
    { key: "confidence", label: "Confidence", help: "How reliable the available signals look" },
  ],
  competitive: [
    { key: "competition", label: "Saturation", help: "Direct supply pressure for the selected business type" },
    { key: "opportunity", label: "Opportunity", help: "Cells that still look useful after supply pressure" },
    { key: "demand", label: "Demand", help: "Demand that can support more supply" },
    { key: "confidence", label: "Confidence", help: "How reliable the competition view looks" },
  ],
};

const copyByMode: Record<Mode, { title: string; lead: string; nextMove: string; primary: string; helper: string; callout: string }> = {
  opportunity: {
    title: "Find opportunity zones",
    lead: "Scan Kigali for areas where demand, access, activity and supply conditions look promising",
    nextMove: "Shortlist the strongest areas, compare at least two alternatives, then verify rent, visibility and informal competition in the field",
    primary: "Save area",
    helper: "Broad scan for where to look first",
    callout: "Select an opportunity area",
  },
  scout: {
    title: "Assess one candidate place",
    lead: "Click the exact shop, road edge or rental space you are considering and get a first location screen",
    nextMove: "Use this as a first screen, then confirm rent, visibility, foot traffic and informal competitors before committing",
    primary: "Save location",
    helper: "Exact place check after you already have a candidate",
    callout: "Click the map to place a pin",
  },
  competitive: {
    title: "Read competitive pressure",
    lead: "Use the saturation view to see where direct supply is crowded and where lower-supply pockets remain",
    nextMove: "High competition is only risky when demand, access or differentiation are weak",
    primary: "Track competition",
    helper: "Supply pressure view for competitive decisions",
    callout: "Select a saturation cell",
  },
};

const sectorNames = [
  "Kimironko", "Remera", "Kacyiru", "Gisozi", "Nyarugenge", "Muhima", "Nyamirambo", "Kiyovu", "Kicukiro", "Gikondo", "Kagarama", "Kanombe", "Gatenga",
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

function metricValue(zone: Zone, layer: LayerKey) {
  return layer === "opportunity" ? zone.opportunity : zone[layer];
}

function scoreLabel(value: number) {
  if (value >= 78) return "Strong";
  if (value >= 60) return "Promising";
  return "Needs checks";
}

function scoreClass(value: number) {
  if (value >= 78) return "score-strong";
  if (value >= 60) return "score-medium";
  return "score-risk";
}

function pseudoNoise(lat: number, lon: number, seed = 0) {
  const x = Math.sin(lat * 92.13 + lon * 41.77 + seed * 11.31) * 10000;
  return x - Math.floor(x);
}

function pointInPolygon(lon: number, lat: number, polygon: [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function districtFor(lat: number, lon: number) {
  if (lon < 30.065 && lat < -1.925) return { district: "Nyarugenge", sector: lat < -1.975 ? "Nyamirambo" : lon < 29.98 ? "Kimisagara" : "Nyarugenge" };
  if (lat > -1.955 || lon > 30.105) return { district: "Gasabo", sector: lon > 30.12 ? "Kimironko" : lat > -1.93 ? "Kacyiru" : "Remera" };
  return { district: "Kicukiro", sector: lon > 30.13 ? "Kanombe" : lon > 30.09 ? "Kicukiro" : "Gikondo" };
}

function categoryBias(category: string) {
  const weights: Record<string, { demand: number; access: number; commercial: number; competition: number }> = {
    salon: { demand: 9, access: 4, commercial: 6, competition: 4 },
    barbershop: { demand: 7, access: 5, commercial: 5, competition: 4 },
    beauty_salon: { demand: 8, access: 4, commercial: 7, competition: 5 },
    pharmacy: { demand: 6, access: 9, commercial: 4, competition: 3 },
    cafe: { demand: 5, access: 6, commercial: 10, competition: 5 },
    restaurant: { demand: 5, access: 7, commercial: 9, competition: 5 },
    grocery: { demand: 10, access: 5, commercial: 4, competition: 2 },
    retail: { demand: 6, access: 7, commercial: 7, competition: 4 },
    mobile_money: { demand: 7, access: 8, commercial: 6, competition: 2 },
  };
  return weights[category] || weights.salon;
}

function opportunityType(opportunity: number, competition: number, demand: number, access: number) {
  if (demand > 78 && competition < 55) return "High demand with lower direct supply";
  if (competition > 78 && opportunity > 68) return "Strong demand but crowded";
  if (access > 78 && demand > 65) return "Accessible demand pocket";
  if (opportunity < 52) return "Needs stronger supporting signals";
  return "Worth comparing with nearby areas";
}

function createGridZones(category: string): Zone[] {
  const zones: Zone[] = [];
  const latStart = KIGALI_BOUNDS[0][1];
  const latEnd = KIGALI_BOUNDS[1][1];
  const lonStart = KIGALI_BOUNDS[0][0];
  const lonEnd = KIGALI_BOUNDS[1][0];
  const latStep = (HEX_RADIUS_KM * 1.5) / KM_PER_DEGREE_LAT;
  const bias = categoryBias(category);
  let index = 0;

  for (let row = 0, lat = latStart; lat <= latEnd; row += 1, lat += latStep) {
    const lonStep = (Math.sqrt(3) * HEX_RADIUS_KM) / (111.32 * Math.cos((lat * Math.PI) / 180));
    const offset = row % 2 ? lonStep / 2 : 0;
    for (let lon = lonStart + offset; lon <= lonEnd; lon += lonStep) {
      if (!pointInPolygon(lon, lat, KIGALI_POLYGON)) continue;
      const coreDistance = Math.hypot((lon - 30.0619) * 2.2, (lat + 1.9441) * 2.8);
      const urbanCore = clamp(92 - coreDistance * 170, 22, 94);
      const n1 = pseudoNoise(lat, lon, 1);
      const n2 = pseudoNoise(lat, lon, 2);
      const n3 = pseudoNoise(lat, lon, 3);
      const n4 = pseudoNoise(lat, lon, 4);
      const { district, sector } = districtFor(lat, lon);
      const demand = clamp(urbanCore + n1 * 20 - 6 + bias.demand);
      const access = clamp(urbanCore * 0.72 + n2 * 28 + bias.access + (lon > 30.0 && lon < 30.13 ? 7 : 0));
      const commercial = clamp(urbanCore * 0.62 + n3 * 32 + bias.commercial + (district === "Nyarugenge" ? 6 : 0));
      const competition = clamp(urbanCore * 0.55 + n4 * 35 + bias.competition + (sector === "Kimironko" || sector === "Nyarugenge" ? 12 : 0));
      const confidence = clamp(52 + urbanCore * 0.32 + n2 * 18 + (district === "Gasabo" ? 6 : 2));
      const opportunity = clamp(demand * 0.35 + access * 0.22 + commercial * 0.22 + confidence * 0.12 - competition * 0.16 + 12);
      const type = opportunityType(opportunity, competition, demand, access);
      zones.push({
        id: `hex-${category}-${row}-${index}`,
        area: `${sector} ${index % 3 === 0 ? "core" : index % 3 === 1 ? "access cell" : "neighbourhood cell"}`,
        district,
        sector,
        category,
        latitude: lat,
        longitude: lon,
        opportunity,
        demand,
        access,
        commercial,
        competition,
        confidence,
        type,
        risk: competition > 76 ? "high" : opportunity >= 76 ? "low" : "medium",
        population: Math.round(1200 + demand * 95 + n1 * 1800),
        householdSignal: clamp(demand - 6 + n2 * 12),
        spendingSignal: clamp(demand * 0.72 + commercial * 0.18 + n3 * 14),
        roadSignal: clamp(access + n1 * 10 - 4),
        transitSignal: clamp(access * 0.8 + commercial * 0.12 + n4 * 16),
        anchorSignal: clamp(commercial + n2 * 11 - 5),
        directSupply: Math.max(0, Math.round(competition / 12 + n4 * 4)),
        underservedSignal: clamp(demand - competition + 45),
        source: "grid",
      });
      index += 1;
    }
  }
  return zones;
}

function normalizeCell(cell: OpportunityCell, category: string): Zone | null {
  const latitude = Number(cell.latitude);
  const longitude = Number(cell.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const opportunity = clamp(Number(cell.opportunity_score ?? (cell as any).score ?? 0));
  const demand = clamp(Number(cell.demand_score ?? Math.max(0, opportunity - 6)));
  const access = clamp(Number(cell.accessibility_score ?? cell.access_score ?? Math.max(0, opportunity - 10)));
  const commercial = clamp(Number(cell.commercial_activity_score ?? Math.max(0, opportunity - 12)));
  const competition = clamp(Number(cell.competition_pressure ?? 52));
  const confidence = clamp(Number(cell.confidence_score ?? 68));
  return {
    id: String(cell.grid_id || cell.id || `${latitude},${longitude}`),
    area: cell.name || cell.area || cell.grid_id || "Opportunity cell",
    district: cell.district || "Kigali",
    sector: (cell as any).sector || undefined,
    category,
    latitude,
    longitude,
    opportunity,
    demand,
    access,
    commercial,
    competition,
    confidence,
    type: cell.opportunity_type || cell.experience_badge || opportunityType(opportunity, competition, demand, access),
    risk: String(cell.risk_level || "medium"),
    population: Math.round(1200 + demand * 95),
    householdSignal: demand,
    spendingSignal: clamp(demand * 0.72 + commercial * 0.18),
    roadSignal: access,
    transitSignal: clamp(access * 0.86),
    anchorSignal: commercial,
    directSupply: Math.max(0, Math.round(competition / 12)),
    underservedSignal: clamp(demand - competition + 45),
    source: "backend",
  };
}

function mergeBackendCells(grid: Zone[], backendCells: Zone[]) {
  if (!backendCells.length) return grid;
  return grid.map((zone) => {
    const match = backendCells.find((cell) => Math.hypot(cell.latitude - zone.latitude, cell.longitude - zone.longitude) < 0.015);
    return match ? { ...zone, ...match, id: zone.id, latitude: zone.latitude, longitude: zone.longitude, area: match.area || zone.area, source: "backend-enhanced" } : zone;
  });
}

function zoneFromAssessment(assessment: PlatformAssessment): Zone {
  return {
    id: "selected-location",
    area: "Selected location",
    district: "Kigali",
    category: assessment.business_category,
    latitude: assessment.latitude,
    longitude: assessment.longitude,
    opportunity: clamp(Number(assessment.overall?.opportunity_score || 0)),
    demand: clamp(Number(assessment.factors?.demand_score || 0)),
    access: clamp(Number(assessment.factors?.accessibility_score || 0)),
    commercial: clamp(Number(assessment.factors?.commercial_activity_score || 0)),
    competition: clamp(Number(assessment.factors?.competition_pressure || 0)),
    confidence: clamp(Number(assessment.overall?.confidence_score || 0)),
    type: assessment.overall?.opportunity_type || "Location screen",
    risk: assessment.risk_notes?.length ? "medium" : "low",
    population: Math.round(1200 + clamp(Number(assessment.factors?.demand_score || 0)) * 95),
    directSupply: Math.max(0, Math.round(clamp(Number(assessment.factors?.competition_pressure || 0)) / 12)),
    source: "assessment",
  };
}

function manualZone(lat: number, lon: number, category: string): Zone {
  const { district, sector } = districtFor(lat, lon);
  const demand = clamp(60 + pseudoNoise(lat, lon, 1) * 22);
  const access = clamp(55 + pseudoNoise(lat, lon, 2) * 25);
  const commercial = clamp(50 + pseudoNoise(lat, lon, 3) * 24);
  const competition = clamp(40 + pseudoNoise(lat, lon, 4) * 34);
  const confidence = 45;
  const opportunity = clamp(demand * 0.35 + access * 0.22 + commercial * 0.22 + confidence * 0.12 - competition * 0.16 + 12);
  return { id: "manual-selection", area: "Selected location", district, sector, category, latitude: lat, longitude: lon, opportunity, demand, access, commercial, competition, confidence, type: "Preliminary location screen", risk: "medium", population: Math.round(1200 + demand * 95), directSupply: Math.max(0, Math.round(competition / 12)), source: "local-estimate" };
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

function zoneFromGeoJsonFeature(feature: any, category: string): Zone | null {
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
  const district = String(props.district || "Kigali");
  const sector = props.sector ? String(props.sector) : undefined;
  const cell = props.cell ? String(props.cell) : undefined;
  const area = [sector, cell].filter(Boolean).join(" · ") || district || String(props.grid_id || "Opportunity cell");
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
    type: String(props.opportunity_type || props.zone_key || opportunityType(opportunity, competition, demand, access)),
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

function layerLabel(layer: LayerKey) {
  return layer === "commercial" ? "Activity" : layer.charAt(0).toUpperCase() + layer.slice(1);
}

function lensInsight(zone: Zone, layer: LayerKey) {
  const value = Math.round(metricValue(zone, layer));
  if (layer === "demand") return { title: "Demand lens", body: `Estimated population pull ${Math.round(zone.population || 0).toLocaleString()} people, household signal ${Math.round(zone.householdSignal || zone.demand)}, spending signal ${Math.round(zone.spendingSignal || zone.demand)}`, value };
  if (layer === "competition") return { title: "Saturation lens", body: `Estimated direct supply ${zone.directSupply ?? Math.round(zone.competition / 12)} nearby businesses, underserved signal ${Math.round(zone.underservedSignal || 0)}, risk ${zone.competition > 75 ? "high" : zone.competition > 55 ? "moderate" : "lower"}`, value };
  if (layer === "access") return { title: "Access lens", body: `Road convenience ${Math.round(zone.roadSignal || zone.access)}, transit signal ${Math.round(zone.transitSignal || zone.access)}, useful for businesses that depend on walk in movement`, value };
  if (layer === "commercial") return { title: "Activity lens", body: `Commercial anchor signal ${Math.round(zone.anchorSignal || zone.commercial)}, nearby services and market activity look ${zone.commercial > 75 ? "strong" : zone.commercial > 55 ? "moderate" : "limited"}`, value };
  if (layer === "confidence") return { title: "Confidence lens", body: `Data coverage looks ${zone.confidence > 75 ? "strong" : zone.confidence > 55 ? "usable" : "limited"}, field checks should focus on rent, visibility and informal competitors`, value };
  return { title: "Opportunity lens", body: `${zone.type}, demand ${Math.round(zone.demand)}, access ${Math.round(zone.access)}, saturation ${Math.round(zone.competition)}, confidence ${Math.round(zone.confidence)}`, value };
}

function popupHtml(zone: Zone, layer: LayerKey, mode: Mode) {
  const insight = lensInsight(zone, layer);
  const action = mode === "competitive" ? "Use this to judge whether differentiation can beat nearby supply" : "Use this to decide whether the cell should be shortlisted";
  return `
    <div style="padding:14px;min-width:280px;max-width:340px">
      <div style="font-weight:900;font-size:15px;color:#0f172a;line-height:1.2">${zone.area}</div>
      <div style="margin-top:4px;font-size:12px;font-weight:800;color:#64748b">${zone.district}${zone.sector ? ` · ${zone.sector}` : ""} · ${categoryLabel(zone.category)}</div>
      <div style="margin-top:12px;border-radius:14px;background:#f8fafc;padding:10px">
        <div style="font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#0f766e">${insight.title}</div>
        <div style="margin-top:4px;font-size:24px;font-weight:900;color:#0f172a">${insight.value}</div>
        <div style="margin-top:6px;font-size:12px;line-height:1.45;color:#475569">${insight.body}</div>
      </div>
      <div style="margin-top:10px;font-size:12px;line-height:1.5;color:#334155"><b>${zone.type}</b><br/>${action}</div>
    </div>`;
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

function EmptyMapCallout({ mode }: { mode: Mode }) {
  const copy = copyByMode[mode];
  return <div className="map-empty-callout"><Sparkles size={18} /><div><strong>{mode === "scout" ? "Place a candidate pin" : "Select an opportunity area"}</strong><span>{mode === "scout" ? "Click the exact place you want to assess" : "Review the score, save it, compare it, or create a report"}</span></div></div>;
}

function LayerLegend({ layer }: { layer: LayerKey }) {
  const items: Record<LayerKey, Array<{ label: string; color: string }>> = {
    opportunity: [{ label: "Needs checks", color: "#ccfbf1" }, { label: "Promising", color: "#2dd4bf" }, { label: "Strong", color: "#0f766e" }],
    demand: [{ label: "Lower demand", color: "#dcfce7" }, { label: "Growing", color: "#22c55e" }, { label: "High demand", color: "#047857" }],
    competition: [{ label: "Low supply", color: "#14b8a6" }, { label: "Balanced", color: "#f59e0b" }, { label: "Crowded", color: "#e11d48" }],
    access: [{ label: "Limited", color: "#ecfdf5" }, { label: "Good", color: "#5eead4" }, { label: "Strong", color: "#0f766e" }],
    commercial: [{ label: "Quiet", color: "#fef3c7" }, { label: "Active", color: "#f59e0b" }, { label: "Hub", color: "#b45309" }],
    confidence: [{ label: "Limited", color: "#cbd5e1" }, { label: "Usable", color: "#99f6e4" }, { label: "Strong", color: "#0f766e" }],
  };
  return <div className="map-legend"><strong>{layerLabel(layer)} legend</strong><div>{items[layer].map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div></div>;
}

function propsToZone(props: any): Zone {
  return {
    id: String(props.id || props.grid_id), area: String(props.area || props.cell || props.sector || props.grid_id || "Opportunity cell"), district: String(props.district || "Kigali"), sector: props.sector ? String(props.sector) : undefined, category: String(props.category || props.business_category || "pharmacy"), latitude: Number(props.latitude), longitude: Number(props.longitude), opportunity: clamp(Number(props.opportunity)), demand: clamp(Number(props.demand)), access: clamp(Number(props.access)), commercial: clamp(Number(props.commercial)), competition: clamp(Number(props.competition)), confidence: clamp(Number(props.confidence)), type: String(props.type || props.opportunity_type || "Worth comparing"), risk: String(props.risk || props.risk_level || "medium"), population: Number(props.population || 0), householdSignal: Number(props.householdSignal || props.demand || 0), spendingSignal: Number(props.spendingSignal || props.demand || 0), roadSignal: Number(props.roadSignal || props.access || 0), transitSignal: Number(props.transitSignal || props.access || 0), anchorSignal: Number(props.anchorSignal || props.commercial || 0), directSupply: Number(props.directSupply || 0), underservedSignal: Number(props.underservedSignal || 0), source: String(props.source || "grid") };
}

export function LocationIntelligenceWorkspace({ initialMode = "opportunity" }: Props) {
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
  const [backendStatus, setBackendStatus] = useState<any | null>(null);

  const modeRef = useRef(mode);
  const categoryRef = useRef(category);
  const activeLayerRef = useRef(activeLayer);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => { modeRef.current = mode; categoryRef.current = category; activeLayerRef.current = activeLayer; }, [mode, category, activeLayer]);

  const gridZones = useMemo(() => zones.filter((zone) => zone.category === category && zone.source !== "assessment"), [zones, category]);
  const selectedZone = selected;
  const mapZones = useMemo(() => (mode === "scout" ? [] : gridZones), [gridZones, mode]);
  const topZones = useMemo(() => [...gridZones].sort((a, b) => b.opportunity - a.opportunity).slice(0, 9), [gridZones]);
  const mapData = useMemo(() => toHexGeoJson(mapZones, activeLayer), [mapZones, activeLayer]);
  const copy = copyByMode[mode];
  const activeLensOptions = mode === "competitive" ? lensByMode.competitive : lensByMode.opportunity;
  const guideSteps = [
    { title: "Choose a mode", body: "Opportunity scans Kigali areas, Scout checks one candidate pin, and Competitive explains saturation around a business type." },
    { title: "Pick a business category", body: "The current real-data categories are Pharmacy, Restaurant, Cafe, Supermarket and Salon." },
    { title: "Read the map lenses", body: "Switch between Opportunity, Demand, Access, Activity, Competition and Confidence to understand each area." },
    { title: "Select an area", body: "Choose an area to open the right insight panel. The map zooms in and shows the latest location scores." },
    { title: "Use Scout and compare", body: "Drop a pin to assess an exact rental location, then save it or compare it with other options before field checking." },
  ];

  const loadZones = useCallback(async () => {
    setLoading(true);
    setDataSource("loading");
    try {
      const [response, status] = await Promise.all([
        getPlatformOpportunityGeoJson(category, "opportunity", 5000),
        getMLOpportunityStatus().catch(() => null),
      ]);
      const backend = (response.features || []).map((feature: any) => zoneFromGeoJsonFeature(feature, category)).filter(Boolean) as Zone[];
      if (!backend.length) throw new Error("No location features returned");
      setBackendStatus(status);
      setZones(backend);
      setSelected(null);
      setDataSource("live");
      setNotice("Kigali location layer refreshed");
      window.setTimeout(() => setNotice(null), 2600);
    } catch (error) {
      console.error("Could not load opportunity areas", error);
      setZones([]);
      setSelected(null);
      setDataSource("offline");
      setNotice("Location intelligence is temporarily unavailable. Please try again shortly.");
      window.setTimeout(() => setNotice(null), 4600);
    } finally { setLoading(false); }
  }, [category]);

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
      const zone = propsToZone(feature.properties as any);
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
      const zone = propsToZone(feature.properties as any);
      map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 14.8, duration: 720 });
    });
    map.on("click", async (event) => {
      if (modeRef.current !== "scout") return;
      setWorking(true);
      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({ color: "#10231f" }).setLngLat(event.lngLat).addTo(map);
      map.flyTo({ center: event.lngLat, zoom: 14.3, duration: 650 });
      try {
        const result = await assessPlatformLocation({ latitude: event.lngLat.lat, longitude: event.lngLat.lng, business_category: categoryRef.current });
        const zone = zoneFromAssessment(result);
        setAssessment(result);
        setSelected(zone);
        setNotice("Location screen created");
      } catch (error) {
        console.error("Scout assessment failed", error);
        setAssessment(null);
        setSelected(null);
        setNotice("Assessment is temporarily unavailable. Please refresh or try again shortly.");
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
      setNotice(`Showing ${match.area}`);
    } else {
      setNotice("No matching area found. Try a district, sector or cell name in Kigali.");
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
      setNotice("Saved to your shortlist");
    } catch { setNotice("Could not save yet"); }
    finally { setWorking(false); window.setTimeout(() => setNotice(null), 3200); }
  }

  const currentLens = activeLayer === "commercial" ? "Activity" : layerLabel(activeLayer);
  const selectedLensInsight = selectedZone ? lensInsight(selectedZone, activeLayer) : null;
  const readiness = backendStatus?.readiness || {};
  const sourceLabel = dataSource === "live"
    ? "Kigali opportunity map"
    : dataSource === "loading"
      ? "Preparing location intelligence"
      : "Location intelligence unavailable";

  return (
    <main className="workspace-root">
      <section className="workspace-toolbar" aria-label="Location intelligence controls">
        <div className="workspace-mode-tabs" role="tablist" aria-label="Workspace mode">
          {modes.map(({ key, label, icon: Icon }) => <button key={key} role="tab" aria-selected={mode === key} onClick={() => switchMode(key)} className={mode === key ? "mode-tab active" : "mode-tab"}><Icon size={16} /> <span>{label}</span></button>)}
        </div>
        <div className="workspace-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchArea(); }} placeholder="Search district, sector or cell" /></div>
        <select value={category} onChange={(event) => setCategory(event.target.value as BusinessCategoryKey)} className="workspace-select" aria-label="Business category">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <button onClick={() => mapRef.current?.fitBounds(KIGALI_BOUNDS, { padding: { top: 40, bottom: 40, left: 330, right: 390 }, duration: 700 })} className="workspace-icon-button" aria-label="Recenter map"><LocateFixed size={18} /></button>
        <button onClick={loadZones} className="workspace-icon-button" aria-label="Refresh intelligence layer"><RefreshCw size={18} /></button>
      </section>

      <section className="workspace-grid">
        <div className="workspace-map-shell">
          <div ref={mapEl} className="workspace-map" />
          {mapState === "failed" && <div className="map-fallback"><AlertCircle size={22} /><strong>Map tiles did not load</strong><span>Check your internet connection or map tile access</span></div>}
          {(loading || mapState === "loading") && <div className="map-loading">Preparing map</div>}
          <EmptyMapCallout mode={mode} />
          {mode !== "scout" && <LayerLegend layer={activeLayer} />}
          <div className={`map-coverage-badge ${dataSource === "live" ? "is-live" : dataSource === "offline" ? "is-offline" : ""}`}><span className="status-dot" /> {sourceLabel}{mode !== "scout" ? ` · ${currentLens}` : " · Place a pin"}</div>
        </div>

        <aside className="workspace-left-panel floating-panel-left">
          <div className="workspace-panel-card mode-card">
            <div className="kicker">{mode === "opportunity" ? "Opportunity map" : mode === "scout" ? "Scout mode" : "Competitive view"}</div>
            <h1>{copy.title}</h1>
            <p>{copy.lead}</p>
            <div className="coverage-summary"><ShieldCheck size={16} /> {copy.helper}</div>
            <div className={`data-source-card ${dataSource === "live" ? "live" : dataSource === "offline" ? "offline" : ""}`}>
              <strong>{dataSource === "live" ? "Location intelligence ready" : dataSource === "offline" ? "Location intelligence unavailable" : "Loading intelligence"}</strong>
              <span>{dataSource === "live" ? "Explore the map, select an area, or place a Scout pin." : "Please try again shortly."}</span>
            </div>
            <button type="button" onClick={() => { setGuideStep(0); setShowGuide(true); }} className="guide-link">Show quick guide</button>
          </div>

          {mode !== "scout" && <div className="workspace-panel-card compact lens-card"><div className="panel-title"><Layers3 size={17} /> {mode === "competitive" ? "Competition lens" : "Opportunity lens"}</div><p>{mode === "competitive" ? "Switch views to separate crowded areas from underserved demand" : "Switch views to understand demand, access, activity, competition and confidence"}</p><div className="layer-grid">{activeLensOptions.map((layer) => <button key={layer.key} title={layer.help} onClick={() => setActiveLayer(layer.key)} className={activeLayer === layer.key ? "layer-chip active" : "layer-chip"}>{layer.label}</button>)}</div></div>}

          {mode === "scout" && <div className="workspace-panel-card compact scout-card"><div className="panel-title"><MapPin size={17} /> Scout checklist</div><p>Use this when you already have a candidate shop or rental space in mind</p><div className="mt-3 grid gap-2 text-sm font-bold text-slate-700"><span className="rounded-2xl bg-white p-3">Click the exact place on the map</span><span className="rounded-2xl bg-white p-3">Read the first screen in the insight panel</span><span className="rounded-2xl bg-white p-3">Save, compare, then field check</span></div></div>}

          {mode !== "scout" && <div className="workspace-panel-card priority-list"><div className="panel-title"><Sparkles size={17} /> Highlighted opportunity areas</div>{topZones.length ? <div className="zone-list">{topZones.map((zone, index) => <button key={zone.id} onClick={() => focusZone(zone)} className={selectedZone?.id === zone.id ? "zone-row active" : "zone-row"}><span className="zone-rank">{index + 1}</span><span className="zone-name"><strong>{zone.area}</strong><small>{zone.type}</small></span><span className="zone-score">{Math.round(zone.opportunity)}</span></button>)}</div> : <EmptyState title="Location layer unavailable" text="Try refreshing the page or selecting another business category." />}</div>}
        </aside>

        <aside className={selectedZone ? "workspace-right-panel floating-panel-right" : "workspace-right-panel floating-panel-right panel-hidden"}>
          {selectedZone ? (
            <div className="insight-panel-card">
              <button type="button" onClick={closeInsightPanel} className="insight-close" aria-label="Close insight panel">
                <X size={18} />
              </button>
              <div className="selected-header">
                <div>
                  <div className="kicker">{mode === "scout" ? "Selected place" : "Selected area"}</div>
                  <h2>{selectedZone.area}</h2>
                  <p>{selectedZone.district}{selectedZone.sector ? ` · ${selectedZone.sector}` : ""} · {categoryLabel(category)}</p>
                </div>
                <div className={`score-badge ${scoreClass(selectedZone.opportunity)}`}>
                  <strong>{Math.round(selectedZone.opportunity)}</strong>
                  <span>{scoreLabel(selectedZone.opportunity)}</span>
                </div>
              </div>
              <p className="selected-summary">{selectedZone.type}. Use this assessment to shortlist, compare and verify conditions on the ground</p>
              {selectedLensInsight && (
                <div className="lens-detail-card">
                  <div className="kicker">{selectedLensInsight.title}</div>
                  <strong>{selectedLensInsight.value}</strong>
                  <p>{selectedLensInsight.body}</p>
                </div>
              )}
              <div className="metric-stack">
                <MetricRow label="Demand" value={selectedZone.demand} help="Population, households and spending potential" />
                <MetricRow label="Access" value={selectedZone.access} help="Roads, public transport and movement convenience" />
                <MetricRow label="Activity" value={selectedZone.commercial} help="Markets, services and nearby anchors" />
                <MetricRow label="Competition" value={selectedZone.competition} help="Category saturation and direct supply" danger />
                <MetricRow label="Confidence" value={selectedZone.confidence} help="Reliability of available signals" />
              </div>
              {(detailLoading || competitionDetails?.competitors || bestBusiness.length > 0) && (
                <div className="real-context-stack">
                  {detailLoading && <div className="mini-loading">Loading area context</div>}
                  {competitionDetails?.competitors && (
                    <div className="real-context-card">
                      <div className="panel-title"><Radar size={17} /> Competition context</div>
                      <div className="context-stat-grid">
                        <span><strong>{Number(competitionDetails.competitors.within_300m || 0)}</strong><small>within 300m</small></span>
                        <span><strong>{Number(competitionDetails.competitors.within_500m || 0)}</strong><small>within 500m</small></span>
                        <span><strong>{Number(competitionDetails.competitors.within_1000m || 0)}</strong><small>within 1km</small></span>
                      </div>
                      {competitionDetails.competitors.nearest_competitor_m != null && <p>Nearest mapped competitor is about {Math.round(Number(competitionDetails.competitors.nearest_competitor_m))}m away.</p>}
                      {!!competitionDetails.nearby_complementary_and_demand_generators?.length && <p>Nearby anchors: {competitionDetails.nearby_complementary_and_demand_generators.slice(0, 4).map((item: any) => `${categoryLabel(item.category_key)} (${item.count})`).join(", ")}</p>}
                    </div>
                  )}
                  {bestBusiness.length > 0 && (
                    <div className="real-context-card">
                      <div className="panel-title"><Sparkles size={17} /> Best business fit here</div>
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
                <div className="panel-title"><Crosshair size={17} /> Recommended next move</div>
                <p>{assessment?.recommendation || copy.nextMove}</p>
                <div className="next-actions">
                  
                  <button disabled={working} onClick={saveCurrent} className="btn-primary"><Bookmark size={16} /> {working ? "Saving" : copy.primary}</button>
                  <Link href={`/compare?${selectedLocationParams()}`} className="btn-secondary"><GitCompare size={16} /> Compare</Link>
                  <Link href={`/reports?${selectedLocationParams()}`} className="btn-secondary"><FileText size={16} /> Report</Link>
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
            <div className="kicker">First-time guide</div>
            <h2>{guideSteps[guideStep].title}</h2>
            <p>{guideSteps[guideStep].body}</p>
            <div className="tour-progress" aria-label={`Step ${guideStep + 1} of ${guideSteps.length}`}>
              {guideSteps.map((_, index) => <span key={index} className={index <= guideStep ? "active" : ""} />)}
            </div>
            <div className="tour-actions">
              <button type="button" className="btn-secondary" onClick={() => setGuideStep(Math.max(0, guideStep - 1))} disabled={guideStep === 0}>Back</button>
              {guideStep < guideSteps.length - 1 ? (
                <button type="button" className="btn-primary" onClick={() => setGuideStep(guideStep + 1)}>Next</button>
              ) : (
                <button type="button" className="btn-primary" onClick={completeGuide}>Done</button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
