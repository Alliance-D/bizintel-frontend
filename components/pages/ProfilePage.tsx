"use client";

import { PageHeader } from "@/components/platform/pageHelpers";

export function ProfilePage() {
  return (
    <main className="app-container py-12">
      <PageHeader eyebrow="Profile" title="Your workspace settings" text="Manage account details, saved preferences and notification settings" />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Preferences and notification settings are coming soon. Your account is managed from the sign-in menu in the header.</p>
      </div>
    </main>
  );
}
