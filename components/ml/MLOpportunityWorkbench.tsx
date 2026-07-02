"use client";

import { useEffect, useMemo, useState } from "react";
import { assessMLOpportunity, getMLCategoryProfiles, getMLOpportunityStatus, getTopMLZones } from "@/lib/api";

type Category = {
  category_key: string;
  display_name: string;
  description?: string;
  weights: Record<string, number>;
};

function scoreLabel(score?: number) {
  if (score === undefined || score === null) return "Not scored";
  if (score >= 82) return "High opportunity";
  if (score >= 68) return "Promising";
  if (score >= 52) return "Moderate";
  if (score >= 35) return "Weak / risky";
  return "Low opportunity";
}

export function MLOpportunityWorkbench() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("salon");
  const [lat, setLat] = useState("-1.9441");
  const [lon, setLon] = useState("30.0619");
  const [status, setStatus] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedCategory = useMemo(() => categories.find((c) => c.category_key === category), [categories, category]);

  useEffect(() => {
    getMLCategoryProfiles().then((res) => {
      setCategories(res.categories || []);
      if (res.categories?.[0]?.category_key) setCategory(res.categories[0].category_key);
    });
    getMLOpportunityStatus().then(setStatus);
  }, []);

  useEffect(() => {
    getTopMLZones(category, 12).then((res) => setZones(res.zones || []));
  }, [category]);

  async function runAssessment() {
    setLoading(true);
    const result = await assessMLOpportunity({ latitude: Number(lat), longitude: Number(lon), business_category: category, radius_meters: 800 });
    setAssessment(result);
    setLoading(false);
  }

  const score = assessment?.overall?.opportunity_score;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">ML opportunity engine</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-5xl">ML Opportunity Engine</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Category-aware machine learning predictions for Kigali opportunity zones. This workbench connects model predictions, category profiles, nearby competition and map-ready opportunity rankings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Metric label="OSM POIs" value={status?.readiness?.osm_pois ?? 0} />
            <Metric label="Grid features" value={status?.readiness?.grid_features ?? 0} />
            <Metric label="Predictions" value={status?.readiness?.predictions ?? 0} />
            <Metric label="Categories" value={status?.readiness?.active_categories ?? 0} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-xl font-semibold text-white">Scout a location</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-slate-300">Business category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none">
              {categories.map((cat) => (
                <option key={cat.category_key} value={cat.category_key}>{cat.display_name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" value={lat} onChange={setLat} />
              <Field label="Longitude" value={lon} onChange={setLon} />
            </div>
            <button onClick={runAssessment} disabled={loading} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50">
              {loading ? "Running ML assessment..." : "Run ML assessment"}
            </button>
          </div>

          {selectedCategory && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-white">{selectedCategory.display_name}</h3>
              <p className="mt-1 text-sm text-slate-400">{selectedCategory.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                {Object.entries(selectedCategory.weights || {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-900 px-3 py-2">
                    <span className="capitalize text-slate-500">{k}</span>
                    <div className="text-white">{Number(v).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Assessment result</h2>
              <p className="mt-1 text-sm text-slate-400">ML-backed opportunity signal for the nearest scored grid cell.</p>
            </div>
            <div className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-200">{assessment?.status || "waiting"}</div>
          </div>

          {assessment?.status === "not_ready" && (
            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{assessment.message}</div>
          )}

          {assessment?.status === "ready" && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-300/20 to-cyan-300/10 p-6 text-center">
                <div className="text-sm text-slate-300">Opportunity score</div>
                <div className="mt-3 text-6xl font-bold text-white">{Math.round(score)}</div>
                <div className="mt-2 text-emerald-200">{scoreLabel(score)}</div>
                <div className="mt-4 text-xs text-slate-400">Confidence: {Math.round(assessment.overall.confidence_score)}%</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Factor label="Demand" value={assessment.factors.demand_score} />
                <Factor label="Accessibility" value={assessment.factors.accessibility_score} />
                <Factor label="Commercial activity" value={assessment.factors.commercial_activity_score} />
                <Factor label="Competition pressure" value={assessment.factors.competition_pressure} invert />
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-semibold text-white">Recommendation</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{assessment.recommendation}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Metric label="Competitors 300m" value={assessment.competition.within_300m} />
                  <Metric label="Competitors 500m" value={assessment.competition.within_500m} />
                  <Metric label="Competitors 1km" value={assessment.competition.within_1000m} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
        <h2 className="text-xl font-semibold text-white">Top ML-ranked zones</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <div key={zone.grid_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-white">{zone.grid_id}</div>
                <div className="rounded-full bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">{Math.round(zone.opportunity_score)}</div>
              </div>
              <div className="mt-2 text-sm text-slate-400">{zone.opportunity_type}</div>
              <div className="mt-3 text-xs text-slate-500">{Number(zone.latitude).toFixed(4)}, {Number(zone.longitude).toFixed(4)}</div>
            </div>
          ))}
          {zones.length === 0 && <p className="text-sm text-slate-400">No predictions yet. Score the opportunity grid to populate this view.</p>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}

function Factor({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const v = Math.round(Number(value || 0));
  const display = invert ? 100 - v : v;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-white">{v}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(4, Math.min(100, display))}%` }} />
      </div>
    </div>
  );
}
