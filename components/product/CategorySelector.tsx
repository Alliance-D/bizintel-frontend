'use client';
const categories = [['salon','Salon'],['barbershop','Barbershop'],['pharmacy','Pharmacy'],['cafe','Café'],['restaurant','Restaurant'],['grocery','Grocery'],['retail','Retail'],['mobile_money','Mobile Money']];
export function CategorySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{categories.map(([key,label]) => <button key={key} onClick={() => onChange(key)} className={`rounded-full border px-4 py-2 text-sm transition ${value===key?'border-emerald-400 bg-emerald-400/15 text-emerald-100':'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{label}</button>)}</div>;
}
