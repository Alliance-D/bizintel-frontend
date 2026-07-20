import { AppShell } from "@/components/layout/AppShell";
import { LegalPage } from "@/components/pages/LegalPage";

export const metadata = {
  title: "Privacy Policy & Terms of Use | BizIntel",
  description:
    "How BizIntel handles data, and the terms under which the demand-supply assessment may be used.",
};

export default function Page() {
  return (
    <AppShell>
      <LegalPage />
    </AppShell>
  );
}
