"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import { submitValidationPoint } from "@/lib/platform-api";
import { PageHeader } from "@/components/platform/pageHelpers";

const CHECKS_TO_VERIFY = [
  "Visible informal competitors",
  "Actual foot traffic at different times",
  "Shop frontage, signage and visibility",
  "Rent availability and condition",
  "Safety, access and parking",
  "Whether the business category fits local behaviour",
];

export function FieldValidationPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({ business_category: "pharmacy", latitude: "", longitude: "", foot_traffic: "", visible_competitors: "", notes: "" });

  async function submit() {
    try {
      await submitValidationPoint({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), foot_traffic: Number(form.foot_traffic), visible_competitors: Number(form.visible_competitors) });
      setStatus("Field check saved. It can be used to validate map signals and improve future confidence");
    } catch {
      setStatus("Could not save field check. Confirm the service is available.");
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow="Field checks" title="Verify what public data cannot see" text="Use field checks to validate informal competitors, visibility, foot traffic, rent signals and real business activity" />
      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Submit field check</h2>
          <div className="mt-4 space-y-3">
            <select className="input-modern" value={form.business_category} onChange={(e) => setForm({ ...form, business_category: e.target.value })}>{BUSINESS_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <input className="input-modern" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            <input className="input-modern" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-modern" placeholder="Foot traffic" value={form.foot_traffic} onChange={(e) => setForm({ ...form, foot_traffic: e.target.value })} />
              <input className="input-modern" placeholder="Visible competitors" value={form.visible_competitors} onChange={(e) => setForm({ ...form, visible_competitors: e.target.value })} />
            </div>
            <textarea className="input-modern min-h-[130px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes from the field" />
            <button onClick={submit} className="btn-primary w-full"><ClipboardCheck size={16} /> Submit field check</button>
            {status && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{status}</p>}
          </div>
        </aside>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="display-font text-3xl font-black">What to verify</h2>
          <div className="mt-6 grid gap-3">{CHECKS_TO_VERIFY.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold"><CheckCircle2 className="size-4 text-emerald-700" />{item}</div>)}</div>
        </section>
      </div>
    </main>
  );
}
