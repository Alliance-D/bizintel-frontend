import { AppShell } from "@/components/layout/AppShell";
import { LocationIntelligenceWorkspace } from "@/components/platform/LocationIntelligenceWorkspace";
export const metadata={title:'Scout | BizIntel'};
export default function Page(){return <AppShell><LocationIntelligenceWorkspace initialMode="scout" /></AppShell>}
