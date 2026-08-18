import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const notices: Record<string, { tone: "error" | "info" | "success"; title: string; body: string }> = {
  required: {
    tone: "info",
    title: "Sign in to continue",
    body: "Connect your GitHub account to use RepoGuide.",
  },
  error: {
    tone: "error",
    title: "GitHub authorization failed",
    body: "We couldn't finish the GitHub authorization. Please try again.",
  },
  not_configured: {
    tone: "error",
    title: "GitHub App is not configured",
    body: "Add the GitHub App credentials to .env.local before connecting.",
  },
  db_required: {
    tone: "error",
    title: "Database is not configured",
    body: "Set DATABASE_URL to your PostgreSQL database, then sign in again.",
  },
  logout: {
    tone: "success",
    title: "Signed out",
    body: "You've been signed out of RepoGuide.",
  },
};

export function AuthNotice({ code }: { code: string }) {
  const notice = notices[code];
  if (!notice) return null;

  const Icon =
    notice.tone === "error" ? AlertTriangle : notice.tone === "success" ? CheckCircle2 : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b px-4 py-3 sm:px-6",
        notice.tone === "error" && "border-destructive/30 bg-destructive/10",
        notice.tone === "info" && "border-border bg-muted/40",
        notice.tone === "success" && "border-success/30 bg-success/10"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          notice.tone === "error" && "text-destructive",
          notice.tone === "info" && "text-foreground",
          notice.tone === "success" && "text-success"
        )}
      />
      <div>
        <p className="text-sm font-medium">{notice.title}</p>
        <p className="text-xs text-muted-foreground">{notice.body}</p>
      </div>
    </div>
  );
}