"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, MapPin, Sparkles } from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { getAdvice, getAdvisorStatus, getSavedLocations, type AdvisorResponse } from "@/lib/platform-api";
import { PageHeader, EmptyDataPanel, useAsyncData, normaliseSavedLocation } from "@/components/platform/pageHelpers";

export function AdvisorPage() {
  const searchParams = useSearchParams();
  const { data: statusData } = useAsyncData(() => getAdvisorStatus(), [], null);
  const { data: savedData } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const savedLocations = useMemo(
    () => (savedData?.locations || []).map(normaliseSavedLocation).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    [savedData],
  );

  const [category, setCategory] = useState("pharmacy");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [queryLoaded, setQueryLoaded] = useState(false);
  const [result, setResult] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryLoaded) return;
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const categoryParam = searchParams.get("category");
    if (categoryParam) setCategory(categoryParam);
    if (latParam && lonParam) {
      const lat = Number(latParam);
      const lon = Number(lonParam);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setLatitude(String(lat));
        setLongitude(String(lon));
      }
    }
    setQueryLoaded(true);
  }, [queryLoaded, searchParams]);

  const lat = Number(latitude);
  const lon = Number(longitude);
  const hasCoordinates = latitude.trim().length > 0 && longitude.trim().length > 0;
  const canAsk = hasCoordinates && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -3 && lat <= -1 && lon >= 28 && lon <= 31.5;
  const advisorAvailable = statusData?.available !== false;

  function applySavedLocation(item: ReturnType<typeof normaliseSavedLocation>) {
    setSelectedSavedId(item.id);
    setCategory(item.business_category || "pharmacy");
    setLatitude(String(item.latitude));
    setLongitude(String(item.longitude));
    setResult(null);
    setError(null);
  }

  async function askAdvisor() {
    if (!canAsk) { setError("Choose a saved location or enter valid Kigali coordinates first."); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await getAdvice({ business_category: category, latitude: lat, longitude: lon });
      setResult(response);
      if (!response.available) setError(response.message);
    } catch {
      setResult(null);
      setError("The AI Business Advisor could not generate advice right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader
        eyebrow="AI Business Advisor"
        title="Talk through a location before you commit"
        text="Get plain-language advice on a candidate location, grounded in its real demand, access, activity and competition scores — not a prediction of revenue or success."
        action={<Link href="/map" className="btn-secondary"><MapPin size={16} /> Pick from map</Link>}
      />

      {!advisorAvailable && (
        <div className="mb-6 flex items-start gap-3 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 text-amber-800">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <strong className="block font-black">Advisor not configured</strong>
            <p className="mt-1 text-sm leading-6">The AI Business Advisor is not enabled on this deployment yet. Everything else on the platform works normally.</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="display-font text-2xl font-black">Location</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Choose a saved location or enter coordinates for a candidate space.</p>
          <div className="mt-4 space-y-3">
            <label className="grid gap-2 text-sm font-bold text-slate-600">Saved location
              <select className="input-modern" value={selectedSavedId} onChange={(e) => { const match = savedLocations.find((item) => item.id === e.target.value); if (match) applySavedLocation(match); else setSelectedSavedId(""); }}>
                <option value="">Select saved location</option>
                {savedLocations.map((item) => <option key={item.id} value={item.id}>{item.label} — {categoryLabel(item.business_category)}</option>)}
              </select>
            </label>
            <select className="input-modern" value={category} onChange={(e) => setCategory(e.target.value)}>{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <div className="form-grid-2">
              <input className="input-modern" placeholder="Latitude" value={latitude} onChange={(e) => { setLatitude(e.target.value); setSelectedSavedId(""); }} />
              <input className="input-modern" placeholder="Longitude" value={longitude} onChange={(e) => { setLongitude(e.target.value); setSelectedSavedId(""); }} />
            </div>
            <button onClick={askAdvisor} disabled={!canAsk || loading} className="btn-primary w-full"><Sparkles size={16} /> {loading ? "Thinking" : "Get advice"}</button>
            {error && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{error}</p>}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="kicker text-[var(--brand)]">Advisor notes</div>
          <h2 className="mt-2 display-font text-3xl font-black">{categoryLabel(category)} in Kigali</h2>
          {result?.available && result.advice ? (
            <>
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-700">{result.advice}</p>
              <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">This is advisory commentary on the location's computed spatial signals, not a prediction of revenue, profit or business success. Confirm rent, visibility and informal competition in the field before committing.</p>
            </>
          ) : (
            <div className="mt-5"><EmptyDataPanel title="No advice yet" text="Choose a location and select Get advice to receive narrative guidance grounded in its opportunity, access and competition signals." /></div>
          )}
        </section>
      </div>
    </main>
  );
}
