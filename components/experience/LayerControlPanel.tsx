"use client";

import { Layers3 } from "lucide-react";

export type ExperienceLayer = "opportunity" | "demand" | "access" | "commercial" | "competition" | "confidence";

const layers: Array<{ key: ExperienceLayer; label: string; description: string }> = [
  { key: "opportunity", label: "Opportunity", description: "Overall ML opportunity score" },
  { key: "demand", label: "Demand", description: "Population and demand potential" },
  { key: "access", label: "Access", description: "Road and transport accessibility" },
  { key: "commercial", label: "Commercial", description: "POIs and commercial anchors" },
  { key: "competition", label: "Competition", description: "Saturation pressure" },
  { key: "confidence", label: "Confidence", description: "Data/model confidence" },
];

export function LayerControlPanel({ activeLayer, onChange }: { activeLayer: ExperienceLayer; onChange: (layer: ExperienceLayer) => void }) {
  return (
    <div className="glass-panel rounded-[1.5rem] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white"><Layers3 size={18}/> Analysis layers</div>
      <div className="mt-3 space-y-2">
        {layers.map((layer) => (
          <button key={layer.key} onClick={() => onChange(layer.key)} className={`w-full rounded-2xl border px-3 py-2 text-left transition ${activeLayer === layer.key ? "border-emerald-300/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}>
            <div className="text-sm font-medium text-white">{layer.label}</div>
            <div className="text-xs text-slate-400">{layer.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
