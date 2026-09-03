"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  FolderGit2,
  Home,
  Settings,
  Workflow,
} from "lucide-react";

import { ShortLogo } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";

const navItems = [
  { label: "Home", href: "/", icon: Home, group: "Workspace" },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, group: "Workspace" },
  { label: "Repositories", href: "/repositories", icon: FolderGit2, group: "Workspace" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Workspace" },
];

const chatItems = [
  { label: "Repositories", href: "/repositories", icon: FolderGit2, group: "Quick links" },
];

function SidebarItem({
  item,
  active,
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link href="/" aria-label="Back to home">
            <ShortLogo />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">RepoGuide</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.login ? `@${user.login}` : "workspace"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                active={pathname === item.href}
              />
            ))}
          </div>

          <div className="space-y-1 border-t pt-4">
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Quick links
            </p>
            {chatItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
              <Workflow className="h-4 w-4 shrink-0" />
              Analysis
            </div>
          </div>
        </nav>

        <div className="border-t p-3">
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            GitHub is connected. AI onboarding guides are powered by Groq.
          </p>
        </div>
      </aside>

      {/* Mobile nav — rendered by the topbar */}
      <MobileSidebar pathname={pathname} />
    </>
  );
}

function MobileSidebar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t bg-background/95 backdrop-blur lg:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "text-brand" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}