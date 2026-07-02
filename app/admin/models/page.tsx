import { AppShell } from "@/components/layout/AppShell";
import { FeatureImportanceList } from "@/components/models/FeatureImportanceList";
import { ModelComparisonTable } from "@/components/models/ModelComparisonTable";
import { ModelStatusPanel } from "@/components/models/ModelStatusPanel";
import { getFeatureImportance, getModelStatus, getModelVersions } from "@/lib/api";

export default async function AdminModelsPage() {
  const [status, versions, importance] = await Promise.all([
    getModelStatus(),
    getModelVersions(),
    getFeatureImportance(),
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
        <ModelStatusPanel status={status} />

        <section className="mt-8">
          <div className="mb-4">
            <div className="text-sm uppercase tracking-[0.22em] text-slate-400">Model versions</div>
            <h2 className="mt-2 text-2xl font-semibold">Candidate models and active deployment</h2>
          </div>
          <ModelComparisonTable models={versions.models || []} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <FeatureImportanceList features={importance.features || []} />
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="text-sm uppercase tracking-[0.22em] text-slate-400">Model workflow</div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>1. Build the grid-cell plus business-category training matrix.</p>
              <p>2. Train regression, classification and count models.</p>
              <p>3. Compare Random Forest, Extra Trees, LightGBM, XGBoost, CatBoost and baselines.</p>
              <p>4. Register the best model and activate it for location assessment.</p>
              <p>5. Generate cached predictions for the opportunity map.</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
