"use client";

import { getNotifications } from "@/lib/platform-api";
import { type AnyObj, PageHeader, useAsyncData, EmptyDataPanel } from "@/components/platform/pageHelpers";

export function NotificationsPage() {
  const { data } = useAsyncData(() => getNotifications(), [], { notifications: [] });
  const notifications = data?.notifications || [];
  return (
    <main className="app-container py-8 lg:py-12">
      <PageHeader eyebrow="Notifications" title="Recent location signals" text="Alerts appear when monitored locations have new signals." />
      {notifications.length ? (
        <div className="grid gap-3">{notifications.map((item: AnyObj) => <div key={item.id || item.title} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{item.message || item.body}</p></div>)}</div>
      ) : (
        <EmptyDataPanel title="No notifications yet" text="Save locations and enable monitoring later to receive real alerts." />
      )}
    </main>
  );
}
