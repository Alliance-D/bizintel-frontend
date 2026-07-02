import { AppShell } from "@/components/layout/AppShell";
import { AdminPageModern } from "@/components/platform/ProfessionalPages";

export const metadata = { title: "System Status | BizIntel" };

export default function Page() {
  return <AppShell><AdminPageModern /></AppShell>;
}
