import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowRight, BarChart3, Bell, Building2, CheckCircle2, Database, FileText, GitCompare, Map, MapPin, Radar, ShieldCheck } from "lucide-react";

const modes = [
  { title: "Opportunity Map", text: "Scan Kigali with business category filters and grid based opportunity layers", icon: Map, href: "/map" },
  { title: "Scout Mode", text: "Drop a pin on a candidate space and read the score, risks and next checks", icon: MapPin, href: "/scout" },
  { title: "Competitive Advantage", text: "Read supply pressure, saturation and gaps around the places you are considering", icon: Radar, href: "/competitive" },
];

const dataLayers = ["Population density", "Establishment census", "OpenStreetMap POIs", "Roads and access", "Administrative boundaries", "Mobility signals", "Household welfare", "Field checks"];

function ProductIllustration() {
  return (
    <div className="hero-illustration" aria-label="BizIntel product preview">
      <div className="hero-map-tile">
        <div className="hero-map-top"><span>Kigali</span><strong>Salon</strong></div>
        <div className="hero-grid-preview">
          {Array.from({ length: 96 }).map((_, index) => {
            const row = Math.floor(index / 12);
            const col = index % 12;
            const distance = Math.abs(row - 5) + Math.abs(col - 6);
            return <span key={index} className={distance < 3 ? "strong" : distance < 5 ? "medium" : "low"} />;
          })}
        </div>
        <div className="hero-pin" />
      </div>
      <div className="hero-agent-card">
        <div className="kicker">Location screen</div>
        <h3>Live Kigali cell</h3>
        <div className="hero-score-row"><span>Demand</span><strong>89</strong></div>
        <div className="hero-score-row"><span>Access</span><strong>82</strong></div>
        <div className="hero-score-row warn"><span>Competition</span><strong>63</strong></div>
        <p>Promising area. Compare alternatives, then verify rent and informal competitors</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <section className="app-container grid gap-12 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-extrabold text-slate-700"><span className="size-2 rounded-full bg-[var(--brand)]" /> Kigali opportunity intelligence</div>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">Find the right spot before you sign the lease</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">BizIntel maps demand, competition, access and commercial activity across Kigali, then helps entrepreneurs compare candidate locations by business category</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary">Open the map <ArrowRight size={18}/></Link>
            <Link href="/scout" className="btn-secondary">Try Scout Mode</Link>
          </div>
          <div className="mt-10 grid max-w-2xl gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-3">
            {["Grid based scoring", "Explainable ML", "Field validation"].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-extrabold text-slate-700"><CheckCircle2 className="size-4 text-[var(--brand)]" />{item}</div>)}
          </div>
        </div>

        <ProductIllustration />
      </section>

      <section className="border-y border-[var(--line)] bg-slate-50/70 py-16">
        <div className="app-container">
          <div className="max-w-3xl"><div className="kicker">Three modes, one platform</div><h2 className="mt-4 display-font text-4xl font-black tracking-[-0.05em]">Decide where to open, expand or wait</h2><p className="mt-4 leading-7 text-slate-600">The same map supports broad discovery, exact location screening and competitive positioning</p></div>
          <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white md:grid-cols-3">
            {modes.map(({ title, text, icon: Icon, href }) => <Link href={href} key={title} className="group border-[var(--line)] p-7 transition hover:bg-slate-50 md:border-r last:border-r-0"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[var(--brand)]"><Icon size={22}/></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]">Open <ArrowRight size={16}/></span></Link>)}
          </div>
        </div>
      </section>

      <section className="app-container grid gap-10 py-16 lg:grid-cols-[.85fr_1fr] lg:items-center">
        <div><div className="kicker">Data stack</div><h2 className="mt-4 display-font text-4xl font-black tracking-[-0.05em]">Multiple data layers, joined into one location signal</h2><p className="mt-5 leading-7 text-slate-600">Raw datasets are cleaned into curated features, joined into location-level signals and scored by business category before they appear in the map</p></div>
        <div className="grid overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white sm:grid-cols-2">
          {dataLayers.map((item, index) => <div key={item} className="flex items-center gap-3 border-b border-r border-[var(--line)] p-4 text-sm font-bold"><span className="text-xs font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-slate-50/70 py-16">
        <div className="app-container">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="kicker">Workflow</div><h2 className="mt-4 display-font text-4xl font-black tracking-[-0.05em]">From map to lease in four steps</h2></div><Link href="/insights" className="font-black text-[var(--brand)]">See methodology insights <ArrowRight className="inline" size={16}/></Link></div>
          <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white md:grid-cols-4">
            {[['Pick a location', 'Pan the map or drop a pin where you are considering opening', MapPin], ['Read the scores', 'Understand demand, competition, access and confidence', BarChart3], ['Save and report', 'Save the place, compare alternatives and create a report', FileText], ['Track changes', 'Monitor score shifts and new competitor signals', Bell]].map(([title, text, Icon], index) => {
              const I = Icon as typeof MapPin;
              return <div key={String(title)} className="border-[var(--line)] p-7 md:border-r last:border-r-0"><div className="text-sm font-bold text-slate-400">Step {String(index + 1).padStart(2, '0')}</div><I className="mt-4 text-[var(--brand)]" size={20}/><h3 className="mt-5 text-lg font-black">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{String(text)}</p></div>
            })}
          </div>
        </div>
      </section>

      <section className="app-container py-16">
        <div className="rounded-[2rem] bg-[#10231f] p-8 text-white shadow-2xl shadow-slate-900/10 md:p-12">
          <div className="max-w-2xl"><h2 className="display-font text-4xl font-black tracking-[-0.05em]">Stop guessing where to open. Start scoring it</h2><p className="mt-5 leading-7 text-white/75">Explore the opportunity map freely. Sign in when you want to save locations, generate full reports and track changes over time</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/map" className="rounded-full bg-white px-5 py-3 font-black text-slate-950">Explore the map</Link><Link href="/login" className="rounded-full border border-white/20 px-5 py-3 font-black text-white">Create an account</Link></div></div>
        </div>
      </section>
    </AppShell>
  );
}
