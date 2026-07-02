"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { Bookmark, Building2, FileText, GitCompare, Lock, LogIn, Map, Menu, Search, X } from "lucide-react";

const primaryNav = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/insights", label: "Insights", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/reports", label: "Reports", icon: FileText },
];

const mapRoutes = new Set(["/map", "/opportunity", "/scout", "/competitive", "/workspace"]);
const appRoutesWithoutFooter = new Set(["/map", "/opportunity", "/scout", "/competitive", "/workspace"]);

function isActive(pathname: string, href: string) {
  if (href === "/map") return mapRoutes.has(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#10231f] text-white shadow-sm">
        <Building2 size={compact ? 19 : 21} />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="display-font truncate text-xl font-black tracking-[-0.05em]">BizIntel</div>
          <div className="hidden truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 sm:block">Business opportunity intelligence</div>
        </div>
      )}
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"signin" | "create">("signin");
  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="presentation">
      <section className="auth-modal" onClick={(event) => event.stopPropagation()} aria-label="Account access">
        <button className="auth-close" onClick={onClose} aria-label="Close sign in"><X size={18} /></button>
        <div className="auth-illustration" aria-hidden="true">
          <div className="auth-mini-map">
            {Array.from({ length: 64 }).map((_, index) => {
              const row = Math.floor(index / 8);
              const col = index % 8;
              const distance = Math.abs(row - 4) + Math.abs(col - 4);
              return <span key={index} className={distance < 2 ? "hot" : distance < 4 ? "warm" : "cool"} />;
            })}
          </div>
          <div className="auth-score-card"><strong>76</strong><span>Promising</span></div>
        </div>
        <div className="auth-content">
          <BrandMark />
          <h2>{tab === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p>Save candidate locations, create reports, track changes and submit field checks from one workspace</p>
          <div className="auth-tabs" role="tablist">
            <button onClick={() => setTab("signin")} className={tab === "signin" ? "active" : ""}>Sign in</button>
            <button onClick={() => setTab("create")} className={tab === "create" ? "active" : ""}>Create account</button>
          </div>
          <form className="auth-form">
            {tab === "create" && <label>Full name<input className="input-modern" placeholder="Aline Uwase" /></label>}
            <label>Email<input className="input-modern" placeholder="you@example.com" /></label>
            <label>Password<input className="input-modern" type="password" placeholder="••••••••" /></label>
            <button type="button" className="btn-primary w-full"><Lock size={16} /> {tab === "signin" ? "Sign in" : "Create account"}</button>
          </form>
        </div>
      </section>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const nav = useMemo(() => primaryNav, []);
  const showFooter = pathname === "/" || !appRoutesWithoutFooter.has(pathname);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/88 backdrop-blur-xl">
        <div className="app-container flex min-h-[72px] items-center justify-between gap-4 py-2.5">
          <Link href="/" aria-label="BizIntel home"><BrandMark /></Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
            {nav.map(({ href, label }) => (
              <Link key={href} href={href} className={`rounded-full px-4 py-2.5 text-sm font-black transition ${isActive(pathname, href) ? "bg-[#10231f] text-white shadow-md" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}>{label}</Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button onClick={() => setAuthOpen(true)} className="btn-primary px-4 py-2.5 text-sm"><LogIn size={16} /> Sign in</button>
          </div>

          <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-2xl border border-[var(--line)] bg-white xl:hidden" aria-label="Open menu"><Menu /></button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm xl:hidden" onClick={() => setOpen(false)}>
          <div className="ml-auto h-full w-[88%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <BrandMark />
              <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-white" aria-label="Close menu"><X size={18} /></button>
            </div>
            <nav className="mt-6 grid gap-2" aria-label="Mobile navigation">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black ${isActive(pathname, href) ? "bg-[#10231f] text-white" : "bg-slate-50 text-slate-700"}`}><Icon size={18} /> {label}</Link>
              ))}
              <button onClick={() => { setOpen(false); setAuthOpen(true); }} className="mt-3 flex items-center gap-3 rounded-2xl bg-[#10231f] px-4 py-3 text-sm font-black text-white"><LogIn size={18} /> Sign in</button>
            </nav>
          </div>
        </div>
      )}

      {children}

      {showFooter && (
        <footer className="border-t border-[var(--line)] bg-slate-50">
          <div className="app-container grid gap-8 py-10 md:grid-cols-[1fr_auto_auto]">
            <div>
              <BrandMark />
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">ML powered spatial business intelligence for urban microbusinesses in Kigali</p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600"><strong className="text-slate-950">Product</strong><Link href="/map">Map</Link><Link href="/compare">Compare</Link><Link href="/insights">Insights</Link></div>
            <div className="grid gap-2 text-sm text-slate-600"><strong className="text-slate-950">Workspace</strong><Link href="/saved">Saved</Link><Link href="/reports">Reports</Link><Link href="/field-validation">Field checks</Link></div>
          </div>
        </footer>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
