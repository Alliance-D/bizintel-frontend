type Props = {
  status: any;
};

export function ModelStatusPanel({ status }: Props) {
  const active = status?.active_model;
  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="text-sm uppercase tracking-[0.22em] text-slate-400">ML registry</div>
      <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Model control room</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        Compare candidate ML models, register the best performers and serve the active model to map and scout experiences.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Registry</div>
          <div className="mt-2 text-2xl font-semibold text-white">{status?.registry_ready ? "Ready" : "Not ready"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Models</div>
          <div className="mt-2 text-2xl font-semibold text-white">{status?.model_count ?? 0}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Active model</div>
          <div className="mt-2 text-2xl font-semibold text-white">{active?.model_name || "No active model"}</div>
        </div>
      </div>

      {active ? (
        <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          Active model: <span className="font-semibold">{active.model_name}</span> for {active.target_name}. Primary metric: {active.primary_metric} = {Number(active.primary_metric_value || 0).toFixed(3)}.
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          No active ML model is registered yet. Register a model before using model-based assessments.
        </div>
      )}
    </section>
  );
}
