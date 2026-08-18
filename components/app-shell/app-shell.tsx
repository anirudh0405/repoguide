import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopbar } from "@/components/app-shell/app-topbar";
import type { CurrentUser } from "@/lib/auth";

export function AppShell({
  children,
  title,
  user,
}: {
  children: React.ReactNode;
  title?: string;
  user: CurrentUser;
}) {
  return (
    <div className="flex min-h-screen bg-background lg:pl-60">
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar title={title} user={user} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}