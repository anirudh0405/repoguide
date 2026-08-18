import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BotMessageSquare,
  CheckCircle2,
  FileCode2,
  FolderGit2,
  GitBranch,
  Loader2,
  Plus,
  ScrollText,
} from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { mockProjects } from "@/lib/mock-data";

const activityFeed = [
  { icon: CheckCircle2, color: "text-success", text: "ecommerce-platform analysis completed", time: "2 hours ago" },
  { icon: CheckCircle2, color: "text-success", text: "mobile-api analysis completed", time: "yesterday" },
  { icon: CheckCircle2, color: "text-success", text: "payment-service analysis completed", time: "yesterday" },
  { icon: Loader2, color: "text-info", text: "data-analytics-ingestor analysis started", time: "just now" },
];

export default function DashboardPage() {
  const analyzing = mockProjects.filter((p) => p.status === "analyzing");
  const analyzedCount = mockProjects.filter((p) => p.status === "analyzed").length;

  return (
    <AppShell title="Overview">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Welcome back, Alex
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening across your repositories.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/repositories">
              <GitBranch className="h-4 w-4" />
              Analyze a new repository
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Projects" value={mockProjects.length} icon={FolderGit2} hint="acme org" />
          <StatCard
            label="Analyzed"
            value={analyzedCount}
            icon={CheckCircle2}
            hint="analyses complete"
          />
          <StatCard
            label="Currently analyzing"
            value={analyzing.length}
            icon={Loader2}
            hint="in progress"
          />
          <StatCard
            label="Files indexed"
            value={mockProjects.reduce((acc, p) => acc + p.stats.files, 0)}
            icon={FileCode2}
            hint="across all projects"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Recent projects</h3>
              <Link
                href="/projects/ecommerce-platform"
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mockProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {analyzing.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-info" />
                    Analysis status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyzing.map((project) => (
                    <div key={project.id}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{project.name}</span>
                        <Badge variant="info">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {project.progress}%
                        </Badge>
                      </div>
                      <Progress value={project.progress} className="mt-2" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Mapping architecture · indexing files · generating docs
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityFeed.map((entry, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-2.5">
                      <entry.icon className={`mt-0.5 h-4 w-4 shrink-0 ${entry.color}`} />
                      <div className="min-w-0">
                        <p className="text-sm">{entry.text}</p>
                        <p className="text-xs text-muted-foreground">{entry.time}</p>
                      </div>
                    </div>
                    {i < activityFeed.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link href="/repositories">
                    <Plus className="h-4 w-4" />
                    New analysis
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link href="/projects/ecommerce-platform">
                    <ScrollText className="h-4 w-4" />
                    Open documentation
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" disabled>
                  <BotMessageSquare className="h-4 w-4" />
                  Ask about a codebase
                  <Badge variant="brand" className="ml-auto">
                    Phase 2
                  </Badge>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}