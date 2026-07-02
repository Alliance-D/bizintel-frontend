"use client";

import { useState } from "react";
import { submitValidationPoint } from "@/lib/api";

export function FieldValidationForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ business_category: "salon", latitude: -1.9441, longitude: 30.0619, observed_activity: "medium", pedestrian_level: "medium", visible_competitors: 2, informal_competitors: 1, visibility_score: 4, rent_signal: "unknown", model_score: 72, model_label: "high opportunity", validator_notes: "" });

  async function submit() {
    const result = await submitValidationPoint(form);
    setStatus(result?.validation_point ? "Validation point saved." : "Could not save validation point.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Field validation</div>
        <h1 className="mt-3 text-3xl font-semibold">Reality-check the model</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Collect small validation samples from high-opportunity, low-opportunity, saturated and underserved locations.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(form).map(([key, value]) => (
            <label key={key} className="space-y-2 text-sm text-slate-300">
              <span className="capitalize">{key.replaceAll("_", " ")}</span>
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand/60" value={String(value)} onChange={(e) => setForm({ ...form, [key]: typeof value === "number" ? Number(e.target.value) : e.target.value })} />
            </label>
          ))}
        </div>
        <button onClick={submit} className="mt-6 rounded-2xl bg-brand px-5 py-3 font-semibold text-slate-950">Submit validation point</button>
        {status && <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-sm text-brand">{status}</div>}
      </section>
      <aside className="glass-panel rounded-[2rem] p-6">
        <h2 className="text-xl font-semibold">Validation strategy</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <li>Sample locations from different model classes.</li>
          <li>Record informal competitors missing from datasets.</li>
          <li>Compare predicted score with real visible activity.</li>
          <li>Use validation data for evaluation and calibration, not as blind training truth.</li>
        </ul>
      </aside>
    </div>
  );
}
