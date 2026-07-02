"use client";

import { useEffect, useState } from "react";
import { AdvancedOpportunityMap } from "@/components/map/AdvancedOpportunityMap";
import { OpportunityFeed } from "@/components/experience/OpportunityFeed";
import { getCategoryStory, getRecommendationFeed } from "@/lib/api";

export function ExperienceWorkbench() {
  const [category, setCategory] = useState("salon");
  const [story, setStory] = useState<any>(null);
  const [feed, setFeed] = useState<any>(null);

  useEffect(() => {
    getCategoryStory(category).then(setStory);
    getRecommendationFeed(category, 8).then(setFeed);
  }, [category]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">Interactive opportunity workspace</div>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">Interactive ML opportunity workbench for business-location decisions.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Explore Kigali by business category, switch analysis layers, click cells for scout insight, and turn spatial ML predictions into practical opportunity decisions.</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/15 to-sky-400/10 p-6 backdrop-blur-xl">
          <div className="text-sm text-slate-300">Category story</div>
          <h2 className="mt-2 text-xl font-semibold capitalize text-white">{category}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{story?.narrative || "Generate predictions to unlock category stories."}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><div className="text-lg font-semibold text-white">{Math.round(story?.summary?.avg_opportunity ?? 0)}</div><div className="text-[11px] text-slate-400">Avg opp.</div></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><div className="text-lg font-semibold text-white">{Math.round(story?.summary?.avg_demand ?? 0)}</div><div className="text-[11px] text-slate-400">Demand</div></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><div className="text-lg font-semibold text-white">{Math.round(story?.summary?.avg_confidence ?? 0)}</div><div className="text-[11px] text-slate-400">Confidence</div></div>
          </div>
        </div>
      </section>
      <AdvancedOpportunityMap />
      <OpportunityFeed feed={feed}/>
    </div>
  );
}
