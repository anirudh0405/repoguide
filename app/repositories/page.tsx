import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { RepositoryList } from "@/components/repositories/repository-list";

export const metadata: Metadata = {
  title: "Repositories",
};

export default function RepositoriesPage() {
  return (
    <AppShell title="Repositories">
      <div className="space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Your repositories
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a repository to analyze. Analysis maps the architecture, files, flows, and docs.
          </p>
        </div>
        <RepositoryList />
      </div>
    </AppShell>
  );
}