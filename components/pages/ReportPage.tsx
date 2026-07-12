"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Maximize2, Sparkles, Star, X } from "lucide-react";
import {
  getUnifiedReport, expandCandidate, getAdvice,
  type UnifiedReportBundle, type UnifiedReportPointEntry, type UnifiedReportAreaEntry, type AreaCandidate, type AdvisorResponse,
} from "@/lib/platform-api";

// Narratives are generated in the language active when the report was built.
// When the reader switches language we re-request the explanation once and
// cache it, so a toggle back and forth doesn't keep hitting the model.
const narrativeCache = new Map<string, AdvisorResponse>();
import { useAsyncData, safeNumber } from "@/components/platform/pageHelpers";
import { PoiGlyph, POI_GLYPHS, COMPETITOR_COLOR, ANCHOR_COLORS, competitorGlyphKey } from "@/components/platform/poiGlyphs";
import { situationFromCounts, fmt, catLabel, catPluralEn, activityLabel, nearLabel, type T } from "@/lib/report-format";
import { useLocale } from "@/lib/locale";
import type { TranslationKey } from "@/lib/translations";

const ReportMap = dynamic(() => import("@/components/platform/ReportMap").then((m) => m.ReportMap), { ssr: false });

function CapacityBar({ expected, observed, t }: { expected: number; observed: number; t: T }) {
  const over = observed > expected;
  const room = Math.max(0, expected - observed);
  const overBy = Math.max(0, observed - expected);
  const capLabel = expected < 1 ? "<1" : fmt(expected, 0);
  const total = Math.max(expected, observed, 0.001);
  return (
    <div className="capacity">
      <div className="cap-figures">
        <div className="cap-fig"><span className="cap-num tnum">{fmt(observed, 0)}</span><span className="cap-cap">{t("cap_open_now")}</span></div>
        {over ? (
          <div className="cap-fig cap-fig-over"><span className="cap-num tnum">+{fmt(overBy, 0)}</span><span className="cap-cap">{t("cap_over")}</span></div>
        ) : (
          <div className="cap-fig cap-fig-accent"><span className="cap-num tnum">+{fmt(room, 0)}</span><span className="cap-cap">{t("cap_room")}</span></div>
        )}
        <div className="cap-fig cap-fig-muted"><span className="cap-num tnum">{capLabel}</span><span className="cap-cap">{t("cap_can_support")}</span></div>
      </div>
      <div className="cap-rail" aria-hidden="true">
        {over ? (
          <>
            <span className="cap-open" style={{ width: `${(expected / total) * 100}%` }} />
            <span className="cap-over" style={{ width: `${(overBy / total) * 100}%` }} />
          </>
        ) : (
          <>
            <span className="cap-open" style={{ width: `${(observed / total) * 100}%` }} />
            <span className="cap-room" style={{ width: `${(room / total) * 100}%` }} />
          </>
        )}
      </div>
    </div>
  );
}

function Signal({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-[var(--line-2)] py-3.5 first:border-t">
      <span className="text-[14.5px] font-bold">{label}</span>
      <span className="text-right font-[var(--display-font)] text-[21px] font-bold leading-none tnum">{value}{unit && <span className="ml-1 font-[family-name:var(--font-sans)] text-[12px] font-semibold text-[var(--muted)]">{unit}</span>}</span>
    </div>
  );
}

function NearbyGroup({ color, title, items, t }: { color: string; title: string; items: { name: string | null; distance_m: number; category_key: string }[]; t: T }) {
  if (!items.length) return null;
  return (
    <div className="[&+&]:mt-4 [&+&]:border-t [&+&]:border-[var(--line-2)] [&+&]:pt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--muted)]"><i className="inline-block size-2 rounded-full" style={{ background: color }} /> {title}</div>
      {items.slice(0, 5).map((it, i) => (
        <div key={i} className="flex items-baseline justify-between py-1.5 text-[14px]">
          <span>{it.name || t("report_unnamed")}</span>
          <em className="not-italic text-[13px] tabular-nums text-[var(--muted)]">{Math.round(it.distance_m)} m</em>
        </div>
      ))}
    </div>
  );
}

