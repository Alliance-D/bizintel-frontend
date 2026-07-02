"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, MapPin, SlidersHorizontal } from "lucide-react";
import { assessLocation } from "@/lib/api";
import { ScoreRing } from "@/components/cards/ScoreRing";

const categories = [
  { key: "salon", label: "Salon" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "cafe", label: "Café" },
  { key: "grocery", label: "Grocery" },
  { key: "restaurant", label: "Restaurant" },
];

export function MapWorkspace() {
  const [category, setCategory] = useState("salon");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runAssessment() {
    setLoading(true);
    try {
      const data = await assessLocation({
        latitude: -1.9441,
        longitude: 30.0619,
        business_category: category,
        radius_meters: 500,
        budget_level: "medium",
        risk_tolerance: "medium",
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)_380px] lg:p-5">
      <aside className="glass-panel rounded-[2rem] p-5">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-slate-400">
          <SlidersHorizontal size={16} /> Filters
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Opportunity Explorer</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Select a business category, explore the citywide opportunity surface, then run a scout assessment.
        </p>

        <div className="mt-6 space-y-3">
          {categories.map((item) => (
            <button
              key={item.key}
              onClick={() => setCategory(item.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                category === item.key
                  ? "border-brand/60 bg-brand/15 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={runAssessment}
          className="mt-6 w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Assessing..." : "Assess selected location"}
        </button>
      </aside>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-panel">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(74,222,128,0.20),transparent_23%),radial-gradient(circle_at_70%_58%,rgba(56,189,248,0.16),transparent_25%),linear-gradient(135deg,#0c1829,#06101d)]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

        <div className="relative z-10 flex h-full min-h-[560px] flex-col justify-between p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="glass-panel rounded-2xl px-4 py-3">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Kigali map canvas</div>
              <div className="mt-1 text-sm text-slate-200">MapLibre/deck.gl layer integration point</div>
            </div>
            <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-300">
              <Layers size={17} /> Demand · Access · Competition · Opportunity
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-brand/50 bg-brand/15 shadow-glow"
          >
            <MapPin className="text-brand" size={42} />
          </motion.div>

          <div className="grid gap-3 md:grid-cols-4">
            {["High opportunity", "Underserved", "Saturated", "Emerging"].map((label) => (
              <div key={label} className="glass-panel rounded-2xl p-4">
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${40 + label.length * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="glass-panel rounded-[2rem] p-5">
        {result ? (
          <div>
            <ScoreRing score={result.opportunity_score} label={result.opportunity_type} />
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Confidence: <span className="font-semibold text-white">{result.confidence}</span>
            </div>
            <div className="mt-5 space-y-3">
              {result.factors.map((factor: any) => (
                <div key={factor.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{factor.label}</div>
                    <div className="text-sm text-brand">{Math.round(factor.score)}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{factor.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-slate-400">Insight panel</div>
            <h2 className="mt-4 text-2xl font-semibold">Run an assessment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Results will appear here with opportunity score, factor breakdown, confidence and next steps.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
