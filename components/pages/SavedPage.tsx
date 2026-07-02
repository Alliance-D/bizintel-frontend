"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Bookmark, Trash2 } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import { deleteSavedLocation, getAlerts, getSavedLocations } from "@/lib/platform-api";
import { type AnyObj, PageHeader, useAsyncData, EmptyDataPanel, normaliseSavedLocation, locationQuery, safeNumber } from "@/components/platform/pageHelpers";

export function SavedPage() {
  const { data } = useAsyncData(() => getSavedLocations(), [], { locations: [] });
  const { data: alerts } = useAsyncData(() => getAlerts(), [], { alerts: [] });
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const locations = (data?.locations || []).filter((item: AnyObj) => !removedIds.includes(String(item.id)));
  const alertList = alerts?.alerts || [];

  async function removeLocation(item: AnyObj) {
    const normalised = normaliseSavedLocation(item);
    if (!normalised.id || !/^\d+$/.test(normalised.id)) {
      setMessage("This location cannot be deleted because it is missing a valid saved ID.");
      return;
    }
    const confirmed = window.confirm(`Delete ${normalised.label} from saved locations?`);
    if (!confirmed) return;
    setDeletingId(normalised.id);
    setMessage(null);
    try {
      await deleteSavedLocation(normalised.id);
      setRemovedIds((prev) => [...prev, normalised.id]);
      setMessage(`${normalised.label} was removed from saved locations.`);
    } catch {
      setMessage("Saved location could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow="Saved" title="Keep track of candidate places" text="Only locations you save from the map or Scout Mode appear here." action={<Link href="/map" className="btn-primary"><Bookmark size={16}/> Save from map</Link>} />
      {message && <p className="mb-5 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">Shortlisted locations</h2></div>{locations.length ? <div className="divide-y divide-slate-200">{locations.map((item: AnyObj) => {
          const saved = normaliseSavedLocation(item);
          return <div key={item.id || item.label} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"><div><h3 className="font-black text-slate-950">{saved.label}</h3><p className="mt-1 text-sm text-slate-500">{categoryLabel(saved.business_category || "pharmacy")} · updated {saved.updated_at || "recently"}</p><p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Next: {item.next_action || "Compare with another candidate before committing"}</p></div><div className="flex flex-wrap items-center justify-end gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">{saved.latest_opportunity_score != null ? Math.round(safeNumber(saved.latest_opportunity_score)) : "--"}</span><Link href={`/reports?${locationQuery(saved)}`} className="btn-secondary px-4 py-2 text-sm">Report</Link><Link href={`/compare?${locationQuery(saved)}`} className="btn-secondary px-4 py-2 text-sm">Compare</Link><button type="button" onClick={() => removeLocation(item)} disabled={deletingId === saved.id} className="rounded-full border border-red-100 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} className="mr-1 inline"/> {deletingId === saved.id ? "Deleting" : "Delete"}</button></div></div>;
        })}</div> : <div className="p-5"><EmptyDataPanel title="No saved locations yet" text="Open the map, select an opportunity area or drop a Scout pin, then save it here." /></div>}</section>
        <aside className="space-y-5"><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Watchlist signals</h2>{alertList.length ? <div className="mt-4 grid gap-3">{alertList.map((alert: AnyObj)=><div key={alert.id || alert.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="font-black text-slate-950">{alert.title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{alert.message || alert.body}</p></div>)}</div> : <div className="mt-4"><EmptyDataPanel title="No active alerts" text="Alerts will appear when monitored locations produce new signals." /></div>}</section><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Create monitor</h2><p className="mt-2 text-sm leading-6 text-slate-600">Save locations from the map to prepare them for monitoring.</p><Link href="/map" className="btn-primary mt-4 w-full"><Bell size={16}/> Go to map</Link></section></aside>
      </div>
    </main>
  );
}

export function WatchlistPage() { return <SavedPage />; }
