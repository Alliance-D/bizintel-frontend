"use client";

import { useEffect, useMemo, useState } from "react";
import { getLiveLocationContext, getLiveOpportunityPoints } from "@/lib/api";

const categories = ["salon", "pharmacy", "cafe", "grocery", "restaurant", "retail", "mobile_money"];

export default function LiveOpportunityExplorer() {
  const [category, setCategory] = useState("salon");
  const [points, setPoints] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [context, setContext] = useState<any | null>(null);

  useEffect(() => {
    getLiveOpportunityPoints(category, 500).then((res) => setPoints(res?.points || []));
  }, [category]);

  const top = useMemo(() => points.slice(0, 8), [points]);

  async function inspect(point: any) {
    setSelected(point);
    const res = await getLiveLocationContext({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      business_category: category,
      radius_meters: 1000,
    });
    setContext(res);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Opportunity Explorer</p>
            <h1 className="text-2xl font-semibold text-white">Live opportunity points</h1>
            <p className="text-sm text-slate-400">Connected to <code>ml.live_opportunity_cache</code>.</p>
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100">
            {categories.map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {top.map((point) => (
            <button key={point.id} onClick={() => inspect(point)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">{point.opportunity_type || "opportunity"}</span>
                <span className="text-2xl font-black text-white">{Math.round(point.opportunity_score || 0)}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-100">{point.grid_id}</p>
              <p className="text-xs text-slate-500">{Number(point.latitude).toFixed(4)}, {Number(point.longitude).toFixed(4)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <span>Demand {Math.round(point.demand_score || 0)}</span>
                <span>Access {Math.round(point.access_score || 0)}</span>
                <span>Competition {Math.round(point.competition_score || 0)}</span>
                <span>Confidence {Math.round((point.confidence_score || 0) * 100)}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <aside className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Inspection</p>
        {!selected && <p className="mt-4 text-sm text-slate-400">Select an opportunity point to inspect live population and cache context.</p>}
        {selected && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-slate-400">Selected point</p>
              <h2 className="text-xl font-semibold text-white">{selected.grid_id}</h2>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Opportunity score</p>
              <p className="text-4xl font-black text-white">{Math.round(selected.opportunity_score || 0)}</p>
              <p className="text-sm text-cyan-200">{selected.opportunity_type}</p>
            </div>
            {context && (
              <div className="rounded-2xl bg-white/[0.03] p-4 text-sm text-slate-300">
                <p className="font-medium text-white">Live context</p>
                <p>Population avg: {Math.round(context.population?.avg_density || 0).toLocaleString()}</p>
                <p>Population samples: {context.population?.sample_count || 0}</p>
                <p>Data confidence: {context.data_confidence?.level}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </section>
  );
}