function MapLegend({ cats, catKey, t }: { cats: string; catKey: string; t: T }) {
  const compKey = competitorGlyphKey(catKey);
  return (
    <>
      <span className="flex items-center gap-1.5"><PoiGlyph color={COMPETITOR_COLOR} glyph={POI_GLYPHS[compKey]} size={17} /> {t("report_legend_competitors").replace("{cats}", cats).replace("{cat}", cats)}</span>
      <span className="flex items-center gap-1.5"><PoiGlyph color={ANCHOR_COLORS.transport} glyph={POI_GLYPHS.transport} size={17} /> {t("report_legend_transport")}</span>
      <span className="flex items-center gap-1.5"><PoiGlyph color={ANCHOR_COLORS.market} glyph={POI_GLYPHS.market} size={17} /> {t("report_legend_markets")}</span>
      <span className="flex items-center gap-1.5"><PoiGlyph color={ANCHOR_COLORS.school} glyph={POI_GLYPHS.school} size={17} /> {t("report_legend_schools")}</span>
      <span className="flex items-center gap-1.5"><PoiGlyph color={ANCHOR_COLORS.health} glyph={POI_GLYPHS.health} size={17} /> {t("report_legend_clinics")}</span>
    </>
  );
}

function MapModal({ entry, cats, t, onClose }: { entry: UnifiedReportPointEntry; cats: string; t: T; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[20px] bg-[var(--surface)] shadow-[0_40px_80px_-20px_rgba(0,0,0,.45)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--line-2)] px-5 py-3.5">
          <span className="font-[var(--display-font)] text-[16px] font-semibold">{t("report_map_heading")}</span>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]" aria-label="Close"><X size={16} /></button>
        </div>
        <ReportMap latitude={entry.latitude} longitude={entry.longitude} competitors={entry.competitors} anchors={entry.anchors} villageBoundary={entry.village_boundary} height={560} interactive category={entry.assessment.business_category} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-5 py-4 text-[12.5px] text-[var(--ink-soft)] sm:grid-cols-3"><MapLegend cats={cats} catKey={entry.assessment.business_category} t={t} /></div>
      </div>
    </div>
  );
}

