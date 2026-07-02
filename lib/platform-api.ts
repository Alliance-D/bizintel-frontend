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
};

export type PlatformAssessment = {
  status?: string;
  source?: string;
  business_category: string;
  latitude: number;
  longitude: number;
  overall: {
    opportunity_score: number;
    opportunity_type?: string;
    confidence_score: number;
    opportunity_rank?: number | null;
  };
  factors: {
    demand_score: number;
    accessibility_score: number;
    commercial_activity_score: number;
    competition_pressure: number;
  };
  competition?: {
    within_300m: number;
    within_500m: number;
    within_1000m: number;
  };
  risk_notes?: string[];
  recommendation?: string;
  explanation?: any;
};

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

export async function getPlatformOpportunityCells(category = "salon", district?: string, limit = 120) {
  const params = new URLSearchParams({ category, limit: String(limit) });
  if (district) params.set("district", district);
  return requestJson<OpportunityCellsResponse>(`/api/v1/platform/opportunity-cells?${params.toString()}`);
}

export async function getPlatformOpportunityGeoJson(category = "pharmacy", layer = "opportunity", limit = 5000) {
  const params = new URLSearchParams({ category, layer, limit: String(limit) });
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

export async function compareLocations(payload: { business_category: string; locations: Array<{ label?: string; latitude: number; longitude: number }> }) {
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
