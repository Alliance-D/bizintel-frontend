import { getLiveDataReadiness } from "@/lib/api";

export default async function LiveDataReadiness() {
  const readiness = await getLiveDataReadiness();
  const layers = readiness?.layers || [];
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Live data</p>
          <h2 className="text-xl font-semibold text-white">Data readiness</h2>
        </div>
        <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
          {readiness?.ready_layers || 0}/{readiness?.total_layers || 0} ready
        </div>
      </div>
      <div className="space-y-2">
        {layers.length === 0 && <p className="text-sm text-slate-400">Import approved datasets to activate live opportunity layers.</p>}
        {layers.map((layer: any) => (
          <div key={layer.layer} className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
            <div>
              <p className="font-medium text-slate-100">{layer.layer}</p>
              <p className="text-xs text-slate-500">{layer.last_loaded ? new Date(layer.last_loaded).toLocaleString() : "not loaded"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">{Number(layer.rows || 0).toLocaleString()} rows</p>
              <p className={layer.status === "ready" ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>{layer.status}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
