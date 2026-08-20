"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronsUpDown, GitBranch, Loader2, LogOut, Plus, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ComingSoon } from "@/components/coming-soon";
import type { CurrentUser } from "@/lib/auth";

function initials(name: string | null, login: string | null): string {
  const source = name ?? login ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function AppTopbar({ title, user }: { title?: string; user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {title ? (
          <h1 className="truncate font-[family-name:var(--font-display)] text-sm font-semibold sm:text-base">
            {title}
          </h1>
        ) : (
          <span className="text-sm text-muted-foreground">Workspace</span>
        )}
        <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground md:inline">
          preview
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 sm:inline-flex">
          <Link href="/repositories">
            <Plus className="h-4 w-4" />
            Connect repository
          </Link>
        </Button>

        <ThemeToggle />

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <UserMenu user={user} />
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  const displayName = user.name ?? (user.login ? `@${user.login}` : "Account");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-accent"
          suppressHydrationWarning
        >
          <Avatar className="h-7 w-7">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-brand text-[11px] font-semibold text-brand-foreground">
                {initials(user.name, user.login)}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="hidden text-left text-xs leading-tight sm:block">
            <span className="block max-w-[10rem] truncate font-medium">{displayName}</span>
            {user.login && (
              <span className="block truncate text-muted-foreground">@{user.login}</span>
            )}
          </span>
          <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold">{displayName}</span>
          {user.email && (
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/repositories">
            <GitBranch className="h-4 w-4" />
            Repositories
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="h-4 w-4" />
          Settings
          <ComingSoon className="ml-auto" label="Soon" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 text-left"
            disabled={signingOut}
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}