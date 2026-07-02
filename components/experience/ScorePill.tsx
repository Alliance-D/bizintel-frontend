import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  emerald: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
  sky: "border-sky-300/30 bg-sky-400/15 text-sky-100",
  amber: "border-amber-300/30 bg-amber-400/15 text-amber-100",
  rose: "border-rose-300/30 bg-rose-400/15 text-rose-100",
  violet: "border-violet-300/30 bg-violet-400/15 text-violet-100",
  cyan: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
};

export function ScorePill({ label, value, tone = "emerald" }: { label: string; value: number; tone?: string }) {
  return (
    <div className={cn("rounded-2xl border p-3 shadow-sm", toneClass[tone] || toneClass.emerald)}>
      <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-2xl font-semibold">{Math.round(value ?? 0)}</span>
        <span className="pb-1 text-xs opacity-70">/100</span>
      </div>
    </div>
  );
}
