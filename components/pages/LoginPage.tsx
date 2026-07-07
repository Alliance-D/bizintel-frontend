"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { login, register, extractApiErrorMessage } from "@/lib/platform-api";
import { setSession } from "@/lib/auth";
import { useLocale } from "@/lib/locale";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [tab, setTab] = useState<"signin" | "create">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password.trim() || (tab === "create" && !fullName.trim())) {
      setError(t("fill_all_fields"));
      return;
    }
    setSubmitting(true);
    try {
      const response = tab === "signin" ? await login(email, password) : await register(fullName, email, password);
      setSession(response.access_token, response.user);
      router.push(searchParams.get("next") || "/");
    } catch (err) {
      const fallback = tab === "signin" ? t("incorrect_credentials") : t("could_not_create_account");
      setError(extractApiErrorMessage(err, fallback));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="app-container grid min-h-[calc(100dvh-80px)] gap-10 py-14 lg:grid-cols-[.8fr_1fr] lg:items-center">
        <section>
          <Link href="/" className="inline-flex items-center gap-3 font-black text-slate-950"><BrandMark compact /> BizIntel</Link>
          <h1 className="mt-12 display-font text-5xl font-black tracking-[-0.05em] text-slate-950">{tab === "signin" ? t("welcome_back") : t("create_account")}</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">{t("login_page_subtitle")}</p>
          <ul className="mt-8 grid gap-3 text-sm font-bold text-slate-600">
            <li>{t("login_benefit_locations")}</li>
            <li>{t("login_benefit_reports")}</li>
            <li>{t("login_benefit_alerts")}</li>
            <li>{t("login_benefit_field")}</li>
          </ul>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-slate-900/5">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button onClick={() => { setTab("signin"); setError(null); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "signin" ? "bg-white shadow" : "text-slate-500"}`}>{t("sign_in")}</button>
            <button onClick={() => { setTab("create"); setError(null); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "create" ? "bg-white shadow" : "text-slate-500"}`}>{t("create_account")}</button>
          </div>
          <form className="mt-7 grid gap-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            {tab === "create" && (
              <label className="grid gap-2 text-sm font-bold text-slate-600">{t("full_name")}
                <input className="input-modern" placeholder="e.g. Aline" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
            )}
            <label className="grid gap-2 text-sm font-bold text-slate-600">{t("email")}
              <input className="input-modern" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-600">{t("password")}
              <input className="input-modern" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              <Lock size={16} /> {submitting ? t("please_wait") : tab === "signin" ? t("sign_in") : t("create_account")}
            </button>
            <p className="text-sm leading-6 text-slate-500">{t("account_access_note")}</p>
          </form>
        </section>
      </div>
    </main>
  );
}
