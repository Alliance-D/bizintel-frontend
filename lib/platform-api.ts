import { authHeaders } from "@/lib/auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export type BusinessCategoryKey =
  | "pharmacy"
  | "restaurant"
  | "cafe"
  | "grocery"
  | "salon"
  | "barbershop"
  | "beauty_salon"
  | "retail"
  | "mobile_money";

export type OpportunityCell = {
  grid_id?: string;
  id?: string;
  name?: string;
  area?: string;
  district?: string;
  latitude: number;
  longitude: number;
  business_category?: string;
  display_category?: string;
  opportunity_score: number;
  opportunity_type?: string;
  experience_badge?: string;
  demand_score: number;
  accessibility_score?: number;
  access_score?: number;
  commercial_activity_score: number;
  competition_pressure: number;
  confidence_score: number;
  opportunity_rank?: number;
  risk_level?: "low" | "medium" | "high" | string;
  explanation?: {
    strengths?: string[];
    risks?: string[];
    next_steps?: string[];
    summary?: string;
  } | Record<string, unknown>;
};

export type OpportunityCellsResponse = {
  category: string;
  district?: string | null;
  cells: OpportunityCell[];
  summary: {
    total_cells: number;
    average_opportunity: number;
    average_demand: number;
    average_access: number;
    average_competition: number;
    average_confidence?: number;
    zone_counts?: Record<string, number>;
    best_zone?: OpportunityCell;
  };
};

export type AssessmentPayload = {
  latitude: number;
  longitude: number;
  business_category: string;
  radius_meters?: number;
  locale?: string;
};

export type PlatformAssessment = {
  status?: string;
  source?: string;
  business_category: string;
  latitude: number;
  longitude: number;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  location_label?: string;
  landmark?: string | null;
  overall: {
    opportunity_score: number;
    gap_score?: number;
    opportunity_type?: string;
    confidence_score: number;
    opportunity_rank?: number | null;
    expected_count?: number | null;
    observed_count?: number | null;
    gap?: number | null;
  };
  factors: {
    demand_score: number;
    accessibility_score: number;
    commercial_activity_score: number;
    competition_pressure: number;
  };
  signals?: LocationSignals;
  competition?: {
    within_300m: number;
    within_500m: number;
    within_1000m: number;
  };
  risk_notes?: string[];
  recommendation?: string;
  explanation?: any;
};

export type LocationSignals = {
  people_within_1km: number | null;
  population_density_1000m: number | null;
  sector_population: number | null;
  commercial_activity_level: string;
  commercial_poi_count_500m: number | null;
  complementary_poi_count_500m: number | null;
  anchor_count_1000m: number | null;
  bus_stop_count_500m: number | null;
  nearest_bus_stop_m: number | null;
  school_count_1000m: number | null;
  health_facility_count_1000m: number | null;
  market_distance_m: number | null;
  expected_count: number | null;
  observed_count: number | null;
};

export type NearbyPoi = {
  name: string | null;
  category_key: string;
  latitude: number;
  longitude: number;
  distance_m: number;
};

export type NearbyCompetitor = NearbyPoi;

export type VillageBoundary = {
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  geometry: GeoJSON.Geometry | null;
} | null;

export type UnifiedReportPointEntry = {
  mode: "point";
  label: string;
  latitude: number;
  longitude: number;
  assessment: PlatformAssessment;
  competitors: NearbyCompetitor[];
  anchors?: NearbyPoi[];
  complementary?: NearbyPoi[];
  village_boundary: VillageBoundary;
  narrative: AdvisorResponse;
};

export type AreaCandidate = OpportunityCell & { location_label?: string; landmark?: string | null; village?: string; sector?: string; cell?: string };

export type UnifiedReportAreaEntry = {
  mode: "area";
  label: string;
  district: string;
  sector?: string | null;
  cell?: string | null;
  top_candidates: AreaCandidate[];
  expanded_candidate?: UnifiedReportPointEntry;
};

export type UnifiedReportEntry = UnifiedReportPointEntry | UnifiedReportAreaEntry;

export type ComparisonResult = {
  locations: Array<Record<string, any>>;
  best_location: Record<string, any> | null;
  summary: string;
};

export type UnifiedReportBundle = {
  business_category: string;
  budget?: string | null;
  notes?: string | null;
  locale?: string | null;
  mode?: "single" | "compare" | string;
  entries: UnifiedReportEntry[];
  comparison: ComparisonResult | null;
};

