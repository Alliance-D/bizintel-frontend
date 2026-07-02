"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BUSINESS_CATEGORIES, categoryLabel } from "@/lib/categories";
import { getPlatformOpportunityGeoJson } from "@/lib/platform-api";
import { type AnyObj, PageHeader, StatusCard, InsightBlock, useAsyncData, EmptyDataPanel, safeNumber } from "@/components/platform/pageHelpers";

const SCORE_BUCKETS = [
  { label: "0-20", min: 0, max: 20 },
  { label: "20-40", min: 20, max: 40 },
  { label: "40-60", min: 40, max: 60 },
  { label: "60-80", min: 60, max: 80 },
  { label: "80-100", min: 80, max: 101 },
];

const BUCKET_COLORS = ["#fecaca", "#fde68a", "#a7f3d0", "#5eead4", "#0f766e"];

function factorAverage(features: AnyObj[], key: string) {
  if (!features.length) return 0;
  const total = features.reduce((sum, feature) => sum + safeNumber(feature.properties?.[key]), 0);
  return Math.round(total / features.length);
}

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
  const [category, setCategory] = useState("pharmacy");
  const { data, loading } = useAsyncData(() => getPlatformOpportunityGeoJson(category, "opportunity", 3000), [category], null);
  const features: AnyObj[] = Array.isArray((data as any)?.features) ? (data as any).features : [];

  const scores = features.map((f) => safeNumber(f.properties?.opportunity_score)).filter((n) => n > 0);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const high = scores.filter((n) => n >= 78).length;
  const saturated = features.filter((f) => safeNumber(f.properties?.competition_pressure) >= 78).length;
  const lowSupply = features.filter((f) => safeNumber(f.properties?.demand_score) >= 65 && safeNumber(f.properties?.competition_pressure) < 55).length;
  const cards = [
    { title: "Average opportunity", value: average || "No data", text: `Mean score across mapped ${categoryLabel(category).toLowerCase()} areas` },
    { title: "High opportunity areas", value: high, text: "Areas worth shortlisting before field checks" },
    { title: "Crowded areas", value: saturated, text: "Places where differentiation matters most" },
    { title: "Low supply pockets", value: lowSupply, text: "Demand appears stronger than mapped same-category supply" },
  ];

  const distribution = useMemo(() => SCORE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: scores.filter((score) => score >= bucket.min && score < bucket.max).length,
  })), [scores]);

  const factorBreakdown = useMemo(() => [
    { label: "Demand", value: factorAverage(features, "demand_score") },
    { label: "Access", value: factorAverage(features, "accessibility_score") },
    { label: "Activity", value: factorAverage(features, "commercial_activity_score") },
    { label: "Competition", value: factorAverage(features, "competition_pressure") },
    { label: "Confidence", value: factorAverage(features, "confidence_score") },
  ], [features]);

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
        eyebrow="Insights"
        title="Understand the opportunity landscape"
        text="Charts are calculated live from the current Kigali opportunity layer for the selected business category."
        action={<select value={category} onChange={(e) => setCategory(e.target.value)} className="input-modern min-w-[230px] font-bold">{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>}
      />
      <div className="real-data-note mb-5">Kigali intelligence is active for the selected business category</div>
      <div className="grid gap-4 md:grid-cols-4">{cards.map((card) => <StatusCard key={card.title} {...card} />)}</div>

      {loading && !features.length ? (
        <div className="mt-6"><EmptyDataPanel title="Loading insights" text="Calculating charts from the live opportunity layer." /></div>
      ) : features.length ? (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Score distribution" help="How many mapped areas fall into each opportunity band">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee5d8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [`${value} areas`, "Count"]} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distribution.map((entry, index) => <Cell key={entry.label} fill={BUCKET_COLORS[index]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="What drives the score" help={`Average factor signal across mapped ${categoryLabel(category).toLowerCase()} areas`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorBreakdown} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee5d8" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={84} tick={{ fontSize: 12, fontWeight: 800, fill: "#0f172a" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [value, "Average score"]} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {districtBreakdown.length > 1 && (
            <div className="mt-5">
              <ChartCard title="Opportunity by district" help="Average opportunity score for mapped areas in each Kigali district">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtBreakdown} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee5d8" vertical={false} />
                    <XAxis dataKey="district" tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any, _name: any, entry: any) => [`${value} average · ${entry?.payload?.count ?? 0} areas`, "Opportunity"]} />
                    <Bar dataKey="average" radius={[8, 8, 0, 0]} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <InsightBlock title="What to inspect first" text="Open high opportunity areas with manageable competition, then verify rent, visibility and informal competitors." icon={Sparkles} />
            <InsightBlock title="Validation philosophy" text="Public data gives a shortlist. Field checks decide whether a specific premises is practical." icon={ShieldCheck} />
          </div>
        </>
      ) : (
        <div className="mt-6"><EmptyDataPanel title="Insights unavailable" text="Refresh the page or try again shortly." /></div>
      )}
    </main>
  );
}
