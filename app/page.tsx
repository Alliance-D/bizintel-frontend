"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowRight, BarChart3, Bell, CheckCircle2, FileText, Map, MapPin, Radar } from "lucide-react";
import { useLocale } from "@/lib/locale";

function ProductIllustration({ t }: { t: ReturnType<typeof useLocale>["t"] }) {
  return (
    <div className="hero-illustration" aria-label="BizIntel product preview">
      <div className="hero-map-tile">
        <div className="hero-map-top"><span>{t("home_hero_kigali")}</span><strong>{t("home_hero_salon")}</strong></div>
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
        <div className="kicker">{t("home_hero_location_screen")}</div>
        <h3>{t("home_hero_live_cell")}</h3>
        <div className="hero-score-row"><span>{t("home_hero_demand")}</span><strong>89</strong></div>
        <div className="hero-score-row"><span>{t("home_hero_access")}</span><strong>82</strong></div>
        <div className="hero-score-row warn"><span>{t("home_hero_competition")}</span><strong>63</strong></div>
        <p>{t("home_hero_summary")}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useLocale();

  const modes = [
    { title: t("home_mode_opportunity_title"), text: t("home_mode_opportunity_text"), icon: Map, href: "/map" },
    { title: t("home_mode_scout_title"), text: t("home_mode_scout_text"), icon: MapPin, href: "/scout" },
    { title: t("home_mode_competitive_title"), text: t("home_mode_competitive_text"), icon: Radar, href: "/competitive" },
  ];

  const dataLayers = [
    t("home_layer_population"), t("home_layer_establishment"), t("home_layer_osm"), t("home_layer_roads"),
    t("home_layer_boundaries"), t("home_layer_mobility"), t("home_layer_welfare"), t("home_layer_field"),
  ];

  const steps: Array<[string, string, typeof MapPin]> = [
    [t("home_step1_title"), t("home_step1_text"), MapPin],
    [t("home_step2_title"), t("home_step2_text"), BarChart3],
    [t("home_step3_title"), t("home_step3_text"), FileText],
    [t("home_step4_title"), t("home_step4_text"), Bell],
  ];

  return (
    <AppShell>
      <section className="app-container grid gap-12 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-extrabold text-slate-700"><span className="size-2 rounded-full bg-[var(--brand)]" /> {t("home_badge")}</div>
          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">{t("home_headline")}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{t("home_subhead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary">{t("home_open_map")} <ArrowRight size={18}/></Link>
            <Link href="/scout" className="btn-secondary">{t("home_try_scout")}</Link>
          </div>
          <div className="mt-10 grid max-w-2xl gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-3">
            {[t("home_pill_scoring"), t("home_pill_ml"), t("home_pill_field")].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-extrabold text-slate-700"><CheckCircle2 className="size-4 text-[var(--brand)]" />{item}</div>)}
          </div>
        </div>

        <ProductIllustration t={t} />
      </section>

      <section className="border-y border-[var(--line)] bg-slate-50/70 py-16">
        <div className="app-container">
          <div className="max-w-3xl"><div className="kicker">{t("home_modes_kicker")}</div><h2 className="mt-4 display-font text-4xl font-black tracking-[-0.05em]">{t("home_modes_title")}</h2><p className="mt-4 leading-7 text-slate-600">{t("home_modes_text")}</p></div>
          <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white md:grid-cols-3">
            {modes.map(({ title, text, icon: Icon, href }) => <Link href={href} key={title} className="group border-[var(--line)] p-7 transition hover:bg-slate-50 md:border-r last:border-r-0"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[var(--brand)]"><Icon size={22}/></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]">{t("home_open_link")} <ArrowRight size={16}/></span></Link>)}
          </div>
        </div>
      </section>

      <section className="app-container grid gap-10 py-16 lg:grid-cols-[.85fr_1fr] lg:items-center">
        <div><div className="kicker">{t("home_data_kicker")}</div><h2 className="mt-4 display-font text-4xl font-black tracking-[-0.05em]">{t("home_data_title")}</h2><p className="mt-5 leading-7 text-slate-600">{t("home_data_text")}</p></div>
        <div className="grid overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white sm:grid-cols-2">
          {dataLayers.map((item, index) => <div key={item} className="flex items-center gap-3 border-b border-r border-[var(--line)] p-4 text-sm font-bold"><span className="text-xs font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-slate-50/70 py-16">
        <div className="app-container">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="kicker">{t("home_workflow_kicker")}</div><h2 className="mt-4 display-font text-4xl font-black tracking-[-0.05em]">{t("home_workflow_title")}</h2></div><Link href="/insights" className="font-black text-[var(--brand)]">{t("home_methodology_link")} <ArrowRight className="inline" size={16}/></Link></div>
          <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white md:grid-cols-4">
            {steps.map(([title, text, Icon], index) => {
              const I = Icon;
              return <div key={String(title)} className="border-[var(--line)] p-7 md:border-r last:border-r-0"><div className="text-sm font-bold text-slate-400">{t("home_step_label")} {String(index + 1).padStart(2, '0')}</div><I className="mt-4 text-[var(--brand)]" size={20}/><h3 className="mt-5 text-lg font-black">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{String(text)}</p></div>
            })}
          </div>
        </div>
      </section>

      <section className="app-container py-16">
        <div className="rounded-[2rem] bg-[#10231f] p-8 text-white shadow-2xl shadow-slate-900/10 md:p-12">
          <div className="max-w-2xl"><h2 className="display-font text-4xl font-black tracking-[-0.05em]">{t("home_cta_title")}</h2><p className="mt-5 leading-7 text-white/75">{t("home_cta_text")}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/map" className="rounded-full bg-white px-5 py-3 font-black text-slate-950">{t("home_cta_explore")}</Link><Link href="/login" className="rounded-full border border-white/20 px-5 py-3 font-black text-white">{t("home_cta_create_account")}</Link></div></div>
        </div>
      </section>
    </AppShell>
  );
}
