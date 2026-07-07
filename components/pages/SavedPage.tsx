"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Bookmark, Trash2 } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import { deleteSavedLocation, getAlerts, getSavedLocations } from "@/lib/platform-api";
import { type AnyObj, PageHeader, useAsyncData, EmptyDataPanel, normaliseSavedLocation, locationQuery, safeNumber } from "@/components/platform/pageHelpers";
import { useLocale } from "@/lib/locale";

export function SavedPage() {
  const { t } = useLocale();
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
      setMessage(t("delete_missing_id"));
      return;
    }
    const confirmed = window.confirm(t("confirm_delete_location").replace("{label}", normalised.label));
    if (!confirmed) return;
    setDeletingId(normalised.id);
    setMessage(null);
    try {
      await deleteSavedLocation(normalised.id);
      setRemovedIds((prev) => [...prev, normalised.id]);
      setMessage(t("removed_from_saved").replace("{label}", normalised.label));
    } catch {
      setMessage(t("delete_failed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow={t("saved_eyebrow")} title={t("saved_title")} text={t("saved_text")} action={<Link href="/map" className="btn-primary"><Bookmark size={16}/> {t("save_from_map")}</Link>} />
      {message && <p className="mb-5 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{message}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">{t("shortlisted_locations")}</h2></div>{locations.length ? <div className="divide-y divide-slate-200">{locations.map((item: AnyObj) => {
          const saved = normaliseSavedLocation(item);
          return <div key={item.id || item.label} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"><div><h3 className="font-black text-slate-950">{saved.label}</h3><p className="mt-1 text-sm text-slate-500">{categoryLabel(saved.business_category || "pharmacy")} · {t("updated_label")} {saved.updated_at || t("recently")}</p><p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{t("next_label")}: {item.next_action || t("next_action_default")}</p></div><div className="flex flex-wrap items-center justify-end gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">{saved.latest_opportunity_score != null ? Math.round(safeNumber(saved.latest_opportunity_score)) : "--"}</span><Link href={`/reports?${locationQuery(saved)}`} className="btn-secondary px-4 py-2 text-sm">{t("report")}</Link><Link href={`/compare?${locationQuery(saved)}`} className="btn-secondary px-4 py-2 text-sm">{t("compare_action")}</Link><button type="button" onClick={() => removeLocation(item)} disabled={deletingId === saved.id} className="rounded-full border border-red-100 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={14} className="mr-1 inline"/> {deletingId === saved.id ? t("deleting") : t("delete")}</button></div></div>;
        })}</div> : <div className="p-5"><EmptyDataPanel title={t("no_saved_yet")} text={t("no_saved_yet_text")} /></div>}</section>
        <aside className="space-y-5"><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{t("watchlist_signals")}</h2>{alertList.length ? <div className="mt-4 grid gap-3">{alertList.map((alert: AnyObj)=><div key={alert.id || alert.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="font-black text-slate-950">{alert.title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{alert.message || alert.body}</p></div>)}</div> : <div className="mt-4"><EmptyDataPanel title={t("no_active_alerts")} text={t("no_active_alerts_text")} /></div>}</section><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{t("create_monitor")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t("create_monitor_text")}</p><Link href="/map" className="btn-primary mt-4 w-full"><Bell size={16}/> {t("go_to_map")}</Link></section></aside>
      </div>
    </main>
  );
}

export function WatchlistPage() { return <SavedPage />; }
