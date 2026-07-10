"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, MapPin, Sparkles, TrendingUp, Users } from "lucide-react";
import {
  getUnifiedReport, expandCandidate,
  type UnifiedReportBundle, type UnifiedReportPointEntry, type UnifiedReportAreaEntry, type AreaCandidate,
} from "@/lib/platform-api";
import { PageHeader, useAsyncData, safeNumber } from "@/components/platform/pageHelpers";
import { categoryLabel } from "@/lib/categories";
import { useLocale } from "@/lib/locale";

const ReportMap = dynamic(() => import("@/components/platform/ReportMap").then((m) => m.ReportMap), { ssr: false });

function GapStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <div className="mt-1 display-font text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function SingleLocationReport({ entry }: { entry: UnifiedReportPointEntry }) {
  const { t } = useLocale();
  const overall = entry.assessment.overall || ({} as any);
  const expected = overall.expected_count;
  const observed = overall.observed_count;
  const gap = overall.gap;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="kicker text-[var(--brand)]">{overall.opportunity_type}</div>
          <h2 className="mt-1 display-font text-2xl font-black text-slate-950">{entry.label}</h2>
        </div>
        <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
          {t("report_gap_percentile_label")}: {Math.round(safeNumber(overall.gap_score))}%
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <GapStat label={t("report_expected_label")} value={expected != null ? expected.toFixed(1) : "-"} />
        <GapStat label={t("report_observed_label")} value={observed != null ? observed.toFixed(0) : "-"} />
        <GapStat label={t("report_gap_label")} value={gap != null ? (gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)) : "-"} />
        <GapStat label={t("report_confidence_label")} value={`${Math.round(safeNumber(overall.confidence_score))}%`} />
      </div>

      <div className="mt-5">
        <h3 className="flex items-center gap-2 font-black text-slate-950"><MapPin size={16} className="text-[var(--brand)]" /> {t("report_map_heading")}</h3>
        <div className="mt-3">
          <ReportMap latitude={entry.latitude} longitude={entry.longitude} competitors={entry.competitors} villageBoundary={entry.village_boundary} />
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <h3 className="flex items-center gap-2 font-black text-slate-950"><Sparkles size={16} className="text-[var(--brand)]" /> {t("report_narrative_heading")}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {entry.narrative?.available ? entry.narrative.advice : t("report_narrative_unavailable")}
        </p>
      </div>

      {Array.isArray(entry.assessment.risk_notes) && entry.assessment.risk_notes.length > 0 && (
        <div className="mt-5 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5">
          <h3 className="flex items-center gap-2 font-black text-slate-950"><AlertTriangle size={16} className="text-amber-600" /> {t("report_risk_notes_heading")}</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
            {entry.assessment.risk_notes.map((note) => <li key={note}>• {note}</li>)}
          </ul>
        </div>
      )}

      {entry.assessment.recommendation && (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5">
          <h3 className="flex items-center gap-2 font-black text-slate-950"><TrendingUp size={16} className="text-emerald-700" /> {t("report_recommendation_heading")}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">{entry.assessment.recommendation}</p>
        </div>
      )}

      {entry.competitors.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 font-black text-slate-950"><Users size={16} className="text-[var(--brand)]" /> {t("report_competitors_heading")}</h3>
          <ul className="mt-3 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
            {entry.competitors.slice(0, 10).map((c, i) => (
              <li key={i} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-bold">{c.name || categoryLabel(c.category_key)}</span>
                <span className="text-slate-500">{Math.round(c.distance_m)}m</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AreaCandidatesPanel({ entry, reportId, entryIndex }: { entry: UnifiedReportAreaEntry; reportId: number; entryIndex: number }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<UnifiedReportPointEntry | null>(entry.expanded_candidate || null);
  const [expandingId, setExpandingId] = useState<string | null>(null);

  async function handleExpand(candidate: AreaCandidate) {
    setExpandingId(candidate.grid_id || "");
    try {
      const result = await expandCandidate(reportId, {
        entry_index: entryIndex,
        grid_id: candidate.grid_id || "",
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        label: candidate.location_label,
      });
      setExpanded(result);
    } catch { /* leave as-is; user can retry */ }
    finally { setExpandingId(null); }
  }

  if (expanded) return <SingleLocationReport entry={expanded} />;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="display-font text-2xl font-black text-slate-950">{t("report_top_candidates_heading")}: {entry.label}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {entry.top_candidates.map((c) => (
          <div key={c.grid_id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="kicker text-[var(--brand)]">{c.opportunity_type}</div>
            <h3 className="mt-1 font-black text-slate-950">{c.location_label || c.name}</h3>
            <div className="mt-2 text-sm text-slate-600">
              {t("report_gap_percentile_label")}: <strong>{Math.round(safeNumber(c.opportunity_score))}%</strong>
            </div>
            <button
              type="button"
              onClick={() => handleExpand(c)}
              disabled={expandingId === c.grid_id}
              className="btn-primary mt-3 w-full !py-2 text-sm"
            >
              {expandingId === c.grid_id ? <><Loader2 size={14} className="animate-spin" /> {t("report_expanding")}</> : <>{t("report_expand_candidate")} <ArrowRight size={14} /></>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ comparison }: { comparison: NonNullable<UnifiedReportBundle["comparison"]> }) {
  const { t } = useLocale();
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="display-font text-2xl font-black text-slate-950">{t("report_comparison_heading")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{comparison.summary}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="p-4">{t("col_location")}</th>
              <th>{t("report_gap_percentile_label")}</th>
              <th>{t("report_expected_label")}</th>
              <th>{t("report_observed_label")}</th>
              <th>{t("col_confidence")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparison.locations.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td className="p-4 font-black text-slate-950">{row.location_label || row.label}</td>
                <td className="font-black">{Math.round(safeNumber(row.gap_score))}%</td>
                <td>{row.expected_count != null ? Number(row.expected_count).toFixed(1) : "-"}</td>
                <td>{row.observed_count != null ? Number(row.observed_count).toFixed(0) : "-"}</td>
                <td>{Math.round(safeNumber(row.confidence_score))}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportPage({ reportId }: { reportId: string }) {
  const { t } = useLocale();
  const numericId = Number(reportId);
  const { data, loading } = useAsyncData(() => getUnifiedReport(numericId), [numericId], null as { report_id: number; report: UnifiedReportBundle } | null);

  if (loading) {
    return <main className="app-container py-16 text-center"><Loader2 className="mx-auto animate-spin text-[var(--brand)]" size={28} /><p className="mt-4 font-bold text-slate-600">{t("report_loading")}</p></main>;
  }

  if (!data?.report) {
    return (
      <main className="app-container py-16 text-center">
        <p className="font-bold text-slate-600">{t("report_not_found")}</p>
        <Link href="/start" className="btn-primary mt-5 inline-flex">{t("report_start_new_search")}</Link>
      </main>
    );
  }

  const report = data.report;

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow={categoryLabel(report.business_category)} title={t("report_page_title")} text="" />
      <div className="space-y-6">
        {report.entries.map((entry, index) =>
          entry.mode === "point" ? (
            <SingleLocationReport key={index} entry={entry} />
          ) : (
            <AreaCandidatesPanel key={index} entry={entry} reportId={data.report_id} entryIndex={index} />
          )
        )}

        {report.comparison && <ComparisonTable comparison={report.comparison} />}

        <div className="text-center">
          <Link href="/start" className="btn-secondary inline-flex">{t("report_start_new_search")}</Link>
        </div>
      </div>
    </main>
  );
}
