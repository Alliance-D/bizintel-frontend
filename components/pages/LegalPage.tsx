"use client";

import { Fragment } from "react";
import { useLocale } from "@/lib/locale";
import { legalContent, LEGAL_CONTACT_EMAIL, type LegalSection } from "@/lib/legal-content";

// Turn any occurrence of the contact email inside a string into a mailto link.
function withEmail(text: string) {
  const parts = text.split(LEGAL_CONTACT_EMAIL);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <a className="font-semibold text-[var(--brand-2)] underline underline-offset-2" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      )}
    </Fragment>
  ));
}

function Section({ s }: { s: LegalSection }) {
  return (
    <div className="mt-8">
      <h3 className="text-[1.05rem] font-semibold text-[var(--ink)]">{s.h}</h3>
      {s.p?.map((para, i) => (
        <p key={i} className="mt-2 text-[15px] leading-7 text-[var(--ink-soft)]">{withEmail(para)}</p>
      ))}
      {s.ul && (
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-7 text-[var(--ink-soft)]">
          {s.ul.map((li, i) => <li key={i}>{li}</li>)}
        </ul>
      )}
    </div>
  );
}

export function LegalPage() {
  const { locale } = useLocale();
  const c = legalContent[locale] ?? legalContent.en;

  return (
    <main className="app-container py-14">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-[var(--line)] pb-8">
          <p className="kicker">{c.kicker}</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-[var(--ink)]">{c.title}</h1>
          <p className="mt-3 text-[14px] leading-6 text-[var(--muted)]">{c.effective}</p>
          <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            <a className="font-semibold text-[var(--brand-2)] underline underline-offset-4" href="#summary">{c.toc.summary}</a>
            <a className="font-semibold text-[var(--brand-2)] underline underline-offset-4" href="#privacy">{c.toc.privacy}</a>
            <a className="font-semibold text-[var(--brand-2)] underline underline-offset-4" href="#eula">{c.toc.eula}</a>
          </nav>
        </header>

        {/* short version */}
        <section id="summary" className="panel-flat mt-12 scroll-mt-24 p-6">
          <h2 className="text-[1.15rem] font-semibold text-[var(--ink)]">{c.summary.h}</h2>
          <ul className="mt-4 space-y-2 text-[15px] leading-7 text-[var(--ink-soft)]">
            {c.summary.ul.map((li, i) => <li key={i} className="flex gap-2"><span className="text-[var(--brand-2)]">&bull;</span><span>{li}</span></li>)}
          </ul>
          <p className="mt-4 text-[13.5px] text-[var(--muted)]">{c.summary.note}</p>
        </section>

        {/* privacy */}
        <section id="privacy" className="mt-14 scroll-mt-24">
          <h2 className="text-[1.6rem] font-semibold text-[var(--ink)]">{c.privacyH}</h2>
          {c.privacy.map((s, i) => <Section key={i} s={s} />)}
        </section>

        {/* eula */}
        <section id="eula" className="mt-16 scroll-mt-24 border-t border-[var(--line)] pt-12">
          <h2 className="text-[1.6rem] font-semibold text-[var(--ink)]">{c.eulaH}</h2>
          <p className="mt-3 text-[15px] leading-7 text-[var(--ink-soft)]">{c.eulaIntro}</p>
          {c.eula.map((s, i) => <Section key={i} s={s} />)}
        </section>

        {c.note && (
          <p className="mt-12 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-[13.5px] leading-6 text-[var(--muted)]">{c.note}</p>
        )}

        <footer className="mt-14 border-t border-[var(--line)] pt-8 text-[13px] text-[var(--muted)]">
          <p>{c.footer} {c.effective.split(".")[0]}.</p>
        </footer>
      </div>
    </main>
  );
}
