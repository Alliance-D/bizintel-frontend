type Props = {
  features: any[];
};

export function FeatureImportanceList({ features }: Props) {
  if (!features?.length) {
    return <div className="glass-panel rounded-[2rem] p-6 text-sm text-slate-400">Feature importance will appear after a model is registered.</div>;
  }

  const max = Math.max(...features.map((f) => Number(f.importance_value || 0)), 0.0001);
  return (
    <div className="glass-panel rounded-[2rem] p-6">
      <div className="text-sm uppercase tracking-[0.22em] text-slate-400">Feature importance</div>
      <div className="mt-5 space-y-3">
        {features.slice(0, 15).map((f) => (
          <div key={`${f.model_version_id}-${f.feature_name}`}>
            <div className="mb-1 flex items-center justify-between gap-4 text-xs">
              <span className="truncate text-slate-200">{f.feature_name}</span>
              <span className="text-slate-500">{Number(f.importance_value || 0).toFixed(4)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, (Number(f.importance_value || 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
