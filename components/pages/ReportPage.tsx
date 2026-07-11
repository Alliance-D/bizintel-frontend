"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles, Star } from "lucide-react";
import {
  getUnifiedReport, expandCandidate,
  type UnifiedReportBundle, type UnifiedReportPointEntry, type UnifiedReportAreaEntry, type AreaCandidate,
} from "@/lib/platform-api";
import { useAsyncData, safeNumber } from "@/components/platform/pageHelpers";
import { categoryLabel } from "@/lib/categories";
import { useLocale } from "@/lib/locale";
import type { TranslationKey } from "@/lib/translations";

const ReportMap = dynamic(() => import("@/components/platform/ReportMap").then((m) => m.ReportMap), { ssr: false });

type T = (k: TranslationKey) => string;

type Situation = { pill: string; labelKey: TranslationKey; verdictKey: TranslationKey; badgeKey: TranslationKey };

// Derives the situation shown to the user from the ABSOLUTE expected-vs-observed
// counts - the same numbers the capacity bar and narrative use - so the verdict,
// the status pill and the bar can never contradict each other. (The gap
// PERCENTILE is a city-wide relative ranking, right for the map/insights, but it
// can call a slightly-oversupplied cell "underserved" just because it ranks high
// within its category - which would fight the bar that plainly shows it over
// capacity.)
function situationFromCounts(expected: number, observed: number): Situation {
  const room = expected - observed;
  if (expected < 0.75 && Math.abs(room) < 1)
    return { pill: "status-balanced", labelKey: "report_status_low_demand", verdictKey: "report_verdict_thin", badgeKey: "report_gap_low_badge" };
  if (room <= -0.75)
    return { pill: "status-saturated", labelKey: "legend_saturated", verdictKey: "report_verdict_saturated", badgeKey: "report_gap_over_badge" };
  if (room >= 1.5)
    return { pill: "status-under", labelKey: "legend_underserved", verdictKey: "report_verdict_underserved", badgeKey: "report_gap_room_badge" };
  if (room >= 0.5)
    return { pill: "status-emerging", labelKey: "legend_room_to_grow", verdictKey: "report_verdict_room", badgeKey: "report_gap_room_badge" };
  return { pill: "status-balanced", labelKey: "legend_balanced", verdictKey: "report_verdict_balanced", badgeKey: "report_gap_balanced_badge" };
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function CapacityBar({ expected, observed, t }: { expected: number; observed: number; t: T }) {
  const room = Math.max(0, expected - observed);
  const over = Math.max(0, observed - expected);
  return (
    <div>
      <div className="cap-track">
        {over > 0 ? (
          <>
            <div className="cap-seg cap-open" style={{ flex: Math.max(expected, 0.001) }}><span className="n tnum">{fmt(expected, 0)}</span><span className="x">{t("cap_supported")}</span></div>
            <div className="cap-seg cap-over" style={{ flex: over }}><span className="n tnum">+{fmt(over, 0)}</span><span className="x">{t("cap_over")}</span></div>
          </>
        ) : (
          <>
            <div className="cap-seg cap-open" style={{ flex: Math.max(observed, 0.001) }}><span className="n tnum">{fmt(observed, 0)}</span><span className="x">{t("cap_open")}</span></div>
            {room > 0 && <div className="cap-seg cap-room" style={{ flex: room }}><span className="n tnum">+{fmt(room, 0)}</span><span className="x">{t("cap_room")}</span></div>}
          </>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[12px] font-semibold text-[var(--muted)]">
        <span>0</span>
        <span>{t("cap_can_support")} · {fmt(expected, 1)}</span>
      </div>
    </div>
  );
}

function Signal({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-[var(--line-2)] py-3.5 first:border-t">
      <span className="text-[14.5px] font-bold">{label}</span>
      <span className="text-right font-[var(--display-font)] text-[21px] font-bold leading-none tnum">{value}{unit && <span className="ml-1 font-[Manrope] text-[12px] font-semibold text-[var(--muted)]">{unit}</span>}</span>
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

function SingleLocationReport({ entry }: { entry: UnifiedReportPointEntry }) {
  const { t } = useLocale();
  const a = entry.assessment;
  const overall = a.overall || ({} as any);
  const sig = a.signals;
  const cat = categoryLabel(a.business_category).toLowerCase();
  const expected = safeNumber(overall.expected_count);
  const observed = safeNumber(overall.observed_count);
  const room = expected - observed;
  const sit = situationFromCounts(expected, observed);
  const place = entry.label || a.location_label || t("kigali_label");

  const anchors = entry.anchors || [];
  const busStops = anchors.filter((x) => x.category_key === "transport");
  const markets = anchors.filter((x) => x.category_key === "market");
  const schools = anchors.filter((x) => x.category_key === "school" || x.category_key === "health");
  const footTraffic = [...busStops, ...markets, ...schools].sort((x, y) => x.distance_m - y.distance_m);
  const fieldChecks: string[] = Array.isArray(a.explanation?.field_checks) ? a.explanation.field_checks : [];

  return (
    <article className="panel overflow-hidden">
      <div className="p-6 lg:p-8">
        {/* header */}
        <div className="border-b border-[var(--line-2)] pb-6">
          <div className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">{cat} · {a.location_label || place}</div>
          <h2 className="mt-3 text-[clamp(24px,3vw,34px)] font-black leading-[1.1] tracking-[-0.02em]" style={{ maxWidth: "20ch" }}>
            {t(sit.verdictKey).replace("{place}", place).replace("{cat}", cat)}
          </h2>
          <div className="mt-4"><span className={`status-pill ${sit.pill}`}><span className="dot" /> {t(sit.labelKey)}</span></div>
          <p className="mt-4 max-w-[62ch] text-[15.5px] text-[var(--ink-soft)]">
            {t("report_say").replace("{expected}", fmt(expected, 0)).replace("{observed}", fmt(observed, 0)).replace("{cat}", cat)}
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
              <Signal label={t("report_signal_activity")} value={sig?.commercial_activity_level || "—"} />
              <Signal label={t("report_signal_competitors").replace("{cat}", cat)} value={fmt(observed, 0)} unit={a.competition ? undefined : undefined} />
              <Signal label={t("report_signal_anchors")} value={fmt(sig?.anchor_count_1000m, 0)} unit={t("report_within_1km")} />
              <Signal label={t("report_signal_estimate")} value={`≈ ${fmt(expected, 1)}`} unit={cat} />
            </div>

            <div className="mt-8">
              <div className="sec-label flex items-center gap-1.5"><Sparkles size={13} className="text-[var(--brand)]" /> {t("report_why_heading")}</div>
              <p className="mt-3 max-w-[64ch] whitespace-pre-line text-[16px] leading-[1.66] text-[var(--ink)]">
                {entry.narrative?.available ? entry.narrative.advice : t("report_narrative_unavailable")}
              </p>
            </div>

            {fieldChecks.length > 0 && (
              <div className="mt-8">
                <div className="sec-label">{t("report_before_heading")}</div>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {fieldChecks.slice(0, 4).map((c) => (
                    <li key={c} className="flex max-w-[62ch] gap-3 text-[14.5px] leading-[1.55] text-[var(--ink-soft)]"><Check size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* aside */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-5">
            <div className="panel overflow-hidden">
              <div className="px-4 pt-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--muted)]">{t("report_map_heading")}</div>
              <div className="mt-3"><ReportMap latitude={entry.latitude} longitude={entry.longitude} competitors={entry.competitors} anchors={entry.anchors} villageBoundary={entry.village_boundary} height={230} /></div>
              <div className="grid grid-cols-2 gap-2 px-4 py-3.5 text-[12px] text-[var(--ink-soft)]">
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: "var(--clay)" }} /> {t("report_legend_competitors").replace("{cat}", cat)}</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px]" style={{ background: "var(--brand)" }} /> {t("report_legend_transport")}</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rotate-45" style={{ background: "var(--amber)" }} /> {t("report_legend_anchors")}</span>
                <span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 rounded" style={{ background: "#CFD3C6" }} /> {t("report_legend_roads")}</span>
              </div>
            </div>

            <div className="panel p-4">
              <NearbyGroup color="var(--clay)" title={t("report_nearby_competitors").replace("{cat}", cat)} items={entry.competitors} t={t} />
              <NearbyGroup color="var(--brand)" title={t("report_nearby_anchors")} items={footTraffic} t={t} />
            </div>

            <div className="panel p-4">
              <div className="sec-label mb-3">{t("report_reliability_heading")}</div>
              <div className="flex flex-col gap-2.5 text-[13.5px]">
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t("report_confidence_label")}</span><b>{fmt(overall.confidence_score, 0)}%</b></div>
                <div className="flex justify-between"><span className="text-[var(--ink-soft)]">{t("report_based_on")}</span><b>{t("report_based_on_value").replace("{cat}", cat)}</b></div>
                <div className="flex justify-between gap-3"><span className="text-[var(--ink-soft)]">{t("report_caveat")}</span><b className="text-right">{t("report_caveat_value")}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function AreaCandidatesPanel({ entry, reportId, entryIndex }: { entry: UnifiedReportAreaEntry; reportId: number; entryIndex: number }) {
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

  if (expanded) return <SingleLocationReport entry={expanded} />;

  return (
    <div className="panel p-6 lg:p-8">
      <h2 className="font-[var(--display-font)] text-[22px] font-bold tracking-[-0.01em]">{t("report_top_candidates_heading")}: {entry.label}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {entry.top_candidates.map((c) => {
          const gd = (c as any).explanation?.gap_details || {};
          const cExp = safeNumber(gd.expected_count);
          const cObs = safeNumber(gd.observed_count);
          const sit = situationFromCounts(cExp, cObs);
          return (
            <div key={c.grid_id} className="panel bg-[var(--surface-soft)] p-4">
              <span className={`status-pill ${sit.pill}`}>{t(sit.labelKey)}</span>
              <h3 className="mt-3 font-bold text-[var(--ink)]">{c.location_label || c.name}</h3>
              <div className="mt-2 text-[13px] text-[var(--ink-soft)]">{t("report_cand_line").replace("{expected}", fmt(cExp, 1)).replace("{observed}", fmt(cObs, 0))}</div>
              <button type="button" onClick={() => handleExpand(c)} disabled={expandingId === c.grid_id} className="btn-primary mt-4 w-full !py-2.5 text-[14px]">
                {expandingId === c.grid_id ? <><Loader2 size={14} className="animate-spin" /> {t("report_expanding")}</> : <>{t("report_expand_candidate")} <ArrowRight size={14} /></>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonSection({ comparison }: { comparison: NonNullable<UnifiedReportBundle["comparison"]> }) {
  const { t } = useLocale();
  const rows = comparison.locations;
  const bestLabel = comparison.best_location?.label;
  return (
    <div className="panel p-6 lg:p-8">
      <h2 className="font-[var(--display-font)] text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.015em]">{t("report_comparison_heading")}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, i) => {
          const rExp = safeNumber(row.expected_count);
          const rObs = safeNumber(row.observed_count);
          const sit = situationFromCounts(rExp, rObs);
          const isBest = row.label === bestLabel;
          const gap = safeNumber(row.gap);
          return (
            <div key={i} className={`panel p-5 ${isBest ? "border-[var(--brand)] shadow-[inset_0_0_0_1px_var(--brand)]" : ""}`}>
              {isBest && <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--brand)]"><Star size={13} className="fill-current" /> {t("report_best_option")}</div>}
              <div className="font-extrabold text-[16px]">{row.location_label || row.label}</div>
              <div className="mt-3"><span className={`status-pill ${sit.pill}`}>{t(sit.labelKey)}</span></div>
              <div className="mt-4 font-[var(--display-font)] text-[38px] font-bold leading-none" style={{ color: gap > 0 ? "var(--brand-2)" : "var(--bal)" }}>
                {gap > 0 ? `+${fmt(gap, 0)}` : fmt(gap, 0)}
                <small className="mt-2 block font-[Manrope] text-[12.5px] font-semibold text-[var(--muted)]">{t("report_room_caption")}</small>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-[13px] text-[var(--ink-soft)]">
                <div className="flex justify-between border-t border-[var(--line-2)] pt-2"><span>{t("report_expected_label")}</span><b className="tabular-nums text-[var(--ink)]">{fmt(row.expected_count, 1)}</b></div>
                <div className="flex justify-between border-t border-[var(--line-2)] pt-2"><span>{t("report_observed_label")}</span><b className="tabular-nums text-[var(--ink)]">{fmt(row.observed_count, 0)}</b></div>
                <div className="flex justify-between border-t border-[var(--line-2)] pt-2"><span>{t("report_confidence_label")}</span><b className="tabular-nums text-[var(--ink)]">{fmt(row.confidence_score, 0)}%</b></div>
              </div>
            </div>
          );
        })}
      </div>
      {comparison.summary && <div className="mt-5 rounded-[16px] bg-[var(--brand-wash)] p-5 text-[14.5px] leading-[1.6] text-[var(--brand-2)]">{comparison.summary}</div>}
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
        <div className="kicker">{categoryLabel(report.business_category)}</div>
        <h1 className="mt-3 text-[clamp(26px,3.4vw,40px)] font-black tracking-[-0.02em]">{t("report_page_title")}</h1>
      </div>
      <div className="flex flex-col gap-7">
        {report.entries.map((entry, i) =>
          entry.mode === "point"
            ? <SingleLocationReport key={i} entry={entry} />
            : <AreaCandidatesPanel key={i} entry={entry} reportId={data.report_id} entryIndex={i} />
        )}
        {report.comparison && <ComparisonSection comparison={report.comparison} />}
        <div className="text-center"><Link href="/start" className="btn-secondary inline-flex">{t("report_start_new_search")}</Link></div>
      </div>
    </main>
  );
}
