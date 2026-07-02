"use client";

import { Coffee, Cross, ShoppingBasket, Sparkles, Store, Utensils } from "lucide-react";

const categories = [
  { key: "salon", label: "Salon", icon: Sparkles },
  { key: "pharmacy", label: "Pharmacy", icon: Cross },
  { key: "cafe", label: "Cafe", icon: Coffee },
  { key: "grocery", label: "Grocery", icon: ShoppingBasket },
  { key: "restaurant", label: "Restaurant", icon: Utensils },
  { key: "retail", label: "Retail", icon: Store },
];

export function CategoryRibbon({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl">
      {categories.map(({ key, label, icon: Icon }) => (
        <button key={key} onClick={() => onChange(key)} className={`flex min-w-fit items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition ${value === key ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
          <Icon size={16}/>{label}
        </button>
      ))}
    </div>
  );
}
