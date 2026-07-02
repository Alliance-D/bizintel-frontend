import { authHeaders } from './auth';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type ScoutRequest = {
  latitude: number;
  longitude: number;
  business_category: string;
  radius_meters: number;
  budget_level?: "low" | "medium" | "high";
  risk_tolerance?: "low" | "medium" | "high";
};

async function safeJson<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

export async function assessLocation(payload: ScoutRequest) {
  const res = await fetch(`${API_BASE_URL}/api/v1/scout/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Assessment failed: ${res.status}`);
  }

  return res.json();
}

export async function getCategories() {
  return safeJson<any[]>(`${API_BASE_URL}/api/v1/categories`, [], { next: { revalidate: 3600 } });
}

export async function getDatasetCatalog() {
  return safeJson<{ datasets: any[] }>(`${API_BASE_URL}/api/v1/datasets/catalog`, { datasets: [] }, { cache: "no-store" });
}

export async function getFeatureCatalog() {
  return safeJson<{ features: any[] }>(`${API_BASE_URL}/api/v1/features/catalog`, { features: [] }, { cache: "no-store" });
}

export async function getAdminStatus() {
  return safeJson<any>(`${API_BASE_URL}/api/v1/admin/status`, null, { cache: "no-store" });
}


export async function getModelStatus() {
  return safeJson<any>(`${API_BASE_URL}/api/v1/models/status`, null, { cache: "no-store" });
}

export async function getModelVersions() {
  return safeJson<{ models: any[] }>(`${API_BASE_URL}/api/v1/models/versions`, { models: [] }, { cache: "no-store" });
}

export async function getModelMetrics(modelVersionId?: number) {
  const qs = modelVersionId ? `?model_version_id=${modelVersionId}` : "";
  return safeJson<{ metrics: any[] }>(`${API_BASE_URL}/api/v1/models/metrics${qs}`, { metrics: [] }, { cache: "no-store" });
}

export async function getFeatureImportance(modelVersionId?: number) {
  const qs = modelVersionId ? `?model_version_id=${modelVersionId}` : "";
  return safeJson<{ features: any[] }>(`${API_BASE_URL}/api/v1/models/feature-importance${qs}`, { features: [] }, { cache: "no-store" });
}

export async function getOpportunitySummary(category = "salon") {
  return safeJson<any>(`${API_BASE_URL}/api/v1/opportunity/summary?category=${category}`, null, { cache: "no-store" });
}
export async function runCompetitiveAnalysis(payload: { latitude: number; longitude: number; business_category: string; radius_meters: number }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/competitive/analyze`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export async function compareLocations(payload: { business_category: string; locations: Array<{ label?: string; latitude: number; longitude: number }> }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/compare/locations`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export async function getSavedLocations() {
  return safeJson<{ locations: any[] }>(`${API_BASE_URL}/api/v1/saved-locations`, { locations: [] }, { cache: "no-store" });
}
export async function getAlerts() {
  return safeJson<{ alerts: any[] }>(`${API_BASE_URL}/api/v1/alerts`, { alerts: [] }, { cache: "no-store" });
}
export async function generateReport(payload: { title: string; business_category: string; latitude: number; longitude: number }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/reports/generate`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
export async function getInsightsSummary(category = "salon") {
  return safeJson<any>(`${API_BASE_URL}/api/v1/insights/summary?category=${category}`, null, { cache: "no-store" });
}


export async function login(payload: { email: string; password: string }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/auth/login`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function submitValidationPoint(payload: any) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/field-validation/points`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getNotifications() {
  return safeJson<{ notifications: any[] }>(`${API_BASE_URL}/api/v1/notifications`, { notifications: [] }, { cache: "no-store" });
}

export async function generateReportPdf(payload: { title: string; business_category: string; latitude: number; longitude: number }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/reports/pdf`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("PDF export failed");
  return res.blob();
}

export async function getLiveDataReadiness() {
  return safeJson<any>(`${API_BASE_URL}/api/v1/live/data-readiness`, null, { cache: "no-store" });
}

export async function getLiveLayers() {
  return safeJson<{ layers: any[] }>(`${API_BASE_URL}/api/v1/live/layers`, { layers: [] }, { cache: "no-store" });
}

export async function getLiveOpportunityPoints(category = "salon", limit = 800) {
  return safeJson<{ category: string; points: any[] }>(`${API_BASE_URL}/api/v1/live/opportunity-points?category=${category}&limit=${limit}`, { category, points: [] }, { cache: "no-store" });
}

export async function getLiveLocationContext(payload: { latitude: number; longitude: number; business_category: string; radius_meters?: number }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/live/location-context`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getMLOpportunityStatus() {
  return safeJson<any>(`${API_BASE_URL}/api/v1/ml-opportunity/status`, null, { cache: "no-store" });
}

export async function getMLCategoryProfiles() {
  return safeJson<{ categories: any[] }>(`${API_BASE_URL}/api/v1/ml-opportunity/category-profiles`, { categories: [] }, { cache: "no-store" });
}

export async function assessMLOpportunity(payload: { latitude: number; longitude: number; business_category: string; radius_meters?: number }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/ml-opportunity/assess`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getTopMLZones(category = "salon", limit = 25) {
  return safeJson<{ business_category: string; zones: any[] }>(`${API_BASE_URL}/api/v1/ml-opportunity/top-zones?category=${category}&limit=${limit}`, { business_category: category, zones: [] }, { cache: "no-store" });
}


export async function getExperienceManifest() {
  return safeJson<any>(`${API_BASE_URL}/api/v1/experience/manifest`, null, { cache: "no-store" });
}

export async function getExperienceCellInsight(payload: { latitude: number; longitude: number; business_category: string; radius_meters?: number }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/experience/cell-insight`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getCategoryStory(category = "salon") {
  return safeJson<any>(`${API_BASE_URL}/api/v1/experience/category-story?category=${category}`, null, { cache: "no-store" });
}

export async function getRecommendationFeed(category = "salon", limit = 12) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/experience/recommendation-feed?category=${category}&limit=${limit}`, { items: [] }, { cache: "no-store" });
}

export async function trackExperienceEvent(payload: { event_name: string; business_category?: string; latitude?: number; longitude?: number; payload?: Record<string, unknown>; session_id?: string }) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/experience/events`, null, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}


export async function getWorkbenchStates() {
  return safeJson<{ states: any[] }>(`${API_BASE_URL}/api/v1/workbench/states`, { states: [] }, { headers: { ...authHeaders() }, cache: "no-store" });
}

export async function saveWorkbenchState(payload: any) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/workbench/states`, null, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

export async function getUserPreferences() {
  return safeJson<any>(`${API_BASE_URL}/api/v1/workbench/preferences`, null, { headers: { ...authHeaders() }, cache: "no-store" });
}

export async function updateUserPreferences(payload: any) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/workbench/preferences`, null, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
}

export async function getSecurityAuditLog(limit = 100) {
  return safeJson<any>(`${API_BASE_URL}/api/v1/admin/security/audit-log?limit=${limit}`, { events: [] }, { headers: { ...authHeaders() }, cache: "no-store" });
}
