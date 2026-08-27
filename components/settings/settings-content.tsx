"use client";

import { useState } from "react";
import { GitBranch, Database, CreditCard, Trash2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CurrentUserWithUsage } from "@/lib/auth";

interface SettingsContentProps {
  user: CurrentUserWithUsage;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  FREE: "1 repository, 10 AI questions/month, 50K tokens/month",
  PRO: "10 repositories, 500 AI questions/month, 2M tokens/month, auto re-analysis",
};

export function SettingsContent({ user }: SettingsContentProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.href = "/?deleted=1";
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch {
      alert("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const usage = user.usage;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, repositories, usage, and subscription.
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                GitHub Account
              </CardTitle>
              <CardDescription>
                Your connected GitHub account. This is used to access your repositories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
                )}
                <div>
                  <p className="font-medium">{user.name ?? user.login ?? "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.login ? `@${user.login}` : "No login"}
                  </p>
                  {user.email && (
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Your GitHub account is linked and can access repositories via the RepoGuide GitHub App.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="https://github.com/settings/applications" target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage on GitHub
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions. Please read carefully before proceeding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete Account"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete your account, all your projects, analysis data, chat history,
                      and GitHub connection. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete my account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <p className="mt-2 text-sm text-muted-foreground">
                Deleting your account will also revoke the RepoGuide GitHub App&apos;s access to your repositories.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repositories Tab */}
        <TabsContent value="repositories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Connected Repositories
              </CardTitle>
              <CardDescription>
                Repositories you&apos;ve analyzed with RepoGuide. Click to view project details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* This would be populated with the user's projects */}
                <p className="text-sm text-muted-foreground text-center py-8">
                  Your analyzed repositories will appear here.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Re-analyze Repository
              </CardTitle>
              <CardDescription>
                Re-analyze a repository to pick up new changes. RepoGuide checks the latest commit SHA
                and only re-analyzes if the code has changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This feature will be available after you&apos;ve analyzed at least one repository.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Current Period Usage
              </CardTitle>
              <CardDescription>
                Usage resets monthly. Limits are based on your current plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {usage ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <UsageStat
                      label="Repositories"
                      value={usage.current.repositoriesAnalyzed}
                      limit={usage.limits.maxRepositories}
                      icon={Database}
                    />
                    <UsageStat
                      label="AI Questions"
                      value={usage.current.aiQuestions}
                      limit={usage.limits.maxAiQuestionsPerMonth}
                      icon={AlertCircle}
                    />
                    <UsageStat
                      label="Tokens Used"
                      value={usage.current.tokensConsumed.toLocaleString()}
                      limit={usage.limits.maxTokensPerMonth.toLocaleString()}
                      icon={CreditCard}
                    />
                    <UsageStat
                      label="Storage"
                      value={formatBytes(usage.current.storageUsedBytes)}
                      limit={formatBytes(usage.limits.maxStorageBytes)}
                      icon={Database}
                    />
                    <UsageStat
                      label="Analysis Runs"
                      value={usage.current.analysisRuns}
                      limit={usage.limits.maxRepositories * 5}
                      icon={RefreshCw}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {PLAN_DESCRIPTIONS[user.plan] ?? user.plan}
                      </p>
                    </div>
                    <Badge variant={user.plan === "PRO" ? "default" : "secondary"}>
                      {PLAN_LABELS[user.plan] ?? user.plan}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading usage data...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                {user.plan === "FREE"
                  ? "You're on the Free plan. Upgrade to Pro for more repositories and AI questions."
                  : "You're on the Pro plan. Enjoy unlimited access to all features."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold text-lg">{PLAN_LABELS[user.plan] ?? user.plan}</p>
                  <p className="text-sm text-muted-foreground">
                    {PLAN_DESCRIPTIONS[user.plan] ?? ""}
                  </p>
                </div>
                {user.plan === "FREE" && (
                  <UpgradeButton />
                )}
                {user.plan === "PRO" && (
                  <Button variant="outline" asChild>
                    <Link href="/api/billing/portal" target="_blank" rel="noreferrer">
                      Manage Subscription
                    </Link>
                  </Button>
                )}
              </div>

              <Separator />

              <h4 className="font-medium">Plan Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2">Feature</th>
                      <th className="pb-2 text-center">Free</th>
                      <th className="pb-2 text-center">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <PlanFeatureRow feature="Repositories" free="1" pro="10" />
                    <PlanFeatureRow feature="AI Questions / month" free="10" pro="500" />
                    <PlanFeatureRow feature="Tokens / month" free="50K" pro="2M" />
                    <PlanFeatureRow feature="Storage" free="50 MB" pro="1 GB" />
                    <PlanFeatureRow feature="Max Repository Size" free="10 MB" pro="100 MB" />
                    <PlanFeatureRow feature="Auto Re-analysis" free="No" pro="Yes" />
                    <PlanFeatureRow feature="Advanced Architecture" free="No" pro="Yes" />
                    <PlanFeatureRow feature="Priority Queue" free="No" pro="Yes" />
                    <PlanFeatureRow feature="Support" free="Community" pro="Email" />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {user.plan === "PRO" && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Cancel Subscription
                </CardTitle>
                <CardDescription>
                  You can cancel your Pro subscription at any time. You&apos;ll retain Pro access until the
                  end of your current billing period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" asChild>
                  <Link href="/api/billing/portal" target="_blank" rel="noreferrer">
                    Open Billing Portal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsageStat({
  label,
  value,
  limit,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  limit: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = typeof value === "number" && typeof limit === "number" && limit > 0
    ? Math.min(100, (value / limit) * 100)
    : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("font-mono text-xl font-semibold", isAtLimit && "text-destructive")}>
          {value}
        </span>
        <span className="text-muted-foreground">/ {limit}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isAtLimit ? "bg-destructive" : isNearLimit ? "bg-warning" : "bg-brand"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PlanFeatureRow({
  feature,
  free,
  pro,
}: {
  feature: string;
  free: string;
  pro: string;
}) {
  return (
    <tr>
      <td className="py-2">{feature}</td>
      <td className="py-2 text-center text-muted-foreground">{free}</td>
      <td className="py-2 text-center font-medium">{pro}</td>
    </tr>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleUpgrade} disabled={loading}>
      {loading ? "Redirecting..." : "Upgrade to Pro"}
    </Button>
  );
}