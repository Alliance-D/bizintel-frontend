"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";
import { login, register } from "@/lib/platform-api";
import { setSession } from "@/lib/auth";
import { BrandMark } from "@/components/layout/BrandMark";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"signin" | "create">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password.trim() || (tab === "create" && !fullName.trim())) {
      setError("Fill in all fields to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const response = tab === "signin" ? await login(email, password) : await register(fullName, email, password);
      setSession(response.access_token, response.user);
      onClose();
    } catch {
      setError(tab === "signin" ? "Incorrect email or password." : "Could not create an account with these details. The email may already be in use.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <button onClick={() => { setTab("signin"); setError(null); }} className={tab === "signin" ? "active" : ""}>Sign in</button>
            <button onClick={() => { setTab("create"); setError(null); }} className={tab === "create" ? "active" : ""}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            {tab === "create" && (
              <label>Full name
                <input className="input-modern" placeholder="Aline Uwase" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
            )}
            <label>Email
              <input className="input-modern" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>Password
              <input className="input-modern" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              <Lock size={16} /> {submitting ? "Please wait" : tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
