"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Bookmark, CheckCircle2, ClipboardCheck, Download, FileText, GitCompare, MapPin, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { BrandMark } from "@/components/layout/BrandMark";
import { compareLocations, generateReport, getAlerts, getNotifications, getSavedLocations, submitValidationPoint, downloadReportPdf, deleteSavedLocation } from "@/lib/platform-api";
import {
  type AnyObj,
  PageHeader,
  Progress,
  StatusCard,
  InsightBlock,
  useAsyncData,
  normaliseComparisonRows,
  EmptyDataPanel,
  normaliseSavedLocation,
  locationQuery,
  candidateReportQuery,
  safeNumber,
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

export function ReportsPage() {
  const searchParams = useSearchParams();
  const { data: savedData } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const savedLocations = useMemo(() => (savedData?.locations || []).map(normaliseSavedLocation).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [savedData]);
  const [category, setCategory] = useState("pharmacy");
  const [title, setTitle] = useState("Candidate location report");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [queryLoaded, setQueryLoaded] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applySavedLocation(item: ReturnType<typeof normaliseSavedLocation>) {
    setSelectedSavedId(item.id);
    setCategory(item.business_category || "pharmacy");
    setTitle(`${item.label} report`);
    setLatitude(String(item.latitude));
    setLongitude(String(item.longitude));
    setResult(null);
    setMessage(null);
  }

  useEffect(() => {
    if (queryLoaded) return;
    const savedId = searchParams.get("saved");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const categoryParam = searchParams.get("category");
    const labelParam = searchParams.get("label");

    if (savedId && savedLocations.length) {
      const match = savedLocations.find((item) => item.id === savedId);
      if (match) {
        applySavedLocation(match);
        setQueryLoaded(true);
        return;
      }
    }

    if (latParam && lonParam) {
      const latValue = Number(latParam);
      const lonValue = Number(lonParam);
      if (Number.isFinite(latValue) && Number.isFinite(lonValue)) {
        setCategory(categoryParam || "pharmacy");
        setTitle(labelParam ? `${labelParam} report` : "Selected location report");
        setLatitude(String(latValue));
        setLongitude(String(lonValue));
        setQueryLoaded(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryLoaded, savedLocations, searchParams]);

  const lat = Number(latitude);
  const lon = Number(longitude);
  const hasCoordinates = latitude.trim().length > 0 && longitude.trim().length > 0;
  const canCreate = hasCoordinates && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -3 && lat <= -1 && lon >= 28 && lon <= 31.5;

  async function createReport() {
    if (!canCreate) { setMessage("Choose a saved location or enter valid Kigali coordinates before creating a report."); return; }
    setLoading(true); setMessage(null);
    const saved_location_id = selectedSavedId && /^\d+$/.test(selectedSavedId) ? Number(selectedSavedId) : undefined;
    try {
      const response = await generateReport({ title, business_category: category, latitude: lat, longitude: lon, saved_location_id });
      const report = response?.report || response || {};
      setResult({
        ...report,
        report_id: response?.report_id ?? report.report_id,
        opportunity_score: safeNumber(report.overall_score ?? report.opportunity_score, 0),
        confidence_score: safeNumber(report.confidence ?? report.confidence_score, 0),
      });
      setMessage("Report created. Review the preview below, then download the PDF when ready.");
    } catch { setMessage("Report generation could not be completed for this location. Check the location and try again."); }
    finally { setLoading(false); }
  }

  async function downloadPdf() {
    if (!canCreate) { setMessage("Choose a saved location or enter valid Kigali coordinates before downloading a report."); return; }
    setLoading(true); setMessage(null);
    const saved_location_id = selectedSavedId && /^\d+$/.test(selectedSavedId) ? Number(selectedSavedId) : undefined;
    try {
      const blob = await downloadReportPdf({ title, business_category: category, latitude: lat, longitude: lon, saved_location_id });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "bizintel-report"}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setMessage("PDF downloaded.");
    } catch { setMessage("The PDF could not be downloaded. Create the report again, then retry."); }
    finally { setLoading(false); }
  }

  const score = result ? safeNumber(result?.overall_score ?? result?.opportunity_score, 0) : 0;
  const confidence = result ? safeNumber(result?.confidence ?? result?.confidence_score, 0) : 0;
  const summary = result?.executive_summary || result?.summary || "Choose a saved location or enter coordinates, then generate a report to preview the assessment.";
  const factors = Array.isArray(result?.factors) ? result.factors : [];
  const strengths = Array.isArray(result?.strengths) ? result.strengths : [];
  const risks = Array.isArray(result?.risks) ? result.risks : [];
  const checklist = Array.isArray(result?.field_visit_checklist) ? result.field_visit_checklist : [];
  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow="Reports" title="Turn a location check into a decision report" text="Generate a report from a saved location, selected map area, Scout pin or manually entered coordinates." action={<button onClick={createReport} disabled={!canCreate || loading} className="btn-primary"><FileText size={16}/> {loading ? "Creating" : "Create report"}</button>} />
      <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="display-font text-2xl font-black">Report setup</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Choose a saved location or enter coordinates for a candidate rental space.</p>
          <div className="mt-4 space-y-3">
            <label className="grid gap-2 text-sm font-bold text-slate-600">Saved location
              <select className="input-modern" value={selectedSavedId} onChange={(e) => { const match = savedLocations.find((item) => item.id === e.target.value); if (match) applySavedLocation(match); else setSelectedSavedId(""); }}>
                <option value="">Select saved location</option>
                {savedLocations.map((item) => <option key={item.id} value={item.id}>{item.label} — {categoryLabel(item.business_category)}</option>)}
              </select>
            </label>
            <input className="input-modern" value={title} onChange={(e)=>setTitle(e.target.value)} />
            <select className="input-modern" value={category} onChange={(e)=>setCategory(e.target.value)}>{BUSINESS_CATEGORIES.map((item)=><option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <div className="form-grid-2"><input className="input-modern" placeholder="Latitude" value={latitude} onChange={(e)=>{ setLatitude(e.target.value); setSelectedSavedId(""); }}/><input className="input-modern" placeholder="Longitude" value={longitude} onChange={(e)=>{ setLongitude(e.target.value); setSelectedSavedId(""); }}/></div>
            <button onClick={createReport} disabled={!canCreate || loading} className="btn-primary w-full"><FileText size={16}/> {loading ? "Creating" : "Create report"}</button>
            <button onClick={downloadPdf} disabled={!canCreate || loading || !result} className="btn-secondary w-full"><Download size={16}/> Download PDF</button>
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</p>}
          </div>
        </aside>
        <section className="report-document overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <header className="report-letterhead flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <BrandMark compact />
            <div className="text-right text-xs font-bold text-slate-500">
              <div>Preview generated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
              {result?.report_id != null && <div className="mt-0.5">Report reference #{result.report_id}</div>}
            </div>
          </header>
          <div className="p-6">
            <div className="kicker text-[var(--brand)]">Report preview</div><h2 className="mt-2 display-font text-3xl font-black">{result?.title || title}</h2><p className="mt-3 max-w-4xl leading-7 text-slate-600">{summary}</p>
            {result ? <>
              <div className="mt-6 grid gap-4 md:grid-cols-3"><StatusCard title="Opportunity" value={score} text="Overall business fit signal"/><StatusCard title="Confidence" value={confidence} text="Data coverage and reliability"/><StatusCard title="Category" value={categoryLabel(category)} text="Business type being assessed"/></div>
              {factors.length > 0 && <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">Score breakdown</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{factors.map((factor: AnyObj)=><div key={factor.key || factor.label} className="rounded-2xl bg-white p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm text-slate-900">{factor.label}</strong><span className="font-black text-emerald-700">{Math.round(safeNumber(factor.score))}</span></div><Progress value={safeNumber(factor.score)} tone={factor.key === "competition" ? "amber" : "green"}/></div>)}</div></div>}
              <div className="mt-5 grid gap-4 md:grid-cols-2"><InsightBlock title="Recommended field checks" text="Confirm rent, visibility, foot traffic, safety, informal competitors and space availability" icon={ClipboardCheck}/><InsightBlock title="Decision use" text="Use this report to compare alternatives and discuss risk before paying a deposit" icon={FileText}/></div>
              {(strengths.length > 0 || risks.length > 0) && <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5"><h3 className="font-black text-slate-950">Strengths</h3><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">{(strengths.length ? strengths : ["This location has usable spatial signals for shortlisting."]).map((item: string)=><li key={item}>• {item}</li>)}</ul></div><div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5"><h3 className="font-black text-slate-950">Risks to verify</h3><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">{(risks.length ? risks : ["Verify rent, informal competition and frontage before committing."]).map((item: string)=><li key={item}>• {item}</li>)}</ul></div></div>}
              {checklist.length > 0 && <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-950">Field visit checklist</h3><div className="mt-3 grid gap-2">{checklist.map((item: string)=><div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700"/> {item}</div>)}</div></div>}
              <p className="report-disclaimer mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">This report supports decision making. It is not a guarantee of revenue, profit, rent availability, regulatory approval or business success. Use it to shortlist, compare and prepare field checks before committing.</p>
            </> : <EmptyDataPanel title="No report generated yet" text="Choose a saved location or enter coordinates to create a report." />}
          </div>
        </section>
      </div>
    </main>
  );
}

export function SavedPage() {
  const { data } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const { data: alerts } = useAsyncData(() => getAlerts(), [], { alerts: [] });
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const locations = (data?.locations || []).filter((item: AnyObj) => !removedIds.includes(String(item.id)));
  const alertList = alerts?.alerts || [];

  async function removeLocation(item: AnyObj) {
    const normalised = normaliseSavedLocation(item);
    if (!normalised.id || !/^\d+$/.test(normalised.id)) {
      setMessage("This location cannot be deleted because it is missing a valid saved ID.");
      return;
    }
    const confirmed = window.confirm(`Delete ${normalised.label} from saved locations?`);
    if (!confirmed) return;
    setDeletingId(normalised.id);
    setMessage(null);
    try {
      await deleteSavedLocation(normalised.id);
      setRemovedIds((prev) => [...prev, normalised.id]);
      setMessage(`${normalised.label} was removed from saved locations.`);
    } catch {
      setMessage("Saved location could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow="Saved" title="Keep track of candidate places" text="Only locations you save from the map or Scout Mode appear here." action={<Link href="/map" className="btn-primary"><Bookmark size={16}/> Save from map</Link>} />
      {message && <p className="mb-5 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">Shortlisted locations</h2></div>{locations.length ? <div className="divide-y divide-slate-200">{locations.map((item: AnyObj) => {
          const saved = normaliseSavedLocation(item);
          return <div key={item.id || item.label} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"><div><h3 className="font-black text-slate-950">{saved.label}</h3><p className="mt-1 text-sm text-slate-500">{categoryLabel(saved.business_category || "pharmacy")} · updated {saved.updated_at || "recently"}</p><p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Next: {item.next_action || "Compare with another candidate before committing"}</p></div><div className="flex flex-wrap items-center justify-end gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">{saved.latest_opportunity_score != null ? Math.round(safeNumber(saved.latest_opportunity_score)) : "--"}</span><Link href={`/reports?${locationQuery(saved)}`} className="btn-secondary px-4 py-2 text-sm">Report</Link><Link href={`/compare?${locationQuery(saved)}`} className="btn-secondary px-4 py-2 text-sm">Compare</Link><button type="button" onClick={() => removeLocation(item)} disabled={deletingId === saved.id} className="rounded-full border border-red-100 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} className="mr-1 inline"/> {deletingId === saved.id ? "Deleting" : "Delete"}</button></div></div>;
        })}</div> : <div className="p-5"><EmptyDataPanel title="No saved locations yet" text="Open the map, select an opportunity area or drop a Scout pin, then save it here." /></div>}</section>
        <aside className="space-y-5"><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Watchlist signals</h2>{alertList.length ? <div className="mt-4 grid gap-3">{alertList.map((alert: AnyObj)=><div key={alert.id || alert.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="font-black text-slate-950">{alert.title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{alert.message || alert.body}</p></div>)}</div> : <div className="mt-4"><EmptyDataPanel title="No active alerts" text="Alerts will appear when monitored locations produce new signals." /></div>}</section><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Create monitor</h2><p className="mt-2 text-sm leading-6 text-slate-600">Save locations from the map to prepare them for monitoring.</p><Link href="/map" className="btn-primary mt-4 w-full"><Bell size={16}/> Go to map</Link></section></aside>
      </div>
    </main>
  );
}

export function WatchlistPage() { return <SavedPage />; }

export function NotificationsPage() {
  const { data } = useAsyncData(() => getNotifications(), [], { notifications: [] });
  const notifications = data?.notifications || [];
  return <main className="app-container py-8 lg:py-12"><PageHeader eyebrow="Notifications" title="Recent location signals" text="Alerts appear when monitored locations have new signals." />{notifications.length ? <div className="grid gap-3">{notifications.map((item: AnyObj)=><div key={item.id || item.title} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{item.message || item.body}</p></div>)}</div> : <EmptyDataPanel title="No notifications yet" text="Save locations and enable monitoring later to receive real alerts." />}</main>;
}

export function FieldValidationPageModern() {
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({ business_category: "pharmacy", latitude: "", longitude: "", foot_traffic: "", visible_competitors: "", notes: "" });
  async function submit() { try { await submitValidationPoint({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), foot_traffic: Number(form.foot_traffic), visible_competitors: Number(form.visible_competitors) }); setStatus("Field check saved. It can be used to validate map signals and improve future confidence"); } catch { setStatus("Could not save field check. Confirm the service is available."); } }
  return <main className="app-container py-8 lg:py-12"><PageHeader eyebrow="Field checks" title="Verify what public data cannot see" text="Use field checks to validate informal competitors, visibility, foot traffic, rent signals and real business activity" /><div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]"><aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Submit field check</h2><div className="mt-4 space-y-3"><select className="input-modern" value={form.business_category} onChange={(e)=>setForm({...form,business_category:e.target.value})}>{BUSINESS_CATEGORIES.map((item)=><option key={item.key} value={item.key}>{item.label}</option>)}</select><input className="input-modern" value={form.latitude} onChange={(e)=>setForm({...form,latitude:e.target.value})}/><input className="input-modern" value={form.longitude} onChange={(e)=>setForm({...form,longitude:e.target.value})}/><div className="grid grid-cols-2 gap-3"><input className="input-modern" value={form.foot_traffic} onChange={(e)=>setForm({...form,foot_traffic:e.target.value})}/><input className="input-modern" value={form.visible_competitors} onChange={(e)=>setForm({...form,visible_competitors:e.target.value})}/></div><textarea className="input-modern min-h-[130px]" value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} placeholder="Notes from the field"/><button onClick={submit} className="btn-primary w-full"><ClipboardCheck size={16}/> Submit field check</button>{status && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{status}</p>}</div></aside><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="display-font text-3xl font-black">What to verify</h2><div className="mt-6 grid gap-3">{["Visible informal competitors", "Actual foot traffic at different times", "Shop frontage, signage and visibility", "Rent availability and condition", "Safety, access and parking", "Whether the business category fits local behaviour"].map((item)=><div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold"><CheckCircle2 className="size-4 text-emerald-700"/>{item}</div>)}</div></section></div></main>;
}

export function ProfilePage() {
  return (
    <main className="app-container py-12">
      <PageHeader eyebrow="Profile" title="Your workspace settings" text="Manage account details, saved preferences and notification settings" />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Preferences and notification settings are coming soon. Your account is managed from the sign-in menu in the header.</p>
      </div>
    </main>
  );
}
