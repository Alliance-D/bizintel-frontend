"use client";

import { useEffect, useState } from "react";
import { getWorkbenchStates } from "@/lib/api";
import { Bookmark, MapPinned } from "lucide-react";

export function SavedWorkbenchStates() {
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkbenchStates().then((data) => setStates(data?.states || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-slate-400">Loading saved workspaces...</div>;

  if (!states.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
        <Bookmark className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
        <h3 className="text-lg font-semibold text-white">No saved workbench states yet</h3>
        <p className="mt-2 text-sm text-slate-400">Save opportunity maps, filters, selected layers, and locations so users can resume research later.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {states.map((state) => (
        <article key={state.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.07]">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">{state.business_category}</span>
            <MapPinned className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">{state.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{state.description || "Saved opportunity workspace"}</p>
          <div className="mt-4 text-xs text-slate-500">Layers: {(state.active_layers || []).join(", ") || "opportunity"}</div>
        </article>
      ))}
    </div>
  );
}
