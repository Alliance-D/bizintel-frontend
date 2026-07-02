"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getMapQualitySummary } from "@/lib/platform-api";
import { AlertTriangle, CheckCircle2, Droplets, MapPinned, Route, SearchCheck } from "lucide-react";

function numberValue(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function MetricCard({ title, value, text, icon: Icon }: { title: string; value: string | number; text: string; icon: any }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={20} /></div>
        <div>
          <div className="text-sm font-extrabold text-slate-500">{title}</div>
          <div className="mt-2 display-font text-3xl font-black text-slate-950">{value}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMapQualitySummary()
      .then((value) => { if (active) { setData(value); setError(null); } })
      .catch((err) => { if (active) setError(err?.message || "Could not load map quality summary"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summary = Array.isArray(data?.summary) ? data.summary : [];
  const summaryByStatus = useMemo(() => Object.fromEntries(summary.map((row: any) => [row.candidate_status, row])), [summary]);
  const candidateCount = numberValue(summaryByStatus.candidate?.count);
  const reviewCount = numberValue(summaryByStatus.review_low_signals?.count);
  const excludedWater = numberValue(summaryByStatus.excluded_water?.count);
  const total = candidateCount + reviewCount + excludedWater;
  const examples = Array.isArray(data?.review_examples) ? data.review_examples : [];

  return (
    <AppShell>
      <main className="app-container py-8 lg:py-12">
        <section className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="kicker text-emerald-700">Admin · Data quality</div>
            <h1 className="mt-4 max-w-5xl display-font text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-6xl">Map quality review</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Review which analysis areas are ready for normal map display, which need manual review, and which are likely not suitable candidate areas.</p>
          </div>
          <Link href="/admin/status" className="btn-secondary">System status</Link>
        </section>

        {loading && <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">Loading map quality summary…</div>}
        {error && <div className="rounded-[2rem] border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>}
        {!loading && data?.status === "not_configured" && (
          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 text-sm leading-7 text-amber-800">
            <strong>Quality screen not configured yet.</strong>
            <p className="mt-2">Run <code>python scripts/phase36_audit_map_quality.py</code> from the project root, then restart the backend.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total reviewed areas" value={total || "—"} text="Analysis areas evaluated by the latest quality screen." icon={MapPinned} />
          <MetricCard title="Candidate areas" value={candidateCount || "—"} text="Areas that passed the current map-quality screen." icon={CheckCircle2} />
          <MetricCard title="Needs review" value={reviewCount} text="Sparse supporting signals; useful for admin review before trusting the map view." icon={SearchCheck} />
          <MetricCard title="Likely non-candidate" value={excludedWater} text="Mostly water-like or non-commercial cells hidden from normal map results." icon={Droplets} />
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="display-font text-2xl font-black text-slate-950">Review examples</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">These are the first areas the admin should inspect if the map appears to score unsuitable places.</p>
          </div>
          {examples.length ? (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr><th className="p-4">Area</th><th>Status</th><th>Water overlap</th><th>Nearby POIs</th><th>Buildings</th><th>Roads</th><th>Warnings</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examples.map((row: any) => (
                  <tr key={row.grid_id}>
                    <td className="p-4 font-black text-slate-950">{row.district || "Kigali"}{row.sector ? ` · ${row.sector}` : ""}{row.cell ? ` · ${row.cell}` : ""}<p className="mt-1 text-xs font-bold text-slate-500">{row.grid_id}</p></td>
                    <td><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{row.candidate_status}</span></td>
                    <td>{numberValue(row.water_overlap_pct).toFixed(1)}%</td>
                    <td>{numberValue(row.poi_count_500)}</td>
                    <td>{numberValue(row.building_count_300)}</td>
                    <td>{numberValue(row.road_count_300)}</td>
                    <td className="max-w-[260px] text-xs font-bold text-slate-500">{Array.isArray(row.warning_labels) ? row.warning_labels.join(", ") : String(row.warning_labels || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-start gap-4 p-6 text-sm leading-6 text-slate-600"><AlertTriangle className="shrink-0 text-amber-600" size={20}/><p>No review examples are available yet. Run the quality audit script if this page has not been configured.</p></div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Route size={20} /></div>
            <div>
              <h2 className="font-black text-slate-950">How to interpret concerns</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">The model scores analysis areas from spatial signals. A score does not mean every square meter inside that area is usable. The quality screen helps remove obvious non-candidate cells and identifies areas that need field validation or better data before final interpretation.</p>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
