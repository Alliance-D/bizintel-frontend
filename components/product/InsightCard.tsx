import { ReactNode } from 'react';
export function InsightCard({ title, value, caption, icon }: { title: string; value: ReactNode; caption?: string; icon?: ReactNode }) {
  return <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 backdrop-blur"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p><div className="mt-3 text-3xl font-semibold text-white">{value}</div></div><div className="rounded-2xl bg-white/5 p-3 text-emerald-300">{icon}</div></div>{caption && <p className="mt-3 text-sm leading-6 text-slate-400">{caption}</p>}</div>;
}
