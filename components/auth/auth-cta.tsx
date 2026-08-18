"use client";

import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";

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
      <Button asChild size={size} className="gap-2">
        <Link href={user ? "/repositories" : "/api/auth/github"}>
          <GitBranch className="h-4 w-4" />
          {user ? "Open app" : "Connect GitHub"}
        </Link>
      </Button>
      <Button asChild size={size} variant="outline" className="gap-2">
        <Link href={user ? "/dashboard" : "/api/auth/github"}>
          {user ? "Dashboard" : "Sign in"}
          {!user && <ArrowRight className="h-4 w-4" />}
        </Link>
      </Button>
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
      <Link href={user ? "/dashboard" : "/api/auth/github"}>
        <Button variant="outline" size="sm">
          {user ? "Dashboard" : "Sign in"}
        </Button>
      </Link>
      <Link href={user ? "/repositories" : "/api/auth/github"}>
        <Button size="sm">{user ? "Open app" : "Connect GitHub"}</Button>
      </Link>
    </div>
  );
}