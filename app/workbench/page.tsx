import { AppShell } from "@/components/layout/AppShell";
import { LocationIntelligenceWorkspace } from "@/components/platform/LocationIntelligenceWorkspace";
export const metadata={title:'Workbench | BizIntel'};
export default function WorkbenchPage(){return <AppShell><LocationIntelligenceWorkspace initialMode="opportunity" /></AppShell>}
