import { Building2 } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#10231f] text-white shadow-sm">
        <Building2 size={compact ? 19 : 21} />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="display-font truncate text-xl font-black tracking-[-0.05em]">BizIntel</div>
          <div className="hidden truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 sm:block">Business opportunity intelligence</div>
        </div>
      )}
    </div>
  );
}
