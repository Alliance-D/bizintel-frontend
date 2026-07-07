"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useLocale } from "@/lib/locale";

export function CompareLocationsPage() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const { data: savedData } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const savedLocations = useMemo(() => (savedData?.locations || []).map(normaliseSavedLocation).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [savedData]);
  const [category, setCategory] = useState("pharmacy");
  const [locations, setLocations] = useState<Array<{ savedId?: string; label: string; latitude: string; longitude: string }>>([]);
  const lastHandledQueryKey = useRef<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addSavedLocation(item: ReturnType<typeof normaliseSavedLocation>) {
    setCategory(item.business_category || category);
    setLocations((prev) => {
      if (prev.some((candidate) => candidate.savedId === item.id)) return prev;
      return [...prev, { savedId: item.id, label: item.label, latitude: String(item.latitude), longitude: String(item.longitude) }];
    });
    setMessage(`${item.label} ${t("added_to_comparison")}`);
  }

  useEffect(() => {
    const savedId = searchParams.get("saved");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const categoryParam = searchParams.get("category");
    const labelParam = searchParams.get("label");

    // Each visit to /compare?... (e.g. clicking "Compare" again from a new
    // assessed location) should append a candidate, not replace the list -
    // keyed so the same URL never gets added twice, but a new lat/lon or
    // saved id after it does.
    const queryKey = savedId ? `saved:${savedId}` : (latParam && lonParam) ? `coord:${latParam}:${lonParam}` : null;
    if (!queryKey || queryKey === lastHandledQueryKey.current) return;

    if (categoryParam) setCategory(categoryParam);

    if (savedId) {
      if (!savedLocations.length) return; // wait for saved locations to load before giving up
      const match = savedLocations.find((item) => item.id === savedId);
      if (match) addSavedLocation(match);
      lastHandledQueryKey.current = queryKey;
      return;
    }

    if (latParam && lonParam) {
      const latitude = Number(latParam);
      const longitude = Number(lonParam);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setLocations((prev) => prev.some((item) => item.latitude === String(latitude) && item.longitude === String(longitude))
          ? prev
          : [...prev, { label: labelParam || t("selected_location"), latitude: String(latitude), longitude: String(longitude) }]);
        lastHandledQueryKey.current = queryKey;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLocations, searchParams]);

  const validLocations = locations
    .map((item, index) => ({ label: item.label || `Candidate ${index + 1}`, latitude: Number(item.latitude), longitude: Number(item.longitude) }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

  async function runCompare() {
    if (validLocations.length < 2) { setMessage(t("add_two_candidates")); return; }
    setLoading(true); setMessage(null);
    try { setResult(await compareLocations({ business_category: category, locations: validLocations, locale })); }
    catch { setResult(null); setMessage(t("comparison_failed")); }
    finally { setLoading(false); }
  }

  const rows = normaliseComparisonRows(result).filter(Boolean);
  const best = rows[0];
  const safest = rows.length ? [...rows].sort((a, b) => (a.competition_pressure - b.competition_pressure) || (b.confidence_score - a.confidence_score))[0] : null;
  const growth = rows.length ? [...rows].sort((a, b) => (b.demand_score + b.access_score) - (a.demand_score + a.access_score))[0] : null;

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow={t("compare_eyebrow")} title={t("compare_title")} text={t("compare_text")} action={<Link href="/map" className="btn-primary"><MapPin size={16} /> {t("add_from_map")}</Link>} />
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><GitCompare className="text-emerald-700" /><h2 className="display-font text-2xl font-black">{t("comparison_setup")}</h2></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{t("comparison_setup_text")}</p>
          <div className="mt-5 space-y-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-modern font-bold">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-slate-900">{t("saved_locations")}</strong>
                <span className="text-xs font-bold text-slate-500">{savedLocations.length} {t("available")}</span>
              </div>
              {savedLocations.length ? <div className="mt-3 grid max-h-60 gap-2 overflow-auto pr-1">
                {savedLocations.map((item) => {
                  const added = locations.some((candidate) => candidate.savedId === item.id);
                  return <button key={item.id} type="button" onClick={() => addSavedLocation(item)} className={`rounded-xl border px-3 py-2 text-left text-sm ${added ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>
                    <span className="block font-black">{item.label}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{categoryLabel(item.business_category)} · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} {added ? `· ${t("added_badge")}` : ""}</span>
                  </button>;
                })}
              </div> : <p className="mt-3 text-sm leading-6 text-slate-500">{t("no_saved_locations")}</p>}
            </div>

            {locations.map((location, index) => <div key={`${location.savedId || "manual"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between gap-3"><strong className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("candidate")} {index + 1}</strong><button type="button" onClick={() => setLocations((prev) => prev.filter((_, i) => i !== index))} className="text-xs font-black text-slate-500 hover:text-red-600">{t("remove")}</button></div><input className="input-modern" placeholder={t("location_label")} value={location.label} onChange={(e) => setLocations((prev) => prev.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} /><div className="form-grid-2 mt-2"><input className="input-modern" placeholder={t("latitude")} value={location.latitude} onChange={(e) => setLocations((prev) => prev.map((item, i) => i === index ? { ...item, latitude: e.target.value } : item))} /><input className="input-modern" placeholder={t("longitude")} value={location.longitude} onChange={(e) => setLocations((prev) => prev.map((item, i) => i === index ? { ...item, longitude: e.target.value } : item))} /></div></div>)}
            <button onClick={() => setLocations((prev) => [...prev, { label: "", latitude: "", longitude: "" }])} className="btn-secondary w-full"><Plus size={16} /> {t("add_candidate_manually")}</button>
            <button onClick={runCompare} disabled={loading || validLocations.length < 2} className="btn-primary w-full">{loading ? t("comparing") : t("compare_locations_button")}</button>
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</p>}
          </div>
        </aside>
        <section className="space-y-5">
          {rows.length ? <>
            <div className="grid gap-4 md:grid-cols-3">
              <InsightBlock title={`${t("best_overall")}: ${best?.label}`} text={t("best_overall_text")} icon={CheckCircle2} />
              <InsightBlock title={`${t("lower_risk")}: ${safest?.label}`} text={t("lower_risk_text")} icon={ShieldCheck} />
              <InsightBlock title={`${t("growth_option")}: ${growth?.label}`} text={t("growth_option_text")} icon={Sparkles} />
            </div>
            {best && <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><div className="kicker text-emerald-700">{t("recommended_shortlist_leader")}</div><h2 className="mt-2 text-2xl font-black text-slate-950">{best.label}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{t("shortlist_leader_text")}</p><Link href={`/reports?${candidateReportQuery(best, category)}`} className="btn-primary mt-4 inline-flex"><FileText size={16}/> {t("create_report_from_option")}</Link></div>}
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500"><tr><th className="p-4">{t("col_location")}</th><th>{t("col_opportunity")}</th><th>{t("col_demand")}</th><th>{t("col_access")}</th><th>{t("col_competition")}</th><th>{t("col_confidence")}</th><th>{t("col_action")}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index)=><tr key={`${row.label}-${row.latitude}-${row.longitude}-${index}`}><td className="p-4 font-black text-slate-950">{row.label}<p className="mt-1 text-xs font-bold text-slate-500">{row.recommendation}</p></td><td className="font-black">{Math.round(row.opportunity_score)}</td><td>{Math.round(row.demand_score)}</td><td>{Math.round(row.access_score)}</td><td>{Math.round(row.competition_pressure)}</td><td>{Math.round(row.confidence_score)}</td><td><Link href={`/reports?${candidateReportQuery(row, category)}`} className="text-sm font-black text-emerald-700 hover:text-emerald-900">{t("report")}</Link></td></tr>)}</tbody></table></div>
          </> : <EmptyDataPanel title={t("no_comparison_results")} text={t("no_comparison_results_text")} />}
        </section>
      </div>
    </main>
  );
}
