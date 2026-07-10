import { redirect } from "next/navigation";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  redirect(qs ? `/start?${qs}` : "/start");
}
