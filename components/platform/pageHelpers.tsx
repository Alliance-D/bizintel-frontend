import { useEffect, useState, type ReactNode } from "react";

export type AnyObj = Record<string, any>;

export type Candidate = {
  label: string;
  latitude: number;
  longitude: number;
  opportunity_score: number;
  demand_score: number;
  access_score: number;
  competition_pressure: number;
  confidence_score: number;
  recommendation: string;
};

export function safeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function clamp(value: number) {
  return Math.max(0, Math.min(100, safeNumber(value)));
}

export function PageHeader({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="kicker text-[var(--brand)]">{eyebrow}</div>
          <h1 className="mt-4 max-w-5xl display-font text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{text}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

export function Progress({ value, tone = "green" }: { value: number; tone?: "green" | "blue" | "amber" }) {
  const color = tone === "blue" ? "bg-[#0f766e]" : tone === "amber" ? "bg-amber-500" : "bg-emerald-600";
  return <div className="h-2 w-full rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{ width: `${clamp(value)}%` }} /></div>;
}

export function StatusCard({ title, value, text }: { title: string; value: number | string; text: string }) {
  const display = typeof value === "number" ? Math.round(safeNumber(value)) : (value ?? "Not available");
  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-extrabold text-slate-500">{title}</div><div className="mt-2 display-font text-3xl font-black text-slate-950">{display}</div><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}

export function InsightBlock({ title, text, icon: Icon }: { title: string; text: string; icon: any }) {
  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5"><div className="flex gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[var(--brand)]"><Icon size={20}/></div><div><h3 className="font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div></div></div>;
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: any[], fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(false);
  useEffect(() => { let active = true; setLoading(true); loader().then((value) => { if (active) setData(value); }).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

export function normaliseComparisonRows(data: AnyObj | null): Candidate[] {
  const rows = data?.results || data?.locations || data?.comparison || [];
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.map((row: AnyObj, index: number) => ({
    label: row.label || row.name || `Candidate ${index + 1}`,
    latitude: safeNumber(row.latitude),
    longitude: safeNumber(row.longitude),
    opportunity_score: safeNumber(row.opportunity_score ?? row.score),
    demand_score: safeNumber(row.demand_score),
    access_score: safeNumber(row.access_score ?? row.accessibility_score),
    competition_pressure: safeNumber(row.competition_pressure),
    confidence_score: safeNumber(row.confidence_score),
    recommendation: row.recommendation || row.decision_signal || "Compare this location with nearby alternatives before committing",
  }));
}

export function EmptyDataPanel({ title, text }: { title: string; text: string }) {
  return <div className="empty-state-card"><strong>{title}</strong><span>{text}</span></div>;
}

export function normaliseSavedLocation(item: AnyObj) {
  const latitude = safeNumber(item.latitude);
  const longitude = safeNumber(item.longitude);
  return {
    id: item.id != null ? String(item.id) : `${item.label || item.name || "location"}-${latitude}-${longitude}`,
    label: item.label || item.name || "Saved location",
    business_category: item.business_category || "pharmacy",
    latitude,
    longitude,
    latest_opportunity_score: item.latest_opportunity_score ?? item.opportunity_score,
    updated_at: item.updated_at || item.created_at,
    notes: item.notes,
  };
}

export function locationQuery(location: ReturnType<typeof normaliseSavedLocation>) {
  const params = new URLSearchParams({
    saved: location.id,
    label: location.label,
    category: location.business_category,
    lat: String(location.latitude),
    lon: String(location.longitude),
  });
  return params.toString();
}

export function candidateReportQuery(row: Candidate, category: string) {
  const params = new URLSearchParams({
    label: row.label,
    category,
    lat: String(row.latitude),
    lon: String(row.longitude),
  });
  return params.toString();
}