function SingleLocationReport({ entry, reportLocale }: { entry: UnifiedReportPointEntry; reportLocale?: string | null }) {
  const { t, locale } = useLocale();
  const a = entry.assessment;
  const overall = a.overall || ({} as any);
  const sig = a.signals;
  const cat = catLabel(a.business_category, t).toLowerCase();
  const cats = locale.toLowerCase().startsWith("rw") ? cat : catPluralEn(cat);
  const expected = safeNumber(overall.expected_count);
  const observed = safeNumber(overall.observed_count);
  const room = expected - observed;
  const sit = situationFromCounts(expected, observed);
  const landmarkPlace = nearLabel(a.landmark, t);
  const place = landmarkPlace || entry.label || a.location_label || t("kigali_label");
  const context = a.location_label && a.location_label !== place ? a.location_label : null;

  const anchors = entry.anchors || [];
  const busStops = anchors.filter((x) => x.category_key === "transport");
  const markets = anchors.filter((x) => x.category_key === "market");
  const schools = anchors.filter((x) => x.category_key === "school" || x.category_key === "health");
  const footTraffic = [...busStops, ...markets, ...schools].sort((x, y) => x.distance_m - y.distance_m);
  // A fixed, translated field-check list - the same practical steps regardless
  // of location - so it reads naturally and flips language on toggle. (The
  // model's own baked checklist was English-only and mentioned data sources
  // the user doesn't need to hear about.)
  const fieldChecks: TranslationKey[] = ["report_check_1", "report_check_2", "report_check_3", "report_check_4"];

  const [mapOpen, setMapOpen] = useState(false);
  const buildLoc = (reportLocale || "en").toLowerCase().startsWith("rw") ? "rw" : "en";
  const curLoc = locale.toLowerCase().startsWith("rw") ? "rw" : "en";
  const [narr, setNarr] = useState<AdvisorResponse | null>(entry.narrative || null);
  const [translating, setTranslating] = useState(false);
  useEffect(() => {
    if (curLoc === buildLoc) { setNarr(entry.narrative || null); return; }
    const key = `${a.business_category}|${entry.latitude.toFixed(5)}|${entry.longitude.toFixed(5)}|${curLoc}`;
    const cached = narrativeCache.get(key);
    if (cached) { setNarr(cached); return; }
    let active = true;
    setTranslating(true);
    getAdvice({ business_category: a.business_category, latitude: entry.latitude, longitude: entry.longitude, locale })
      .then((r) => { if (active) { narrativeCache.set(key, r); setNarr(r); } })
      .catch(() => {})
      .finally(() => { if (active) setTranslating(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curLoc]);

  return (
    <>
    <article className="panel overflow-hidden">
      <div className="p-6 lg:p-8">
        {/* header */}
        <div className="border-b border-[var(--line-2)] pb-6">
          <div className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">{cat}{context ? ` · ${context}` : ""}</div>
          <h2 className="mt-3 text-[clamp(24px,3vw,34px)] font-black leading-[1.1] tracking-[-0.02em]" style={{ maxWidth: "20ch" }}>
            {t(sit.verdictKey).replace("{place}", place).replace("{cats}", cats).replace("{cat}", cat)}
          </h2>
          <div className="mt-4"><span className={`status-pill ${sit.pill}`}><span className="dot" /> {t(sit.labelKey)}</span></div>
          <p className="mt-4 max-w-[62ch] text-[15.5px] text-[var(--ink-soft)]">
            {t("report_say").replace("{expected}", fmt(expected, 0)).replace("{observed}", fmt(observed, 0)).replace("{cats}", cats).replace("{cat}", cat)}
          </p>
        </div>

        {/* gap band */}
        <div className="mt-6 rounded-[18px] border border-[var(--line-2)] bg-[var(--surface-soft)] p-5 lg:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-[var(--display-font)] text-[18px] font-bold">{t("report_gap_band_heading")}</span>
            <span className={`status-pill ${sit.pill}`}>{sit.badgeKey === "report_gap_room_badge" ? t("report_gap_room_badge").replace("{n}", fmt(Math.max(1, Math.round(room)), 0)) : t(sit.badgeKey)}</span>
          </div>
          <div className="mt-4"><CapacityBar expected={expected} observed={observed} t={t} /></div>
        </div>

        {/* body grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          {/* main */}
          <div>
            <div className="sec-label">{t("report_signals_heading")}</div>
            <div className="mt-3">
              <Signal label={t("report_signal_people")} value={fmt(sig?.people_within_1km, 0)} unit={t("report_within_1km")} />
              <Signal label={t("report_signal_activity")} value={activityLabel(sig?.commercial_activity_level, t)} />
              <Signal label={t("report_signal_competitors").replace("{cats}", cats).replace("{cat}", cat)} value={fmt(observed, 0)} unit={a.competition ? undefined : undefined} />
              <Signal label={t("report_signal_anchors")} value={fmt(sig?.anchor_count_1000m, 0)} unit={t("report_within_1km")} />
              <Signal label={t("report_signal_estimate")} value={`≈ ${fmt(expected, 1)}`} unit={cat} />
            </div>

            <div className="mt-8">
              <div className="sec-label flex items-center gap-1.5"><Sparkles size={13} className="text-[var(--brand)]" /> {t("report_why_heading")}</div>
              {translating ? (
                <p className="mt-3 flex items-center gap-2 text-[15px] text-[var(--muted)]"><Loader2 size={15} className="animate-spin" /> {t("report_narrative_translating")}</p>
              ) : (
                <p className="mt-3 max-w-[64ch] whitespace-pre-line text-[16px] leading-[1.66] text-[var(--ink)]">
                  {narr?.available ? narr.advice : t("report_narrative_unavailable")}
                </p>
              )}
            </div>

            <div className="mt-8">
              <div className="sec-label">{t("report_before_heading")}</div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {fieldChecks.map((c) => (
                  <li key={c} className="flex max-w-[62ch] gap-3 text-[14.5px] leading-[1.55] text-[var(--ink-soft)]"><Check size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {t(c)}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* aside */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-5">
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3.5">
                <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--muted)]">{t("report_map_heading")}</span>
                <button type="button" onClick={() => setMapOpen(true)} className="flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-2)]"><Maximize2 size={12} /> {t("report_map_enlarge")}</button>
              </div>
              <button type="button" onClick={() => setMapOpen(true)} className="mt-3 block w-full cursor-pointer text-left" aria-label={t("report_map_enlarge")}>
                <ReportMap latitude={entry.latitude} longitude={entry.longitude} competitors={entry.competitors} anchors={entry.anchors} villageBoundary={entry.village_boundary} height={280} category={a.business_category} />
              </button>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3.5 text-[12px] text-[var(--ink-soft)]"><MapLegend cats={cats} catKey={a.business_category} t={t} /></div>
            </div>

            <div className="panel p-4">
              <NearbyGroup color="var(--clay)" title={t("report_nearby_competitors").replace("{cats}", cats).replace("{cat}", cat)} items={entry.competitors} t={t} />
              <NearbyGroup color="var(--brand)" title={t("report_nearby_anchors")} items={footTraffic} t={t} />
            </div>

            <div className="panel p-4">
              <div className="sec-label mb-3">{t("report_reliability_heading")}</div>
              <div className="flex flex-col gap-2.5 text-[13.5px]">
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t("report_confidence_label")}</span><b>{fmt(overall.confidence_score, 0)}%</b></div>
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t("report_based_on")}</span><b>{t("report_based_on_value").replace("{cats}", cats).replace("{cat}", cat)}</b></div>
                <div className="flex justify-between gap-3"><span className="text-[var(--ink-soft)]">{t("report_caveat")}</span><b className="text-right">{t("report_caveat_value")}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
    {mapOpen && <MapModal entry={entry} cats={cats} t={t} onClose={() => setMapOpen(false)} />}
    </>
  );
}

function AreaCandidatesPanel({ entry, reportId, entryIndex, reportLocale }: { entry: UnifiedReportAreaEntry; reportId: number; entryIndex: number; reportLocale?: string | null }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<UnifiedReportPointEntry | null>(entry.expanded_candidate || null);
  const [expandingId, setExpandingId] = useState<string | null>(null);

  async function handleExpand(c: AreaCandidate) {
    setExpandingId(c.grid_id || "");
    try {
      const result = await expandCandidate(reportId, { entry_index: entryIndex, grid_id: c.grid_id || "", latitude: c.latitude, longitude: c.longitude, label: c.location_label });
      setExpanded(result);
    } catch {} finally { setExpandingId(null); }
  }

  const cat = catLabel(entry.top_candidates[0]?.business_category || "pharmacy", t).toLowerCase();

  if (expanded) {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => setExpanded(null)} className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-[var(--brand-2)]">
          <ArrowLeft size={15} /> {t("report_back_shortlist")}
        </button>
        <SingleLocationReport entry={expanded} reportLocale={reportLocale} />
      </div>
    );
  }

  return (
    <div className="panel p-6 lg:p-8">
      <h2 className="font-[var(--display-font)] text-[clamp(20px,2.4vw,26px)] font-semibold tracking-[-0.01em]">{t("report_ranked_heading").replace("{area}", entry.label)}</h2>
      <p className="mt-2 max-w-[60ch] text-[14.5px] text-[var(--ink-soft)]">{t("report_ranked_sub").replace("{cat}", cat)}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {entry.top_candidates.map((c, i) => {
          const gd = (c as any).explanation?.gap_details || {};
          const cExp = safeNumber(gd.expected_count);
          const cObs = safeNumber(gd.observed_count);
          const sit = situationFromCounts(cExp, cObs);
          const name = nearLabel(c.landmark, t) || c.location_label || c.name;
          const sub = c.location_label && c.location_label !== name ? c.location_label : null;
          return (
            <div key={c.grid_id} className="panel-flat bg-[var(--surface-soft)] flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="font-[var(--display-font)] text-[15px] font-semibold text-[var(--muted)]">#{i + 1}</span>
                <span className={`status-pill ${sit.pill}`}>{t(sit.labelKey)}</span>
              </div>
              <h3 className="mt-3 font-[var(--display-font)] text-[18px] font-semibold leading-tight">{name}</h3>
              {sub && <div className="mt-0.5 text-[12.5px] text-[var(--muted)]">{sub}</div>}
              <div className="mt-2.5 text-[13px] text-[var(--ink-soft)]">{t("report_cand_line").replace("{expected}", fmt(cExp, 1)).replace("{observed}", fmt(cObs, 0))}</div>
              <button type="button" onClick={() => handleExpand(c)} disabled={expandingId === c.grid_id} className="btn-primary mt-5 w-full !py-2.5 text-[14px]">
                {expandingId === c.grid_id ? <><Loader2 size={14} className="animate-spin" /> {t("report_expanding")}</> : <>{t("report_expand_candidate")} <ArrowRight size={14} /></>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareStat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line-2)] pt-2">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <b className={`tabular-nums ${strong ? "font-[var(--display-font)] text-[17px] text-[var(--brand-2)]" : "text-[var(--ink)]"}`}>{value}</b>
    </div>
  );
}

// Head-to-head: the summarized difference first, then the full report of
// whichever spot you choose to open. Never two full reports at once.
function CompareView({ comparison, entries, reportLocale }: { comparison: NonNullable<UnifiedReportBundle["comparison"]>; entries: UnifiedReportPointEntry[]; reportLocale?: string | null }) {
  const { t } = useLocale();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const bestLabel = comparison.best_location?.label;
  const entryIndexFor = (row: Record<string, any>) =>
    entries.findIndex((e) => Math.abs(e.latitude - safeNumber(row.latitude)) < 1e-6 && Math.abs(e.longitude - safeNumber(row.longitude)) < 1e-6);

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-6 lg:p-8">
        <div className="kicker">{t("report_compare_kicker")}</div>
        <h2 className="mt-2 font-[var(--display-font)] text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.015em]">{t("report_comparison_heading")}</h2>
        {comparison.summary && <p className="mt-3 max-w-[72ch] text-[16px] leading-[1.62] text-[var(--ink)]">{comparison.summary}</p>}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {comparison.locations.map((row, i) => {
            const rExp = safeNumber(row.expected_count);
            const rObs = safeNumber(row.observed_count);
            const room = rExp - rObs;
            const sit = situationFromCounts(rExp, rObs);
            const isBest = row.label === bestLabel;
            const name = nearLabel(row.landmark, t) || row.location_label || row.label;
            const sub = row.location_label && row.location_label !== name ? row.location_label : null;
            const idx = entryIndexFor(row);
            return (
              <div key={i} className={`rounded-[18px] border p-5 lg:p-6 ${isBest ? "border-[var(--brand)] bg-[var(--brand-wash)]" : "border-[var(--line)] bg-[var(--surface-soft)]"}`}>
                {isBest && <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--brand)]"><Star size={13} className="fill-current" /> {t("report_best_option")}</div>}
                <div className="font-[var(--display-font)] text-[20px] font-semibold leading-tight">{name}</div>
                {sub && <div className="mt-0.5 text-[12.5px] text-[var(--muted)]">{sub}</div>}
                <div className="mt-3"><span className={`status-pill ${sit.pill}`}>{t(sit.labelKey)}</span></div>
                <div className="mt-4 flex flex-col gap-2 text-[13.5px]">
                  <CompareStat label={t("cap_room")} value={room >= 0 ? `+${fmt(Math.max(0, room), 0)}` : fmt(room, 0)} strong />
                  <CompareStat label={t("cap_open_now")} value={fmt(rObs, 0)} />
                  <CompareStat label={t("report_signal_people")} value={fmt(row.people_within_1km, 0)} />
                  <CompareStat label={t("report_confidence_label")} value={`${fmt(row.confidence_score, 0)}%`} />
                </div>
                {idx >= 0 && (
                  <button type="button" onClick={() => setOpenIdx(openIdx === idx ? null : idx)} className="btn-secondary mt-5 w-full !py-2.5 text-[13.5px]">
                    {openIdx === idx ? t("report_hide_full") : t("report_view_full_report")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {openIdx != null && entries[openIdx] && <SingleLocationReport entry={entries[openIdx]} reportLocale={reportLocale} />}
    </div>
  );
}

export function ReportPage({ reportId }: { reportId: string }) {
  const { t } = useLocale();
  const numericId = Number(reportId);
  const { data, loading } = useAsyncData(() => getUnifiedReport(numericId), [numericId], null as { report_id: number; report: UnifiedReportBundle } | null);

  if (loading) return <main className="app-container py-20 text-center"><Loader2 className="mx-auto animate-spin text-[var(--brand)]" size={28} /><p className="mt-4 font-semibold text-[var(--ink-soft)]">{t("report_loading")}</p></main>;
  if (!data?.report) return (
    <main className="app-container py-20 text-center">
      <p className="font-semibold text-[var(--ink-soft)]">{t("report_not_found")}</p>
      <Link href="/start" className="btn-primary mt-5 inline-flex">{t("report_start_new_search")}</Link>
    </main>
  );

  const report = data.report;
  return (
    <main className="app-container py-8 lg:py-12">
      <div className="mb-7">
        <div className="kicker">{catLabel(report.business_category, t)}</div>
        <h1 className="mt-3 text-[clamp(26px,3.4vw,40px)] font-black tracking-[-0.02em]">{t("report_page_title")}</h1>
      </div>
      <div className="flex flex-col gap-7">
        {report.comparison
          ? <CompareView comparison={report.comparison} entries={report.entries.filter((e): e is UnifiedReportPointEntry => e.mode === "point")} reportLocale={report.locale} />
          : report.entries.map((entry, i) =>
              entry.mode === "point"
                ? <SingleLocationReport key={i} entry={entry} reportLocale={report.locale} />
                : <AreaCandidatesPanel key={i} entry={entry} reportId={data.report_id} entryIndex={i} reportLocale={report.locale} />
            )}
        <div className="text-center"><Link href="/start" className="btn-secondary inline-flex">{t("report_start_new_search")}</Link></div>
      </div>
    </main>
  );
}
