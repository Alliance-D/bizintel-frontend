const scenarios = [
  {title:'Scout a salon location', persona:'Youth entrepreneur', story:'Drop a pin, inspect demand, competition, confidence, and practical next steps.'},
  {title:'Find underserved zones', persona:'Business advisor', story:'Switch category layers and identify high-demand, low-supply cells.'},
  {title:'Compare three rental options', persona:'Existing owner', story:'Rank sites by demand, risk, access, competition, and category fit.'},
  {title:'Explain competitive advantage', persona:'Microfinance analyst', story:'Show competitor pressure, catchment risks, and underserved pockets.'},
];

export function DemoScenarioBoard(){
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {scenarios.map((scenario, index) => <article key={scenario.title} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Scenario {index+1}</div>
      <h3 className="mt-3 text-lg font-semibold text-white">{scenario.title}</h3>
      <p className="mt-2 text-sm text-slate-400">{scenario.persona}</p>
      <p className="mt-4 text-sm leading-6 text-slate-300">{scenario.story}</p>
    </article>)}
  </div>
}
