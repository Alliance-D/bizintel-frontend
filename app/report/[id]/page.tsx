import { AppShell } from "@/components/layout/AppShell";
import { ReportPage } from "@/components/pages/ReportPage";
export const metadata = { title: "Report | BizIntel" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><ReportPage reportId={id} /></AppShell>;
}
