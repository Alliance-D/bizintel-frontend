"use client";

import { ArrowRight, BookmarkPlus, Compass, ShieldCheck } from "lucide-react";
import { ScorePill } from "@/components/experience/ScorePill";

export function InsightDrawer({ insight, loading }: { insight: any; loading?: boolean }) {
  if (loading) {
    return <aside className="glass-panel rounded-[2rem] p-5"><div className="h-6 w-40 animate-pulse rounded-full bg-white/10"/><div className="mt-5 grid grid-cols-2 gap-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-24 animate-pulse rounded-2xl bg-white/10"/>)}</div></aside>;
  }
  if (!insight) {
    return <aside className="glass-panel rounded-[2rem] p-5 text-sm text-slate-300">Click a location on the map to open an ML scout insight.</aside>;
  }
  if (insight.status !== "ready") {
    return <aside className="glass-panel rounded-[2rem] p-5"><h3 className="text-lg font-semibold text-white">Not ready</h3><p className="mt-2 text-sm text-slate-300">{insight.message}</p></aside>;
  }
  const cards = insight.insight_cards || [];
  return (
    <aside className="glass-panel max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">{insight.badge}</div>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">{insight.headline}</h2>
        </div>
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 p-3 text-emerald-100"><Compass size={22}/></div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {cards.map((card: any) => <ScorePill key={card.title} label={card.title} value={card.value} tone={card.tone}/>) }
      </div>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck size={17}/> Next best step</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">{insight.next_step}</p>
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-sm font-semibold text-white">Competition nearby</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-2xl bg-white/[0.05] p-3"><div className="text-xl font-semibold text-white">{insight.competitors?.within_300m ?? 0}</div><div className="text-xs text-slate-400">300m</div></div>
          <div className="rounded-2xl bg-white/[0.05] p-3"><div className="text-xl font-semibold text-white">{insight.competitors?.within_500m ?? 0}</div><div className="text-xs text-slate-400">500m</div></div>
          <div className="rounded-2xl bg-white/[0.05] p-3"><div className="text-xl font-semibold text-white">{insight.competitors?.within_1000m ?? 0}</div><div className="text-xs text-slate-400">1km</div></div>
        </div>
      </section>

      <section className="mt-4 space-y-2">
        {(insight.actions || []).map((action: string, index: number) => (
          <div key={action} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-xs font-bold text-slate-950">{index + 1}</span>
            <span>{action}</span>
          </div>
        ))}
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"><BookmarkPlus size={16}/> Save</button>
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white">Compare <ArrowRight size={16}/></button>
      </div>
    </aside>
  );
}
