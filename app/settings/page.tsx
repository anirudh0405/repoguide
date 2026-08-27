import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { SettingsContent } from "@/components/settings/settings-content";
import { requireUserWithUsage } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUserWithUsage();
  if (!user) {
    redirect("/?auth=required");
  }

  return (
    <AppShell title="Settings" user={user}>
      <SettingsContent user={user} />
    </AppShell>
  );
}