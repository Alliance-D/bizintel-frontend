export function DataCatalogTable({ datasets }: { datasets: any[] }) {
  if (!datasets.length) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        <div className="text-sm uppercase tracking-[0.22em] text-slate-400">No catalog rows yet</div>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Import dataset metadata into PostGIS to populate this dashboard with available layers, permission status and relevance notes.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-5 py-4">Dataset</th>
              <th className="px-5 py-4">Layer</th>
              <th className="px-5 py-4">Permission</th>
              <th className="px-5 py-4">Rows</th>
              <th className="px-5 py-4">Relevance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {datasets.map((item) => (
              <tr key={item.dataset_key} className="align-top hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.owner || "Unknown owner"}</div>
                </td>
                <td className="px-5 py-4 text-slate-300">{item.recommended_layer || "—"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                    {item.permission_status || "verify"}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-300">{item.rows_estimate?.toLocaleString?.() || item.rows_estimate || "—"}</td>
                <td className="max-w-lg px-5 py-4 text-slate-300">{item.relevance || "Inspect before use."}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
