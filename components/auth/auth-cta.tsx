"use client";

import Link from "next/link";
import { ArrowRight, GitBranch, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/use-auth";
import { cn } from "@/lib/utils";

export function AuthCta({
  size = "lg",
  className,
}: {
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { user } = useAuth();

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      {user ? (
        <>
          <Button asChild size={size} className="gap-2">
            <Link href="/repositories">
              <GitBranch className="h-4 w-4" />
              Open app
            </Link>
          </Button>
          <Button
            asChild
            size={size}
            variant="outline"
            onClick={() => window.location.href = "/api/auth/disconnect"}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect GitHub
          </Button>
          <Link href="/dashboard">
            <Button asChild size={size} variant="outline">
              Dashboard
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Button asChild size={size} className="gap-2">
            <Link href="/api/auth/github">
              <GitBranch className="h-4 w-4" />
              Connect GitHub
            </Link>
          </Button>
          <Link href="/dashboard">
            <Button asChild size={size} variant="outline">
              Open app
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

export function AuthNav({ className }: { className?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        <span className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {user ? (
        <>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
          <Link href="/repositories">
            <Button size="sm">{user ? "Open app" : "Connect GitHub"}</Button>
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/api/auth/disconnect"}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </>
      ) : (
        <>
          <Link href="/api/auth/github">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/repositories">
            <Button size="sm">{user ? "Open app" : "Connect GitHub"}</Button>
          </Link>
        </>
      )}
    </div>
  );
}