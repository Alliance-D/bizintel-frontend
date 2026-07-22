"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import { catLabel, catTitle } from "@/lib/report-format";
import { getPlatformOpportunityGeoJson } from "@/lib/platform-api";
import { type AnyObj, PageHeader, StatusCard, InsightBlock, useAsyncData, EmptyDataPanel, safeNumber } from "@/components/platform/pageHelpers";
import { useLocale } from "@/lib/locale";

const SCORE_BUCKETS = [
  { label: "0-20", min: 0, max: 20 },
  { label: "20-40", min: 20, max: 40 },
  { label: "40-60", min: 40, max: 60 },
  { label: "60-80", min: 60, max: 80 },
  { label: "80-100", min: 80, max: 101 },
];

const BUCKET_COLORS = ["#fecaca", "#fde68a", "#a7f3d0", "#5eead4", "#0f766e"];

function ChartCard({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{help}</p>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

const chartTooltipStyle = { borderRadius: 14, border: "1px solid #e6e0d5", fontSize: 12, fontWeight: 700 };

export function InsightsPage() {
  const { t, locale } = useLocale();
  const [category, setCategory] = useState("pharmacy");
  const { data, loading } = useAsyncData(() => getPlatformOpportunityGeoJson(category, "opportunity", 3000, locale), [category, locale], null);
  const features: AnyObj[] = Array.isArray((data as any)?.features) ? (data as any).features : [];

  const scores = features.map((f) => safeNumber(f.properties?.opportunity_score)).filter((n) => n > 0);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  // zone_key comes straight from the model's own gap_percentile_classification()
  // (underserved/emerging/balanced/saturated) - counting by it instead of
  // re-deriving thresholds locally keeps this page consistent with what the
  // model actually says, rather than a second, looser approximation of it.
  const underserved = features.filter((f) => f.properties?.zone_key === "underserved").length;
  const roomToGrow = features.filter((f) => f.properties?.zone_key === "emerging").length;
  const saturated = features.filter((f) => f.properties?.zone_key === "saturated").length;
  const cards = [
    { title: t("avg_opportunity"), value: average || t("no_data"), text: t("mean_score_areas").replace("{category}", catLabel(category, t)) },
    { title: t("underserved_areas"), value: underserved, text: t("underserved_areas_text") },
    { title: t("saturated_areas"), value: saturated, text: t("saturated_areas_text") },
    { title: t("room_to_grow_areas"), value: roomToGrow, text: t("room_to_grow_areas_text") },
  ];

  const distribution = useMemo(() => SCORE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: scores.filter((score) => score >= bucket.min && score < bucket.max).length,
  })), [scores]);

  const districtBreakdown = useMemo(() => {
    const byDistrict = new Map<string, { total: number; count: number }>();
    features.forEach((feature) => {
      const district = String(feature.properties?.district || "Unmapped");
      const entry = byDistrict.get(district) || { total: 0, count: 0 };
      entry.total += safeNumber(feature.properties?.opportunity_score);
      entry.count += 1;
      byDistrict.set(district, entry);
    });
    return Array.from(byDistrict.entries())
      .map(([district, entry]) => ({ district, average: entry.count ? Math.round(entry.total / entry.count) : 0, count: entry.count }))
      .sort((a, b) => b.average - a.average);
  }, [features]);

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader
        eyebrow={t("insights_eyebrow")}
        title={t("insights_title")}
        text={t("insights_text")}
        action={<select value={category} onChange={(e) => setCategory(e.target.value)} className="input-modern min-w-[230px] font-bold">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{catTitle(item.key, t)}</option>)}</select>}
      />
      <div className="real-data-note mb-5">{t("kigali_intelligence_active")}</div>
      <div className="grid gap-4 md:grid-cols-4">{cards.map((card) => <StatusCard key={card.title} {...card} />)}</div>

      {loading && !features.length ? (
        <div className="mt-6"><EmptyDataPanel title={t("loading_insights")} text={t("loading_insights_text")} /></div>
      ) : features.length ? (
        <>
          <div className="mt-6">
            <ChartCard title={t("score_distribution")} help={t("score_distribution_help")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee5d8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [`${value} ${t("areas_suffix")}`, t("count_label")]} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distribution.map((entry, index) => <Cell key={entry.label} fill={BUCKET_COLORS[index]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {districtBreakdown.length > 1 && (
            <div className="mt-5">
              <ChartCard title={t("opportunity_by_district")} help={t("opportunity_by_district_help")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtBreakdown} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee5d8" vertical={false} />
                    <XAxis dataKey="district" tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any, _name: any, entry: any) => [`${value} ${t("average_suffix")} · ${entry?.payload?.count ?? 0} ${t("areas_suffix")}`, t("opportunity_label")]} />
                    <Bar dataKey="average" radius={[8, 8, 0, 0]} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <InsightBlock title={t("what_to_inspect_first")} text={t("what_to_inspect_first_text")} icon={Sparkles} />
            <InsightBlock title={t("validation_philosophy")} text={t("validation_philosophy_text")} icon={ShieldCheck} />
          </div>
        </>
      ) : (
        <div className="mt-6"><EmptyDataPanel title={t("insights_unavailable")} text={t("insights_unavailable_text")} /></div>
      )}
    </main>
  );
}
