const groups = [
  ['Data readiness', ['Dataset catalog reviewed', 'Restricted data permissions documented', 'Curated feature tables generated']],
  ['ML readiness', ['Training matrix built', 'Multiple models compared', 'Active model registered', 'Confidence logic checked']],
  ['Product readiness', ['Scout Mode works', 'Opportunity Map loads', 'Competitive Advantage tells a clear story', 'Reports export']],
  ['Deployment readiness', ['Environment variables set', 'Smoke tests pass', 'Security headers active', 'Backups and rollback documented']],
];

export function LaunchChecklist(){
  return <div className="grid gap-4 md:grid-cols-2">
    {groups.map(([title, items]) => <section key={title as string} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-300">
        {(items as string[]).map(item => <li key={item} className="flex items-start gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-300"/><span>{item}</span></li>)}
      </ul>
    </section>)}
  </div>
}
