"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bookmark, FileText, GitCompare, LogIn, LogOut, Map, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { AUTH_CHANGED_EVENT, AuthUser, clearSession, getUser, hasAdminAccess } from "@/lib/auth";
import { AuthModal } from "@/components/layout/AuthModal";
import { BrandMark } from "@/components/layout/BrandMark";

const primaryNav = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/insights", label: "Insights", icon: Search },
  { href: "/advisor", label: "AI Advisor", icon: Sparkles },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/reports", label: "Reports", icon: FileText },
];

const mapRoutes = new Set(["/map", "/opportunity", "/scout", "/competitive", "/workspace"]);
const appRoutesWithoutFooter = new Set(["/map", "/opportunity", "/scout", "/competitive", "/workspace"]);

function isActive(pathname: string, href: string) {
  if (href === "/map") return mapRoutes.has(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    setUser(getUser());
    const onChange = () => setUser(getUser());
    window.addEventListener(AUTH_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return user;
}

function AccountControl({ user, onSignInClick }: { user: AuthUser | null; onSignInClick: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return (
      <button onClick={onSignInClick} className="btn-primary px-4 py-2.5 text-sm">
        <LogIn size={16} /> Sign in
      </button>
    );
  }

  function signOut() {
    clearSession();
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <div className="relative">
      <button onClick={() => setMenuOpen((open) => !open)} className="btn-secondary px-4 py-2.5 text-sm">
        {user.full_name.split(" ")[0]}
        {hasAdminAccess() && <ShieldCheck size={14} className="text-emerald-700" />}
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
          <div className="px-3 py-2 text-xs font-bold text-slate-500">{user.email}</div>
          {hasAdminAccess() && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <ShieldCheck size={16} /> Admin dashboard
            </Link>
          )}
          <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Profile
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const nav = useMemo(() => primaryNav, []);
  const showFooter = pathname === "/" || !appRoutesWithoutFooter.has(pathname);
  const user = useAuthUser();

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
            <AccountControl user={user} onSignInClick={() => setAuthOpen(true)} />
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
              {user ? (
                <>
                  {hasAdminAccess() && (
                    <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700"><ShieldCheck size={18} /> Admin dashboard</Link>
                  )}
                  <button onClick={() => { clearSession(); setOpen(false); }} className="mt-3 flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600"><LogOut size={18} /> Sign out</button>
                </>
              ) : (
                <button onClick={() => { setOpen(false); setAuthOpen(true); }} className="mt-3 flex items-center gap-3 rounded-2xl bg-[#10231f] px-4 py-3 text-sm font-black text-white"><LogIn size={18} /> Sign in</button>
              )}
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
