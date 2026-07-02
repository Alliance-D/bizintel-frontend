"use client";

import { ReactNode, useState } from "react";
import { ChevronUp } from "lucide-react";

export function MobileBottomSheet({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={`fixed inset-x-3 bottom-3 z-50 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur lg:hidden ${expanded ? "max-h-[82vh]" : "max-h-[34vh]"} overflow-hidden transition-all duration-300`}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-white">{title}</span>
        <ChevronUp className={`h-4 w-4 text-slate-300 transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      <div className="mt-4 overflow-y-auto pb-3">{children}</div>
    </section>
  );
}
