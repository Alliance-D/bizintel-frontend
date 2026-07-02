const metrics = [
  ['Architecture', 'Complete scaffold', 'Frontend, backend, PostGIS, ML registry, product modules'],
  ['Data', 'Layer-ready', 'Raw, curated, geo, field, ML and app schemas'],
  ['ML', 'Comparison-ready', 'Model suite, registry, scoring cache and explainability hooks'],
  ['UX', 'Demo-ready', 'Workbench, map, insight drawer, watchlist, reports and mobile flow'],
];

export function SystemReadinessPanel(){
  return <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/10 via-white/[0.04] to-blue-500/10 p-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Release readiness</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Final checks before launch</h2>
      </div>
      <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">Readiness</div>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-4">
      {metrics.map(([label, value, text]) => <div key={label} className="rounded-3xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-semibold text-white">{value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      </div>)}
    </div>
  </section>
}
