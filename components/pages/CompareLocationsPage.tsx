"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, GitCompare, MapPin, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { compareLocations, getSavedLocations } from "@/lib/platform-api";
import {
  PageHeader,
  InsightBlock,
  useAsyncData,
  normaliseComparisonRows,
  EmptyDataPanel,
  normaliseSavedLocation,
  candidateReportQuery,
} from "@/components/platform/pageHelpers";

export function CompareLocationsPage() {
  const searchParams = useSearchParams();
  const { data: savedData } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const savedLocations = useMemo(() => (savedData?.locations || []).map(normaliseSavedLocation).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [savedData]);
  const [category, setCategory] = useState("pharmacy");
  const [locations, setLocations] = useState<Array<{ savedId?: string; label: string; latitude: string; longitude: string }>>([]);
  const [queryLoaded, setQueryLoaded] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addSavedLocation(item: ReturnType<typeof normaliseSavedLocation>) {
    setCategory(item.business_category || category);
    setLocations((prev) => {
      if (prev.some((candidate) => candidate.savedId === item.id)) return prev;
      return [...prev, { savedId: item.id, label: item.label, latitude: String(item.latitude), longitude: String(item.longitude) }];
    });
    setMessage(`${item.label} added to comparison.`);
  }

  useEffect(() => {
    if (queryLoaded) return;
    const savedId = searchParams.get("saved");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const categoryParam = searchParams.get("category");
    const labelParam = searchParams.get("label");

    if (categoryParam) setCategory(categoryParam);

    if (savedId && savedLocations.length) {
      const match = savedLocations.find((item) => item.id === savedId);
      if (match) {
        addSavedLocation(match);
        setQueryLoaded(true);
        return;
      }
    }

    if (latParam && lonParam) {
      const latitude = Number(latParam);
      const longitude = Number(lonParam);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setLocations((prev) => prev.length ? prev : [{ label: labelParam || "Selected location", latitude: String(latitude), longitude: String(longitude) }]);
        setQueryLoaded(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryLoaded, savedLocations, searchParams]);

  const validLocations = locations
    .map((item, index) => ({ label: item.label || `Candidate ${index + 1}`, latitude: Number(item.latitude), longitude: Number(item.longitude) }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

  async function runCompare() {
    if (validLocations.length < 2) { setMessage("Add at least two candidate locations before comparing."); return; }
    setLoading(true); setMessage(null);
    try { setResult(await compareLocations({ business_category: category, locations: validLocations })); }
    catch { setResult(null); setMessage("Comparison could not be completed for these locations. Check the coordinates and try again."); }
    finally { setLoading(false); }
  }

  const rows = normaliseComparisonRows(result).filter(Boolean);
  const best = rows[0];
  const safest = rows.length ? [...rows].sort((a, b) => (a.competition_pressure - b.competition_pressure) || (b.confidence_score - a.confidence_score))[0] : null;
  const growth = rows.length ? [...rows].sort((a, b) => (b.demand_score + b.access_score) - (a.demand_score + a.access_score))[0] : null;

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow="Compare" title="Choose the strongest candidate" text="Compare saved places or manually entered candidate spaces side by side." action={<Link href="/map" className="btn-primary"><MapPin size={16} /> Add from map</Link>} />
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><GitCompare className="text-emerald-700" /><h2 className="display-font text-2xl font-black">Comparison setup</h2></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Select saved locations or add coordinates for new candidate rental spaces.</p>
          <div className="mt-5 space-y-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-modern font-bold">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-slate-900">Saved locations</strong>
                <span className="text-xs font-bold text-slate-500">{savedLocations.length} available</span>
              </div>
              {savedLocations.length ? <div className="mt-3 grid max-h-60 gap-2 overflow-auto pr-1">
                {savedLocations.map((item) => {
                  const added = locations.some((candidate) => candidate.savedId === item.id);
                  return <button key={item.id} type="button" onClick={() => addSavedLocation(item)} className={`rounded-xl border px-3 py-2 text-left text-sm ${added ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>
                    <span className="block font-black">{item.label}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{categoryLabel(item.business_category)} · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} {added ? "· added" : ""}</span>
                  </button>;
                })}
              </div> : <p className="mt-3 text-sm leading-6 text-slate-500">No saved locations yet. Save candidates from the map first, or enter coordinates manually below.</p>}
            </div>

            {locations.map((location, index) => <div key={`${location.savedId || "manual"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between gap-3"><strong className="text-xs uppercase tracking-[0.16em] text-slate-500">Candidate {index + 1}</strong><button type="button" onClick={() => setLocations((prev) => prev.filter((_, i) => i !== index))} className="text-xs font-black text-slate-500 hover:text-red-600">Remove</button></div><input className="input-modern" placeholder="Location label" value={location.label} onChange={(e) => setLocations((prev) => prev.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} /><div className="form-grid-2 mt-2"><input className="input-modern" placeholder="Latitude" value={location.latitude} onChange={(e) => setLocations((prev) => prev.map((item, i) => i === index ? { ...item, latitude: e.target.value } : item))} /><input className="input-modern" placeholder="Longitude" value={location.longitude} onChange={(e) => setLocations((prev) => prev.map((item, i) => i === index ? { ...item, longitude: e.target.value } : item))} /></div></div>)}
            <button onClick={() => setLocations((prev) => [...prev, { label: "", latitude: "", longitude: "" }])} className="btn-secondary w-full"><Plus size={16} /> Add candidate manually</button>
            <button onClick={runCompare} disabled={loading || validLocations.length < 2} className="btn-primary w-full">{loading ? "Comparing" : "Compare locations"}</button>
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</p>}
          </div>
        </aside>
        <section className="space-y-5">
          {rows.length ? <>
            <div className="grid gap-4 md:grid-cols-3">
              <InsightBlock title={`Best overall: ${best?.label}`} text="Strongest opportunity score among the selected candidates" icon={CheckCircle2} />
              <InsightBlock title={`Lower risk: ${safest?.label}`} text="Lower competition pressure and stronger confidence relative to the other options" icon={ShieldCheck} />
              <InsightBlock title={`Growth option: ${growth?.label}`} text="Strongest combined demand and access signal" icon={Sparkles} />
            </div>
            {best && <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><div className="kicker text-emerald-700">Recommended shortlist leader</div><h2 className="mt-2 text-2xl font-black text-slate-950">{best.label}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">This option currently has the strongest overall signal among the selected places. Confirm rent, frontage, visibility, customer movement and informal competitors before making a final decision.</p><Link href={`/reports?${candidateReportQuery(best, category)}`} className="btn-primary mt-4 inline-flex"><FileText size={16}/> Create report from this option</Link></div>}
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500"><tr><th className="p-4">Location</th><th>Opportunity</th><th>Demand</th><th>Access</th><th>Competition</th><th>Confidence</th><th>Action</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index)=><tr key={`${row.label}-${row.latitude}-${row.longitude}-${index}`}><td className="p-4 font-black text-slate-950">{row.label}<p className="mt-1 text-xs font-bold text-slate-500">{row.recommendation}</p></td><td className="font-black">{Math.round(row.opportunity_score)}</td><td>{Math.round(row.demand_score)}</td><td>{Math.round(row.access_score)}</td><td>{Math.round(row.competition_pressure)}</td><td>{Math.round(row.confidence_score)}</td><td><Link href={`/reports?${candidateReportQuery(row, category)}`} className="text-sm font-black text-emerald-700 hover:text-emerald-900">Report</Link></td></tr>)}</tbody></table></div>
          </> : <EmptyDataPanel title="No comparison results yet" text="Select at least two saved or manually entered candidate locations to compare them." />}
        </section>
      </div>
    </main>
  );
}
