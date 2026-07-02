export function ScoreRing({ score, label }: { score: number; label: string }) {
  const angle = Math.max(0, Math.min(100, score)) * 3.6;
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-28 w-28 place-items-center rounded-full"
        style={{ background: `conic-gradient(#4ade80 ${angle}deg, rgba(255,255,255,0.12) 0deg)` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-950/90">
          <div className="text-center">
            <div className="text-3xl font-bold">{Math.round(score)}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">score</div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-sm uppercase tracking-[0.22em] text-brand">Opportunity</div>
        <div className="mt-1 text-2xl font-semibold">{label}</div>
      </div>
    </div>
  );
}
