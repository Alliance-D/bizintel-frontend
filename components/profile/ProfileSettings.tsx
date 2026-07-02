"use client";

import { useEffect, useState } from "react";
import { getUserPreferences, updateUserPreferences } from "@/lib/api";

const categories = ["salon", "pharmacy", "cafe", "restaurant", "grocery", "retail"];

export function ProfileSettings() {
  const [prefs, setPrefs] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUserPreferences().then((data) => setPrefs(data?.preferences || {}));
  }, []);

  async function save() {
    const data = await updateUserPreferences(prefs);
    setPrefs(data?.preferences || prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (!prefs) return <div className="text-slate-400">Loading preferences...</div>;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-xl font-semibold text-white">Workspace preferences</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          Default category
          <select className="w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-white" value={prefs.default_business_category || "salon"} onChange={(e) => setPrefs({ ...prefs, default_business_category: e.target.value })}>
            {categories.map((cat) => <option key={cat}>{cat}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Default radius
          <input className="w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-white" type="number" value={prefs.default_radius_meters || 500} onChange={(e) => setPrefs({ ...prefs, default_radius_meters: Number(e.target.value) })} />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Theme
          <select className="w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-white" value={prefs.theme || "dark"} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}>
            <option>dark</option><option>light</option><option>system</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Notification frequency
          <select className="w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-white" value={prefs.notification_frequency || "weekly"} onChange={(e) => setPrefs({ ...prefs, notification_frequency: e.target.value })}>
            <option>weekly</option><option>monthly</option><option>off</option>
          </select>
        </label>
      </div>
      <button onClick={save} className="mt-6 rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Save preferences</button>
      {saved && <span className="ml-4 text-sm text-emerald-300">Saved</span>}
    </div>
  );
}
