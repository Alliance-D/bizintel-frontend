"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Download, FileText } from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { BrandMark } from "@/components/layout/BrandMark";
import { generateReport, getSavedLocations, downloadReportPdf } from "@/lib/platform-api";
import {
  type AnyObj,
  PageHeader,
  Progress,
  StatusCard,
  InsightBlock,
  useAsyncData,
  EmptyDataPanel,
  normaliseSavedLocation,
  safeNumber,
} from "@/components/platform/pageHelpers";
import { useLocale } from "@/lib/locale";

export function ReportsPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const { data: savedData } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const savedLocations = useMemo(() => (savedData?.locations || []).map(normaliseSavedLocation).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)), [savedData]);
  const [category, setCategory] = useState("pharmacy");
  // Left empty rather than pre-filled with t("default_report_title"): a
  // useState initializer only runs once at mount, so it would capture
  // whatever locale happened to be active before the client hydrated from
  // localStorage, and never update again if the user later toggled
  // language. The translated default is applied as a placeholder/fallback
  // instead, which stays live.
  const [title, setTitle] = useState("");
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
    setTitle(`${item.label} ${t("report_suffix")}`);
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
        setTitle(labelParam ? `${labelParam} ${t("report_suffix")}` : t("selected_location_report"));
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
    if (!canCreate) { setMessage(t("choose_location_before_report")); return; }
    setLoading(true); setMessage(null);
    const saved_location_id = selectedSavedId && /^\d+$/.test(selectedSavedId) ? Number(selectedSavedId) : undefined;
    const effectiveTitle = title.trim() || t("default_report_title");
    try {
      const response = await generateReport({ title: effectiveTitle, business_category: category, latitude: lat, longitude: lon, saved_location_id });
      const report = response?.report || response || {};
      setResult({
        ...report,
        report_id: response?.report_id ?? report.report_id,
        opportunity_score: safeNumber(report.overall_score ?? report.opportunity_score, 0),
        confidence_score: safeNumber(report.confidence ?? report.confidence_score, 0),
      });
      setMessage(t("report_created"));
    } catch { setMessage(t("report_generation_failed")); }
    finally { setLoading(false); }
  }

  async function downloadPdf() {
    if (!canCreate) { setMessage(t("choose_location_before_download")); return; }
    setLoading(true); setMessage(null);
    const saved_location_id = selectedSavedId && /^\d+$/.test(selectedSavedId) ? Number(selectedSavedId) : undefined;
    const effectiveTitle = title.trim() || t("default_report_title");
    try {
      const blob = await downloadReportPdf({ title: effectiveTitle, business_category: category, latitude: lat, longitude: lon, saved_location_id });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${effectiveTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "bizintel-report"}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setMessage(t("pdf_downloaded"));
    } catch { setMessage(t("pdf_download_failed")); }
    finally { setLoading(false); }
  }

  const score = result ? safeNumber(result?.overall_score ?? result?.opportunity_score, 0) : 0;
  const confidence = result ? safeNumber(result?.confidence ?? result?.confidence_score, 0) : 0;
  const summary = result?.executive_summary || result?.summary || t("default_report_summary");
  const factors = Array.isArray(result?.factors) ? result.factors : [];
  const strengths = Array.isArray(result?.strengths) ? result.strengths : [];
  const risks = Array.isArray(result?.risks) ? result.risks : [];
  const checklist = Array.isArray(result?.field_visit_checklist) ? result.field_visit_checklist : [];
  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow={t("reports_eyebrow")} title={t("reports_title")} text={t("reports_text")} action={<button onClick={createReport} disabled={!canCreate || loading} className="btn-primary"><FileText size={16}/> {loading ? t("creating") : t("create_report_button")}</button>} />
      <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="display-font text-2xl font-black">{t("report_setup")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("report_setup_text")}</p>
          <div className="mt-4 space-y-3">
            <label className="grid gap-2 text-sm font-bold text-slate-600">{t("saved_locations")}
              <select className="input-modern" value={selectedSavedId} onChange={(e) => { const match = savedLocations.find((item) => item.id === e.target.value); if (match) applySavedLocation(match); else setSelectedSavedId(""); }}>
                <option value="">{t("select_saved_location")}</option>
                {savedLocations.map((item) => <option key={item.id} value={item.id}>{item.label} — {categoryLabel(item.business_category)}</option>)}
              </select>
            </label>
            <input className="input-modern" placeholder={t("default_report_title")} value={title} onChange={(e)=>setTitle(e.target.value)} />
            <select className="input-modern" value={category} onChange={(e)=>setCategory(e.target.value)}>{BUSINESS_CATEGORIES.map((item)=><option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <div className="form-grid-2"><input className="input-modern" placeholder={t("latitude")} value={latitude} onChange={(e)=>{ setLatitude(e.target.value); setSelectedSavedId(""); }}/><input className="input-modern" placeholder={t("longitude")} value={longitude} onChange={(e)=>{ setLongitude(e.target.value); setSelectedSavedId(""); }}/></div>
            <button onClick={createReport} disabled={!canCreate || loading} className="btn-primary w-full"><FileText size={16}/> {loading ? t("creating") : t("create_report_button")}</button>
            <button onClick={downloadPdf} disabled={!canCreate || loading || !result} className="btn-secondary w-full"><Download size={16}/> {t("download_pdf")}</button>
            {message && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</p>}
          </div>
        </aside>
        <section className="report-document overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <header className="report-letterhead flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <BrandMark compact />
            <div className="text-right text-xs font-bold text-slate-500">
              <div>{t("preview_generated")} {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
              {result?.report_id != null && <div className="mt-0.5">{t("report_reference")} #{result.report_id}</div>}
            </div>
          </header>
          <div className="p-6">
            <div className="kicker text-[var(--brand)]">{t("report_preview")}</div><h2 className="mt-2 display-font text-3xl font-black">{result?.title || title || t("default_report_title")}</h2><p className="mt-3 max-w-4xl leading-7 text-slate-600">{summary}</p>
            {result ? <>
              <div className="mt-6 grid gap-4 md:grid-cols-3"><StatusCard title={t("opportunity_label")} value={score} text={t("overall_fit_signal")}/><StatusCard title={t("confidence_label")} value={confidence} text={t("data_coverage_reliability")}/><StatusCard title={t("category_label")} value={categoryLabel(category)} text={t("business_type_assessed")}/></div>
              {factors.length > 0 && <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">{t("score_breakdown")}</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{factors.map((factor: AnyObj)=><div key={factor.key || factor.label} className="rounded-2xl bg-white p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm text-slate-900">{factor.label}</strong><span className="font-black text-emerald-700">{Math.round(safeNumber(factor.score))}</span></div><Progress value={safeNumber(factor.score)} tone={factor.key === "competition" ? "amber" : "green"}/></div>)}</div></div>}
              <div className="mt-5 grid gap-4 md:grid-cols-2"><InsightBlock title={t("recommended_field_checks")} text={t("recommended_field_checks_text")} icon={ClipboardCheck}/><InsightBlock title={t("decision_use")} text={t("decision_use_text")} icon={FileText}/></div>
              {(strengths.length > 0 || risks.length > 0) && <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5"><h3 className="font-black text-slate-950">{t("strengths_label")}</h3><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">{(strengths.length ? strengths : [t("default_strength")]).map((item: string)=><li key={item}>• {item}</li>)}</ul></div><div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5"><h3 className="font-black text-slate-950">{t("risks_to_verify")}</h3><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">{(risks.length ? risks : [t("default_risk")]).map((item: string)=><li key={item}>• {item}</li>)}</ul></div></div>}
              {checklist.length > 0 && <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-950">{t("field_visit_checklist")}</h3><div className="mt-3 grid gap-2">{checklist.map((item: string)=><div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700"/> {item}</div>)}</div></div>}
              <p className="report-disclaimer mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{t("report_disclaimer")}</p>
            </> : <EmptyDataPanel title={t("no_report_yet")} text={t("no_report_yet_text")} />}
          </div>
        </section>
      </div>
    </main>
  );
}
