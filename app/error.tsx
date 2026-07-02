"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white"><div><h1 className="text-3xl font-black">Something went wrong</h1><p className="mt-3 text-slate-400">The workspace could not load this view.</p><button onClick={reset} className="mt-6 rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Try again</button></div></main>;
}
