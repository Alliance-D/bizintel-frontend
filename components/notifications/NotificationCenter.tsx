"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { getNotifications } from "@/lib/api";

export function NotificationCenter() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { getNotifications().then((data) => setItems(data?.notifications || [])); }, []);
  return (
    <div className="space-y-4">
      {!items.length && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400"><BellRing className="mx-auto mb-3 h-8 w-8 text-cyan-300" />No alerts yet. Watchlists will create recurring opportunity updates here.</div>}
      {items.map((item) => (
        <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="text-sm font-semibold text-white">{item.title}</div>
          <p className="mt-2 text-sm text-slate-400">{item.message}</p>
          <div className="mt-3 text-xs text-slate-500">{item.created_at}</div>
        </article>
      ))}
    </div>
  );
}