export type UnifiedReportFormLocation =
  | { mode: "point"; latitude: number; longitude: number; label?: string }
  | { mode: "area"; district: string; sector?: string; cell?: string; label?: string };

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.detail === "string") return parsed.detail;
  } catch {
    // response body wasn't JSON (e.g. a network-level or CORS failure)
  }
  return fallback;
}

export async function getPlatformOpportunityCells(category = "salon", district?: string, limit = 120, sector?: string, cell?: string) {
  const params = new URLSearchParams({ category, limit: String(limit) });
  if (district) params.set("district", district);
  if (sector) params.set("sector", sector);
  if (cell) params.set("cell", cell);
  return requestJson<OpportunityCellsResponse>(`/api/v1/platform/opportunity-cells?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Geography (location-hierarchy picker + village context)
// ---------------------------------------------------------------------------

export async function getDistricts() {
  return requestJson<{ districts: string[] }>(`/api/v1/geography/districts`);
}

export async function getSectors(district: string) {
  return requestJson<{ district: string; sectors: string[] }>(`/api/v1/geography/sectors?district=${encodeURIComponent(district)}`);
}

export async function getCells(district: string, sector: string) {
  const params = new URLSearchParams({ district, sector });
  return requestJson<{ district: string; sector: string; cells: string[] }>(`/api/v1/geography/cells?${params.toString()}`);
}

export async function getVillageBoundary(latitude: number, longitude: number) {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  return requestJson<NonNullable<VillageBoundary>>(`/api/v1/platform/village-boundary?${params.toString()}`);
}

export async function getNearbyCompetitors(latitude: number, longitude: number, category: string, radiusMeters = 1000) {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), category, radius_meters: String(radiusMeters) });
  return requestJson<{ business_category: string; latitude: number; longitude: number; competitors: NearbyCompetitor[] }>(`/api/v1/platform/nearby-competitors?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Unified report (the /start form -> /report/[token] flow)
// ---------------------------------------------------------------------------

export async function buildUnifiedReport(payload: {
  business_category: string;
  locations: UnifiedReportFormLocation[];
  budget?: string;
  notes?: string;
  locale?: string;
}) {
  return requestJson<{ report_token: string | null; report: UnifiedReportBundle }>(`/api/v1/reports/build`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getUnifiedReport(reportToken: string) {
  return requestJson<{ report_token: string; report: UnifiedReportBundle }>(`/api/v1/reports/${encodeURIComponent(reportToken)}`);
}

export async function expandCandidate(reportToken: string, payload: { entry_index: number; grid_id: string; latitude: number; longitude: number; label?: string }) {
  return requestJson<UnifiedReportPointEntry>(`/api/v1/reports/${encodeURIComponent(reportToken)}/expand`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Direct URL to the branded PDF for a saved report (used by the download link).
export function unifiedReportPdfUrl(reportToken: string) {
  return `${API_BASE_URL}/api/v1/reports/${encodeURIComponent(reportToken)}/pdf`;
}

export async function getPlatformOpportunityGeoJson(category = "pharmacy", layer = "opportunity", limit = 5000, locale?: string) {
  const params = new URLSearchParams({ category, layer, limit: String(limit) });
  if (locale) params.set("locale", locale);
  return requestJson<any>(`/api/v1/platform/opportunity-geojson?${params.toString()}`);
}

export async function assessPlatformLocation(payload: AssessmentPayload) {
  return requestJson<PlatformAssessment>(`/api/v1/platform/assess`, {
    method: "POST",
    body: JSON.stringify({ ...payload, radius_meters: payload.radius_meters || 500 }),
  });
}

export async function getInsightsSummary(category = "salon") {
  return requestJson<any>(`/api/v1/insights/summary?category=${encodeURIComponent(category)}`);
}

export async function runCompetitiveAnalysis(payload: AssessmentPayload) {
  return getCompetitionAnalysis(payload.latitude, payload.longitude, payload.business_category);
}

export async function compareLocations(payload: { business_category: string; locations: Array<{ label?: string; latitude: number; longitude: number }>; locale?: string }) {
  return requestJson<any>(`/api/v1/compare/locations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateReport(payload: { title: string; business_category: string; latitude: number; longitude: number; saved_location_id?: number }) {
  return requestJson<any>(`/api/v1/reports/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSavedLocations() {
  return requestJson<{ locations: any[] }>(`/api/v1/saved-locations`);
}

export async function getAlerts() {
  return requestJson<{ alerts: any[] }>(`/api/v1/alerts`);
}

export async function deleteSavedLocation(locationId: string | number) {
  return requestJson<any>(`/api/v1/saved-locations/${encodeURIComponent(String(locationId))}`, {
    method: "DELETE",
  });
}

export async function getNotifications() {
  return requestJson<{ notifications: any[] }>(`/api/v1/notifications`);
}

export async function submitValidationPoint(payload: any) {
  return requestJson<any>(`/api/v1/field-validation/points`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminStatus() {
  return requestJson<any>(`/api/v1/admin/status`);
}

export async function getModelStatus() {
  return requestJson<any>(`/api/v1/models/status`);
}


export async function saveLocation(payload: { label: string; business_category: string; latitude: number; longitude: number; notes?: string }) {
  return requestJson<any>(`/api/v1/saved-locations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function downloadReportPdf(payload: { title: string; business_category: string; latitude: number; longitude: number; saved_location_id?: number }) {
  const response = await fetch(`${API_BASE_URL}/api/v1/reports/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `PDF request failed with status ${response.status}`);
  }
  return response.blob();
}

export async function getBestBusinessForArea(latitude: number, longitude: number) {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  return requestJson<any>(`/api/v1/platform/best-business?${params.toString()}`);
}

export async function getCompetitionAnalysis(latitude: number, longitude: number, category: string) {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), category });
  return requestJson<any>(`/api/v1/platform/competition-analysis?${params.toString()}`);
}

export async function getMLOpportunityStatus() {
  return requestJson<any>(`/api/v1/ml-opportunity/status`);
}

export async function getMapQualitySummary() {
  return requestJson<any>(`/api/v1/platform/map-quality-summary`);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: { id: number; full_name: string; email: string; role: string };
};

export async function login(email: string, password: string) {
  return requestJson<AuthResponse>(`/api/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(fullName: string, email: string, password: string) {
  return requestJson<AuthResponse>(`/api/v1/auth/register`, {
    method: "POST",
    body: JSON.stringify({ full_name: fullName, email, password }),
  });
}

// ---------------------------------------------------------------------------
// AI Business Advisor
// ---------------------------------------------------------------------------

export type AdvisorResponse = {
  available: boolean;
  message: string | null;
  advice: string | null;
  model?: string;
};

export type AdvisorMessage = { role: "user" | "assistant"; text: string };

export async function getAdvisorStatus() {
  return requestJson<{ available: boolean }>(`/api/v1/platform/advisor/status`);
}

export async function getAdvice(payload: { business_category: string; latitude: number; longitude: number; locale?: string; messages?: AdvisorMessage[]; user_context?: { budget?: string; notes?: string } }) {
  return requestJson<AdvisorResponse>(`/api/v1/platform/advisor`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Expansion Planner
// ---------------------------------------------------------------------------

export type ExpansionCandidate = {
  grid_id: string;
  latitude: number;
  longitude: number;
  opportunity_score: number;
  demand_score: number;
  accessibility_score: number;
  commercial_activity_score: number;
  competition_pressure: number;
  confidence_score: number;
  opportunity_type: string;
  risk_level: string;
  district: string;
  sector: string;
  distance_from_nearest_existing_m: number | null;
};

export async function planExpansion(payload: {
  business_category: string;
  existing_locations: Array<{ latitude: number; longitude: number }>;
  limit?: number;
  min_distance_from_existing_m?: number;
}) {
  return requestJson<{ candidates: ExpansionCandidate[]; excluded_near_existing: number; existing_location_count: number }>(
    `/api/v1/platform/expansion-planner`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

// ---------------------------------------------------------------------------
// Admin console
// ---------------------------------------------------------------------------

export async function getDataHealth() {
  return requestJson<any>(`/api/v1/admin/data-health`);
}

export async function getJobStatus() {
  return requestJson<any>(`/api/v1/admin/jobs/status`);
}

export async function triggerRetrain(activate = true) {
  return requestJson<any>(`/api/v1/admin/jobs/retrain?activate=${activate}`, { method: "POST" });
}

export async function triggerFeatureRebuild() {
  return requestJson<any>(`/api/v1/admin/jobs/rebuild-features`, { method: "POST" });
}

export async function activateModelVersion(modelVersionId: number) {
  return requestJson<any>(`/api/v1/admin/models/${modelVersionId}/activate`, { method: "POST" });
}

export async function getModelVersions() {
  return requestJson<{ models: any[] }>(`/api/v1/models/versions`);
}

export async function getFeatureImportance() {
  return requestJson<{ features: any[] }>(`/api/v1/models/feature-importance`);
}

export async function getDatasetCatalog() {
  return requestJson<{ datasets: any[] }>(`/api/v1/datasets/catalog`);
}

export async function getAuditLog() {
  return requestJson<{ events: any[] }>(`/api/v1/admin/security/audit-log`);
}
