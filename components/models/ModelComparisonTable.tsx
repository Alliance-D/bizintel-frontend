type Props = {
  models: any[];
};

export function ModelComparisonTable({ models }: Props) {
  if (!models?.length) {
    return (
      <div className="glass-panel rounded-[2rem] p-8 text-sm text-slate-400">
        No model versions are registered yet. Train candidate models and register the best artifact to activate ML-backed scoring.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-slate-400">
          <tr>
            <th className="px-5 py-4">Model</th>
            <th className="px-5 py-4">Task</th>
            <th className="px-5 py-4">Target</th>
            <th className="px-5 py-4">Metric</th>
            <th className="px-5 py-4">Rows</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Created</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id} className="border-b border-white/5 last:border-0">
              <td className="px-5 py-4 font-medium text-white">{m.model_name}</td>
              <td className="px-5 py-4 text-slate-300">{m.task_type}</td>
              <td className="px-5 py-4 text-slate-300">{m.target_name}</td>
              <td className="px-5 py-4 text-slate-300">{m.primary_metric}: {Number(m.primary_metric_value || 0).toFixed(3)}</td>
              <td className="px-5 py-4 text-slate-300">{Number(m.training_rows || 0).toLocaleString()} / {Number(m.validation_rows || 0).toLocaleString()}</td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-3 py-1 text-xs ${m.is_active ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-300"}`}>
                  {m.is_active ? "Active" : "Registered"}
                </span>
              </td>
              <td className="px-5 py-4 text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
