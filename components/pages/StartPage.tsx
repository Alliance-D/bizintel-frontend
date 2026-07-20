"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronDown, Loader2, MapPin, Plus, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { buildUnifiedReport, getCells, getDistricts, getSectors, type UnifiedReportFormLocation } from "@/lib/platform-api";
import { useLocale } from "@/lib/locale";

type FormLocation =
  | { kind: "area"; district: string; sector: string; cell: string; label: string }
  | { kind: "point"; latitude: string; longitude: string; label: string };

const MAX_LOCATIONS = 4;
const newArea = (): FormLocation => ({ kind: "area", district: "", sector: "", cell: "", label: "" });

function Select({ label, value, disabled, placeholder, options, onChange }: {
  label: string; value: string; disabled?: boolean; placeholder: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="sel-field">
      <label>{label}</label>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="chev" size={16} />
    </div>
  );
}

export function StartPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState("pharmacy");
  const [locations, setLocations] = useState<FormLocation[]>([newArea()]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [sectorsBy, setSectorsBy] = useState<Record<string, string[]>>({});
  const [cellsBy, setCellsBy] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => { getDistricts().then((r) => setDistricts(r.districts || [])).catch(() => {}); }, []);

  // Preserve deep links from the old /compare, /reports links (lat/lon/category).
  useEffect(() => {
    if (seeded) return;
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
    if (lat && lon && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
      setLocations([{ kind: "point", latitude: lat, longitude: lon, label: searchParams.get("label") || "" }]);
    }
    setSeeded(true);
  }, [seeded, searchParams]);

  async function loadSectors(d: string) {
    if (!d || sectorsBy[d]) return;
    try { const r = await getSectors(d); setSectorsBy((p) => ({ ...p, [d]: r.sectors || [] })); } catch {}
  }
  async function loadCells(d: string, s: string) {
    const key = `${d}::${s}`;
    if (!d || !s || cellsBy[key]) return;
    try { const r = await getCells(d, s); setCellsBy((p) => ({ ...p, [key]: r.cells || [] })); } catch {}
  }
  const update = (i: number, next: FormLocation) => setLocations((p) => p.map((l, idx) => (idx === i ? next : l)));

  function valid(loc: FormLocation) {
    if (loc.kind === "area") return loc.district.trim().length > 0;
    const la = Number(loc.latitude), lo = Number(loc.longitude);
    return Number.isFinite(la) && Number.isFinite(lo) && la >= -3 && la <= -1 && lo >= 28 && lo <= 31.5;
  }
  const validLocations = locations.filter(valid);

  async function submit() {
    if (!validLocations.length) { setError(t("start_need_location")); return; }
    setSubmitting(true); setError(null);
    try {
      const payload: UnifiedReportFormLocation[] = validLocations.map((loc) =>
        loc.kind === "point"
          ? { mode: "point", latitude: Number(loc.latitude), longitude: Number(loc.longitude), label: loc.label || undefined }
          : { mode: "area", district: loc.district, sector: loc.sector || undefined, cell: loc.cell || undefined, label: loc.label || undefined });
      const res = await buildUnifiedReport({ business_category: category, locations: payload, locale });
      if (res.report_token != null) router.push(`/report/${res.report_token}`);
      else setError(t("start_error"));
    } catch { setError(t("start_error")); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="app-container py-10 lg:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        {/* form */}
        <div>
          <div className="kicker">{t("start_eyebrow")}</div>
          <h1 className="mt-3 text-[clamp(30px,4vw,46px)] font-black leading-[1.05] tracking-[-0.02em] text-[var(--ink)]" style={{ maxWidth: "15ch" }}>{t("start_h1")}</h1>
          <p className="mt-4 max-w-[46ch] text-[clamp(15px,1.5vw,17px)] text-[var(--ink-soft)]">{t("start_sub")}</p>

          <div className="mt-7">
            <div className="flex items-baseline gap-2 text-[13px] font-bold"><span className="font-[var(--display-font)] text-[15px] text-[var(--brand)]">1</span> {t("start_q_business")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUSINESS_CATEGORIES.map((c) => (
                <button key={c.key} type="button" className={category === c.key ? "chip-btn on" : "chip-btn"} onClick={() => setCategory(c.key)}>{c.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-baseline gap-2 text-[13px] font-bold"><span className="font-[var(--display-font)] text-[15px] text-[var(--brand)]">2</span> {t("start_q_area")}</div>
            <div className="mt-3 flex flex-col gap-3">
              {locations.map((loc, i) => (
                <div key={i} className="panel p-3.5">
                  {locations.length > 1 && (
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--ink-soft)]"><MapPin size={13} className="text-[var(--brand)]" /> {t("start_location_n").replace("{n}", String(i + 1))}</span>
                      <button type="button" onClick={() => setLocations((p) => p.filter((_, idx) => idx !== i))} className="flex items-center gap-1 text-[12px] font-bold text-[var(--muted)] hover:text-[var(--clay)]"><Trash2 size={13} /> {t("start_remove_location")}</button>
                    </div>
                  )}
                  {loc.kind === "area" ? (
                    <>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <Select label={t("start_district_label")} value={loc.district} placeholder={t("start_district_placeholder")} options={districts}
                          onChange={(v) => { update(i, { ...loc, district: v, sector: "", cell: "" }); loadSectors(v); }} />
                        <Select label={t("start_sector_label")} value={loc.sector} disabled={!loc.district} placeholder={t("start_sector_all")} options={sectorsBy[loc.district] || []}
                          onChange={(v) => { update(i, { ...loc, sector: v, cell: "" }); loadCells(loc.district, v); }} />
                        <Select label={t("start_cell_label")} value={loc.cell} disabled={!loc.sector} placeholder={t("start_cell_all")} options={cellsBy[`${loc.district}::${loc.sector}`] || []}
                          onChange={(v) => update(i, { ...loc, cell: v })} />
                      </div>
                      <button type="button" onClick={() => update(i, { kind: "point", latitude: "", longitude: "", label: loc.label })} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-2)]">
                        <SlidersHorizontal size={14} /> {t("start_advanced")}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mb-2.5 text-[12.5px] text-[var(--muted)]">{t("start_point_hint")}</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input className="input-modern" placeholder={t("start_latitude_label")} value={loc.latitude} onChange={(e) => update(i, { ...loc, latitude: e.target.value })} />
                        <input className="input-modern" placeholder={t("start_longitude_label")} value={loc.longitude} onChange={(e) => update(i, { ...loc, longitude: e.target.value })} />
                      </div>
                      <button type="button" onClick={() => update(i, newArea())} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-2)]">
                        <MapPin size={14} /> {t("start_back_to_area")}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {locations.length < MAX_LOCATIONS ? (
              <button type="button" onClick={() => setLocations((p) => [...p, newArea()])} className="btn-secondary mt-3 w-full"><Plus size={16} /> {t("start_add_location")}</button>
            ) : (
              <p className="mt-3 text-[12.5px] font-semibold text-[var(--muted)]">{t("start_max_locations_reached")}</p>
            )}
          </div>

          <button type="button" onClick={submit} disabled={submitting} className="btn-primary mt-6">
            {submitting ? <><Loader2 size={17} className="animate-spin" /> {t("start_submitting")}</> : <>{t("start_submit")} <ArrowRight size={17} /></>}
          </button>
          <p className="mt-3 text-[12px] text-[var(--muted)]" style={{ maxWidth: "52ch" }}>
            {t("start_consent_pre")}{" "}
            <Link href="/legal" className="font-semibold text-[var(--brand-2)] underline underline-offset-2">{t("legal_link_label")}</Link>.
          </p>
          {error && <p className="mt-3 rounded-2xl bg-[var(--clay-wash)] p-3 text-[13.5px] font-semibold text-[var(--clay)]">{error}</p>}

          <div className="mt-9 flex items-start gap-2.5 border-t border-[var(--line-2)] pt-5 text-[12.5px] text-[var(--muted)]" style={{ maxWidth: "52ch" }}>
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" />
            <span>{t("start_trust")}</span>
          </div>
        </div>

        {/* example preview */}
        <div className="panel p-6 shadow-[0_24px_44px_-32px_rgba(20,35,28,.4)]">
          <div className="sec-label">{t("start_example")}</div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-extrabold">Kimironko</div>
              <div className="mt-0.5 text-[12px] font-semibold text-[var(--muted)]">Gasabo · {categoryLabel(category)}</div>
            </div>
            <span className="status-pill status-under"><span className="dot" /> {t("legend_underserved")}</span>
          </div>
          <p className="mt-4 font-[var(--display-font)] text-[22px] font-bold leading-[1.18] tracking-[-0.01em]">{t("start_example_verdict")}</p>
          <div className="mt-5 capacity">
            <div className="cap-figures">
              <div className="cap-fig"><span className="cap-num tnum">4</span><span className="cap-cap">{t("cap_open_now")}</span></div>
              <div className="cap-fig cap-fig-accent"><span className="cap-num tnum">+4</span><span className="cap-cap">{t("cap_room")}</span></div>
              <div className="cap-fig cap-fig-muted"><span className="cap-num tnum">8</span><span className="cap-cap">{t("cap_can_support")}</span></div>
            </div>
            <div className="cap-rail"><span className="cap-open" style={{ width: "50%" }} /><span className="cap-room" style={{ width: "50%" }} /></div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] font-semibold text-[var(--ink-soft)]">
            <b className="text-[var(--ink)]">{t("start_step_pick")}</b>
            <ArrowRight size={14} className="text-[var(--muted)]" />
            <b className="text-[var(--ink)]">{t("start_step_area")}</b>
            <ArrowRight size={14} className="text-[var(--muted)]" />
            <b className="text-[var(--ink)]">{t("start_step_read")}</b>
          </div>
        </div>
      </div>
    </main>
  );
}
