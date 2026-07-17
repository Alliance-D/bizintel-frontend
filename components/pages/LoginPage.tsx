"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { login, extractApiErrorMessage } from "@/lib/platform-api";
import { setSession } from "@/lib/auth";
import { useLocale } from "@/lib/locale";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(t("fill_all_fields"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await login(email, password);
      setSession(response.access_token, response.user);
      router.push(searchParams.get("next") || "/admin");
    } catch (err) {
      setError(extractApiErrorMessage(err, t("incorrect_credentials")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="app-container flex min-h-[calc(100dvh-80px)] items-center justify-center py-14">
        <section className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-3 font-black text-slate-950"><BrandMark compact /> BizIntel</Link>
          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-slate-900/5">
            <h1 className="display-font text-3xl font-black tracking-[-0.04em] text-slate-950">{t("admin_sign_in")}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("login_page_subtitle")}</p>
            <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <label className="grid gap-2 text-sm font-bold text-slate-600">{t("email")}
                <input className="input-modern" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-600">{t("password")}
                <input className="input-modern" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              </label>
              {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                <Lock size={16} /> {submitting ? t("please_wait") : t("sign_in")}
              </button>
            </form>
            <p className="mt-4 text-xs leading-5 text-slate-400">{t("admin_sign_in_note")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
