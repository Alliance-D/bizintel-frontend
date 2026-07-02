import { AppShell } from "@/components/layout/AppShell";
import { LocationIntelligenceWorkspace } from "@/components/platform/LocationIntelligenceWorkspace";
export const metadata={title:'Workspace | BizIntel'};
export default function Page(){return <AppShell><LocationIntelligenceWorkspace initialMode="opportunity" /></AppShell>}
