"use client";

import Link from "next/link";
import { Bell, ChevronsUpDown, LogOut, Plus, Settings, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function AppTopbar({ title }: { title?: string }) {
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
            New analysis
          </Link>
        </Button>

        <ThemeToggle />

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-accent">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-brand text-[11px] font-semibold text-brand-foreground">
              AM
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left text-xs leading-tight sm:block">
            <span className="block font-medium">Alex Morgan</span>
            <span className="block text-muted-foreground">acme org</span>
          </span>
          <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold">Alex Morgan</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            alex@acme.dev
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound className="h-4 w-4" />
          Profile
          <ComingSoon className="ml-auto" label="Soon" />
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="h-4 w-4" />
          Settings
          <ComingSoon className="ml-auto" label="Soon" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}