"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, Database, PlayCircle, RefreshCw, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import {
  activateModelVersion,
  getAdminStatus,
  getAuditLog,
  getDatasetCatalog,
  getFeatureImportance,
  getJobStatus,
  getModelVersions,
  triggerFeatureRebuild,
  triggerRetrain,
} from "@/lib/platform-api";
import { getUser, hasAdminAccess } from "@/lib/auth";

type AnyObj = Record<string, any>;

function StatCard({ title, value, tone = "neutral" }: { title: string; value: string | number; tone?: "neutral" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-950";
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-extrabold text-slate-500">{title}</div>
      <div className={`mt-2 display-font text-3xl font-black ${toneClass}`}>{value}</div>
    </div>
  );
}

function ReadyBadge({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={12} /> Ready</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"><AlertTriangle size={12} /> Not ready</span>
  );
}

export function AdminDashboardPage() {
  const [status, setStatus] = useState<AnyObj | null>(null);
  const [versions, setVersions] = useState<AnyObj[]>([]);
  const [importance, setImportance] = useState<AnyObj[]>([]);
  const [datasets, setDatasets] = useState<AnyObj[]>([]);
  const [auditEvents, setAuditEvents] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const isSuperAdmin = getUser()?.role === "super_admin";
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // Admin is the only authenticated surface: an unauthenticated visitor is sent
  // to the login page (which returns here on success) instead of seeing the
  // dashboard fail its API calls.
  useEffect(() => {
    if (!hasAdminAccess()) { router.replace("/login?next=/admin"); return; }
    setAuthorized(true);
  }, [router]);

  const refresh = useCallback(async () => {
    const [statusRes, versionsRes, importanceRes, datasetsRes, auditRes] = await Promise.allSettled([
      getAdminStatus(),
      getModelVersions(),
      getFeatureImportance(),
      getDatasetCatalog(),
      getAuditLog(),
    ]);
    if (statusRes.status === "fulfilled") setStatus(statusRes.value);
    if (versionsRes.status === "fulfilled") setVersions(versionsRes.value.models || []);
    if (importanceRes.status === "fulfilled") setImportance(importanceRes.value.features || []);
    if (datasetsRes.status === "fulfilled") setDatasets(datasetsRes.value.datasets || []);
    if (auditRes.status === "fulfilled") setAuditEvents(auditRes.value.events || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (authorized) refresh(); }, [authorized, refresh]);

  // Poll while a background job is running so the status card updates without a manual refresh.
  useEffect(() => {
    if (!status?.job?.running) return;
    const interval = setInterval(async () => {
      const job = await getJobStatus().catch(() => null);
      if (job) setStatus((prev) => (prev ? { ...prev, job } : prev));
      if (job && !job.running) refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [status?.job?.running, refresh]);

  async function runJob(action: () => Promise<AnyObj>, label: string) {
    setActionPending(true);
    setActionMessage(null);
    try {
      const result = await action();
      setActionMessage(result.message || `${label} started.`);
      await refresh();
    } catch (error: any) {
      setActionMessage(error?.message?.slice(0, 200) || `${label} could not be started.`);
    } finally {
      setActionPending(false);
    }
  }

  async function handleActivate(modelVersionId: number) {
    setActionPending(true);
    setActionMessage(null);
    try {
      const result = await activateModelVersion(modelVersionId);
      setActionMessage(result.message);
      await refresh();
    } catch (error: any) {
      setActionMessage(error?.message?.slice(0, 200) || "Could not activate this model version.");
    } finally {
      setActionPending(false);
    }
  }

  const health = status?.data_health?.checks || {};
  const activeModel = status?.model?.active_model;
  const job = status?.job;

  if (!authorized) return <main className="app-container py-20 text-center text-sm font-bold text-slate-500">…</main>;

  return (
    <main className="app-container py-8 lg:py-12">
      <section className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="kicker text-[var(--brand)]">Admin</div>
          <h1 className="mt-4 max-w-5xl display-font text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-6xl">System dashboard</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Data pipeline health, model versions, and retraining controls. Not shown to regular users.</p>
        </div>
        <Link href="/admin/data-quality" className="btn-secondary"><SearchCheck size={16} /> Map quality review</Link>
      </section>

      {loading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">Loading system status…</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard title="Data" value={status?.data === "ready" ? "Ready" : "Waiting"} tone={status?.data === "ready" ? "good" : "warn"} />
            <StatCard title="Features" value={status?.features === "ready" ? "Ready" : "Waiting"} tone={status?.features === "ready" ? "good" : "warn"} />
            <StatCard title="Predictions" value={status?.predictions === "ready" ? "Ready" : "Waiting"} tone={status?.predictions === "ready" ? "good" : "warn"} />
            <StatCard title="Grid cells" value={health.analysis_grid_cells ?? "—"} />
            <StatCard title="Active model" value={activeModel?.algorithm || "None"} tone={activeModel ? "good" : "warn"} />
          </div>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Pipeline jobs</h2>
                <p className="mt-1 text-sm text-slate-600">Rebuild grid features from the latest imported data, or retrain and compare models against the current feature set.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => runJob(triggerFeatureRebuild, "Feature rebuild")} disabled={actionPending || job?.running} className="btn-secondary"><Database size={16} /> Rebuild features</button>
                <button onClick={() => runJob(() => triggerRetrain(true), "Retraining")} disabled={actionPending || job?.running} className="btn-primary"><PlayCircle size={16} /> Retrain &amp; activate</button>
              </div>
            </div>
            {job?.running && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">
                <RefreshCw size={14} className="animate-spin" /> {job.job_name} is running (started {new Date(job.started_at).toLocaleTimeString()})…
              </div>
            )}
            {!job?.running && job?.exit_code != null && (
              <div className={`mt-4 rounded-2xl p-3 text-sm font-bold ${job.exit_code === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                Last job ({job.job_name}) {job.exit_code === 0 ? "completed successfully" : `exited with code ${job.exit_code}`} at {new Date(job.finished_at).toLocaleTimeString()}.
              </div>
            )}
            {actionMessage && <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{actionMessage}</p>}
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-xl font-black text-slate-950">Model versions</h2>
                <p className="mt-1 text-sm text-slate-600">Every trained version, with the best validation MAE from its comparison run.{!isSuperAdmin && " Activating a version requires the super_admin role."}</p>
              </div>
              {versions.length ? (
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr><th className="p-4">Algorithm</th><th>MAE</th><th>Trained</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {versions.map((version) => (
                      <tr key={version.id}>
                        <td className="p-4 font-black text-slate-950">{version.algorithm}</td>
                        <td>{version.primary_metric_value != null ? Number(version.primary_metric_value).toFixed(3) : "—"}</td>
                        <td>{version.created_at ? new Date(version.created_at).toLocaleDateString() : "—"}</td>
                        <td>{version.is_active ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Active</span> : <span className="text-xs font-bold text-slate-400">Inactive</span>}</td>
                        <td className="pr-4 text-right">
                          {!version.is_active && isSuperAdmin && (
                            <button onClick={() => handleActivate(version.id)} disabled={actionPending} className="text-xs font-black text-emerald-700 hover:text-emerald-900">Activate</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="p-5"><p className="text-sm text-slate-500">No model versions yet. Run a retraining job to create one.</p></div>}
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Top SHAP factors</h2>
              <p className="mt-1 text-sm text-slate-600">What the active model weighs most heavily, averaged across the validation set.</p>
              {importance.length ? (
                <div className="mt-4 grid gap-2">
                  {importance.slice(0, 10).map((feature) => {
                    const max = importance[0]?.importance_value || 1;
                    const width = Math.max(4, (feature.importance_value / max) * 100);
                    return (
                      <div key={feature.feature_name}>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600"><span>{feature.feature_name}</span><span>{Number(feature.importance_value).toFixed(2)}</span></div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: `${width}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">No feature importance recorded yet.</p>}
            </section>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black text-slate-950">Dataset import history</h2></div>
              {datasets.length ? (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500"><tr><th className="p-4">Dataset</th><th>Owner</th><th>Rows</th><th>Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {datasets.slice(0, 12).map((row, index) => (
                      <tr key={`${row.dataset_key}-${index}`}>
                        <td className="p-4 font-black text-slate-950">{row.dataset_key}</td>
                        <td className="text-slate-600">{row.source_owner || "—"}</td>
                        <td>{Number(row.rows_imported || 0).toLocaleString()}</td>
                        <td><ReadyBadge ready={row.import_status === "complete"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="p-5"><p className="text-sm text-slate-500">No import history yet.</p></div>}
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black text-slate-950">Recent admin activity</h2></div>
              {auditEvents.length ? (
                <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {auditEvents.slice(0, 20).map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-4 text-sm">
                      <span className="font-bold text-slate-800">{event.action}</span>
                      <span className="text-xs text-slate-400">{event.created_at ? new Date(event.created_at).toLocaleString() : ""}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="p-5"><p className="text-sm text-slate-500">No recorded activity yet.</p></div>}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
