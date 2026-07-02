export function FeatureCatalogGrid({ features }: { features: any[] }) {
  if (!features.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <div key={feature.feature_name} className="glass-panel rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-brand">{feature.feature_group}</div>
              <h3 className="mt-2 text-lg font-semibold text-white">{feature.feature_name}</h3>
            </div>
            {feature.business_category_specific ? (
              <span className="rounded-full bg-brand/15 px-3 py-1 text-xs text-brand">category-aware</span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{feature.interpretation}</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
            {feature.calculation_method}
          </div>
        </div>
      ))}
    </div>
  );
}
