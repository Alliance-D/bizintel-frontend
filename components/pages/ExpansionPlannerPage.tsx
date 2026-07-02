"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Plus, Radar } from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { getSavedLocations, planExpansion, type ExpansionCandidate } from "@/lib/platform-api";
import { PageHeader, EmptyDataPanel, useAsyncData, normaliseSavedLocation } from "@/components/platform/pageHelpers";

function candidateReportQuery(candidate: ExpansionCandidate, category: string) {
  const params = new URLSearchParams({
    label: `${candidate.district}${candidate.sector ? ` · ${candidate.sector}` : ""}`,
    category,
    lat: String(candidate.latitude),
    lon: String(candidate.longitude),
  });
  return params.toString();
}

export function ExpansionPlannerPage() {
  const { data: savedData } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const savedLocations = useMemo(
    () => (savedData?.locations || []).map(normaliseSavedLocation).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    [savedData],
  );

  const [category, setCategory] = useState("pharmacy");
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [manualLocations, setManualLocations] = useState<Array<{ latitude: string; longitude: string }>>([]);
  const [result, setResult] = useState<{ candidates: ExpansionCandidate[]; excluded_near_existing: number; existing_location_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleExisting(id: string) {
    setExistingIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  const existingLocations = useMemo(() => {
    const fromSaved = savedLocations.filter((item) => existingIds.includes(item.id)).map((item) => ({ latitude: item.latitude, longitude: item.longitude }));
    const fromManual = manualLocations
      .map((item) => ({ latitude: Number(item.latitude), longitude: Number(item.longitude) }))
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    return [...fromSaved, ...fromManual];
  }, [savedLocations, existingIds, manualLocations]);

  async function findCandidates() {
    if (!existingLocations.length) { setMessage("Add at least one existing location so candidates can be spaced away from it."); return; }
    setLoading(true);
    setMessage(null);
    try {
      const response = await planExpansion({ business_category: category, existing_locations: existingLocations, limit: 8, min_distance_from_existing_m: 600 });
      setResult(response);
      if (!response.candidates.length) setMessage("No candidate zones met the spacing rules for these locations and category. Try a different category or fewer existing locations.");
    } catch {
      setResult(null);
      setMessage("Expansion candidates could not be generated right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader
        eyebrow="Expansion Planner"
        title="Find where to open your next location"
        text="Ranks other high-opportunity zones for this business category, excluding areas too close to locations you already have so a new branch doesn't cannibalize the same catchment."
        action={<Link href="/map" className="btn-secondary"><MapPin size={16} /> Add from map</Link>}
      />

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><Radar className="text-emerald-700" /><h2 className="display-font text-2xl font-black">Existing locations</h2></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Select saved locations or add coordinates for places you already operate or are committed to.</p>
          <div className="mt-5 space-y-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-modern font-bold">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-slate-900">Saved locations</strong>
                <span className="text-xs font-bold text-slate-500">{savedLocations.length} available</span>
              </div>
              {savedLocations.length ? (
                <div className="mt-3 grid max-h-60 gap-2 overflow-auto pr-1">
                  {savedLocations.map((item) => {
                    const active = existingIds.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => toggleExisting(item.id)} className={`rounded-xl border px-3 py-2 text-left text-sm ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>
                        <span className="block font-black">{item.label}</span>
                        <span className="mt-1 block text-xs font-bold text-slate-500">{categoryLabel(item.business_category)} · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} {active ? "· existing" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="mt-3 text-sm leading-6 text-slate-500">No saved locations yet. Save your current location from the map, or enter coordinates manually below.</p>}
            </div>

            {manualLocations.map((location, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3"><strong className="text-xs uppercase tracking-[0.16em] text-slate-500">Manual location {index + 1}</strong><button type="button" onClick={() => setManualLocations((prev) => prev.filter((_, i) => i !== index))} className="text-xs font-black text-slate-500 hover:text-red-600">Remove</button></div>
                <div className="form-grid-2">
                  <input className="input-modern" placeholder="Latitude" value={location.latitude} onChange={(e) => setManualLocations((prev) => prev.map((item, i) => i === index ? { ...item, latitude: e.target.value } : item))} />
                  <input className="input-modern" placeholder="Longitude" value={location.longitude} onChange={(e) => setManualLocations((prev) => prev.map((item, i) => i === index ? { ...item, longitude: e.target.value } : item))} />
                </div>
              </div>
            ))}
            <button onClick={() => setManualLocations((prev) => [...prev, { latitude: "", longitude: "" }])} className="btn-secondary w-full"><Plus size={16} /> Add location manually</button>
            <button onClick={findCandidates} disabled={loading || !existingLocations.length} className="btn-primary w-full">{loading ? "Searching" : "Find expansion candidates"}</button>
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</p>}
          </div>
        </aside>

        <section className="space-y-5">
          {result?.candidates.length ? (
            <>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm text-sm font-bold text-slate-600">
                {result.candidates.length} candidate zones found for {categoryLabel(category).toLowerCase()}, at least 600m from your {result.existing_location_count} existing location{result.existing_location_count === 1 ? "" : "s"} and spaced apart from each other.
                {result.excluded_near_existing > 0 && ` ${result.excluded_near_existing} nearby zones were excluded for being too close to what you already have.`}
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr><th className="p-4">Zone</th><th>Opportunity</th><th>Demand</th><th>Competition</th><th>Confidence</th><th>Distance from existing</th><th>Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.candidates.map((candidate) => (
                      <tr key={candidate.grid_id}>
                        <td className="p-4 font-black text-slate-950">{candidate.district}{candidate.sector ? ` · ${candidate.sector}` : ""}<p className="mt-1 text-xs font-bold text-slate-500">{candidate.opportunity_type}</p></td>
                        <td className="font-black">{Math.round(candidate.opportunity_score)}</td>
                        <td>{Math.round(candidate.demand_score)}</td>
                        <td>{Math.round(candidate.competition_pressure)}</td>
                        <td>{Math.round(candidate.confidence_score)}</td>
                        <td>{candidate.distance_from_nearest_existing_m != null ? `${Math.round(candidate.distance_from_nearest_existing_m)}m` : "—"}</td>
                        <td><Link href={`/reports?${candidateReportQuery(candidate, category)}`} className="text-sm font-black text-emerald-700 hover:text-emerald-900">Report</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyDataPanel title="No expansion candidates yet" text="Select or add at least one existing location, then find expansion candidates for the next branch." />
          )}
        </section>
      </div>
    </main>
  );
}
