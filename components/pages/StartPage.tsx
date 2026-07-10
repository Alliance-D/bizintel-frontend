"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import { buildUnifiedReport, getDistricts, getSectors, getCells, type UnifiedReportFormLocation } from "@/lib/platform-api";
import { PageHeader } from "@/components/platform/pageHelpers";
import { useLocale } from "@/lib/locale";

type FormLocation =
  | { mode: "point"; label: string; latitude: string; longitude: string }
  | { mode: "area"; label: string; district: string; sector: string; cell: string };

const MAX_LOCATIONS = 4;

function emptyPoint(): FormLocation {
  return { mode: "point", label: "", latitude: "", longitude: "" };
}

export function StartPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState("pharmacy");
  const [locations, setLocations] = useState<FormLocation[]>([emptyPoint()]);
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [sectorsByDistrict, setSectorsByDistrict] = useState<Record<string, string[]>>({});
  const [cellsByKey, setCellsByKey] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryLoaded, setQueryLoaded] = useState(false);

  useEffect(() => {
    getDistricts().then((res) => setDistricts(res.districts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (queryLoaded) return;
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const categoryParam = searchParams.get("category");
    const labelParam = searchParams.get("label");
    if (latParam && lonParam) {
      const latValue = Number(latParam);
      const lonValue = Number(lonParam);
      if (Number.isFinite(latValue) && Number.isFinite(lonValue)) {
        setCategory(categoryParam || "pharmacy");
        setLocations([{ mode: "point", label: labelParam || "", latitude: String(latValue), longitude: String(lonValue) }]);
      }
    }
    setQueryLoaded(true);
  }, [queryLoaded, searchParams]);

  async function loadSectors(district: string) {
    if (!district || sectorsByDistrict[district]) return;
    try {
      const res = await getSectors(district);
      setSectorsByDistrict((prev) => ({ ...prev, [district]: res.sectors || [] }));
    } catch { /* leave empty, picker just shows no sectors */ }
  }

  async function loadCells(district: string, sector: string) {
    const key = `${district}::${sector}`;
    if (!district || !sector || cellsByKey[key]) return;
    try {
      const res = await getCells(district, sector);
      setCellsByKey((prev) => ({ ...prev, [key]: res.cells || [] }));
    } catch { /* leave empty */ }
  }

  function updateLocation(index: number, next: FormLocation) {
    setLocations((prev) => prev.map((loc, i) => (i === index ? next : loc)));
  }

  function addLocation() {
    if (locations.length >= MAX_LOCATIONS) return;
    setLocations((prev) => [...prev, emptyPoint()]);
  }

  function removeLocation(index: number) {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  }

  function isLocationValid(loc: FormLocation): boolean {
    if (loc.mode === "point") {
      const lat = Number(loc.latitude);
      const lon = Number(loc.longitude);
      return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -3 && lat <= -1 && lon >= 28 && lon <= 31.5;
    }
    return loc.district.trim().length > 0;
  }

  const validLocations = locations.filter(isLocationValid);
  const canSubmit = validLocations.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) { setError(t("start_need_location")); return; }
    setSubmitting(true);
    setError(null);
    try {
      const payloadLocations: UnifiedReportFormLocation[] = validLocations.map((loc) =>
        loc.mode === "point"
          ? { mode: "point", latitude: Number(loc.latitude), longitude: Number(loc.longitude), label: loc.label || undefined }
          : { mode: "area", district: loc.district, sector: loc.sector || undefined, cell: loc.cell || undefined, label: loc.label || undefined }
      );
      const response = await buildUnifiedReport({
        business_category: category,
        locations: payloadLocations,
        budget: budget.trim() || undefined,
        notes: notes.trim() || undefined,
        locale,
      });
      if (response.report_id != null) {
        router.push(`/report/${response.report_id}`);
      } else {
        setError(t("start_error"));
      }
    } catch {
      setError(t("start_error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow={t("start_eyebrow")} title={t("start_title")} text={t("start_subtitle")} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <label className="grid gap-2 text-sm font-bold text-slate-600">
            {t("start_category_label")}
            <select className="input-modern" value={category} onChange={(e) => setCategory(e.target.value)}>
              {BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>

          <div className="mt-6 space-y-5">
            {locations.map((loc, index) => (
              <div key={index} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-black text-slate-950">
                    <MapPin size={16} className="text-[var(--brand)]" />
                    {t("start_location_n").replace("{n}", String(index + 1))}
                  </h3>
                  {locations.length > 1 && (
                    <button type="button" onClick={() => removeLocation(index)} className="btn-secondary !px-3 !py-1.5 text-xs">
                      <Trash2 size={14} /> {t("start_remove_location")}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateLocation(index, loc.mode === "point" ? loc : { mode: "point", label: loc.label, latitude: "", longitude: "" })}
                    className={loc.mode === "point" ? "btn-primary !px-4 !py-2 text-xs" : "btn-secondary !px-4 !py-2 text-xs"}
                  >
                    {t("start_mode_point")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLocation(index, loc.mode === "area" ? loc : { mode: "area", label: loc.label, district: "", sector: "", cell: "" })}
                    className={loc.mode === "area" ? "btn-primary !px-4 !py-2 text-xs" : "btn-secondary !px-4 !py-2 text-xs"}
                  >
                    {t("start_mode_area")}
                  </button>
                </div>

                {loc.mode === "point" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500">{t("start_point_hint")}</p>
                    <div className="form-grid-2">
                      <input className="input-modern" placeholder={t("start_latitude_label")} value={loc.latitude} onChange={(e) => updateLocation(index, { ...loc, latitude: e.target.value })} />
                      <input className="input-modern" placeholder={t("start_longitude_label")} value={loc.longitude} onChange={(e) => updateLocation(index, { ...loc, longitude: e.target.value })} />
                    </div>
                    <input className="input-modern" placeholder={t("start_label_placeholder")} value={loc.label} onChange={(e) => updateLocation(index, { ...loc, label: e.target.value })} />
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500">{t("start_area_hint")}</p>
                    <select
                      className="input-modern"
                      value={loc.district}
                      onChange={(e) => { const district = e.target.value; updateLocation(index, { ...loc, district, sector: "", cell: "" }); loadSectors(district); }}
                    >
                      <option value="">{t("start_district_placeholder")}</option>
                      {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      className="input-modern"
                      value={loc.sector}
                      disabled={!loc.district}
                      onChange={(e) => { const sector = e.target.value; updateLocation(index, { ...loc, sector, cell: "" }); loadCells(loc.district, sector); }}
                    >
                      <option value="">{t("start_sector_all")}</option>
                      {(sectorsByDistrict[loc.district] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      className="input-modern"
                      value={loc.cell}
                      disabled={!loc.sector}
                      onChange={(e) => updateLocation(index, { ...loc, cell: e.target.value })}
                    >
                      <option value="">{t("start_cell_all")}</option>
                      {(cellsByKey[`${loc.district}::${loc.sector}`] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="input-modern" placeholder={t("start_label_placeholder")} value={loc.label} onChange={(e) => updateLocation(index, { ...loc, label: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {locations.length < MAX_LOCATIONS ? (
            <button type="button" onClick={addLocation} className="btn-secondary mt-4 w-full">
              <Plus size={16} /> {t("start_add_location")}
            </button>
          ) : (
            <p className="mt-4 text-xs font-bold text-slate-500">{t("start_max_locations_reached")}</p>
          )}
        </section>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <label className="grid gap-2 text-sm font-bold text-slate-600">
            {t("start_budget_label")}
            <input className="input-modern" placeholder={t("start_budget_placeholder")} value={budget} onChange={(e) => setBudget(e.target.value)} />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
            {t("start_notes_label")}
            <textarea className="input-modern min-h-[96px]" placeholder={t("start_notes_placeholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="btn-primary mt-6 w-full">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> {t("start_submitting")}</> : t("start_submit")}
          </button>
          {error && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{error}</p>}
        </aside>
      </div>
    </main>
  );
}
