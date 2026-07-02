"use client";

import { MapPin } from "lucide-react";

export function OpportunityFeed({ feed, onFlyTo }: { feed: any; onFlyTo?: (lng: number, lat: number) => void }) {
  const items = feed?.items || [];
  return (
    <div className="glass-panel rounded-[2rem] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Recommended zones</div>
          <h3 className="mt-1 text-lg font-semibold text-white">Underserved and high-scoring cells</h3>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-400">No recommendation feed yet. Generate ML opportunity predictions first.</p>}
        {items.map((item: any) => (
          <button key={`${item.grid_id}-${item.business_category}`} onClick={() => onFlyTo?.(item.longitude, item.latitude)} className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.07]">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-white">{item.experience_badge}</div>
              <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-100">{Math.round(item.opportunity_score ?? 0)}</div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400"><MapPin size={13}/>{Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}</div>
            <p className="mt-2 text-sm leading-5 text-slate-300">{item.recommended_next_step}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
