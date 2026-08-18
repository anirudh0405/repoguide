"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  FolderGit2,
  GitBranch,
  LayoutGrid,
  MessageSquareText,
  Network,
  RefreshCw,
  ShieldAlert,
  Workflow,
} from "lucide-react";

import { ArchitectureCard } from "@/components/project/architecture-card";
import { FileTree } from "@/components/project/file-tree";
import { ChatInterface } from "@/components/project/chat-interface";
import { StatusBadge } from "@/components/ui-states/status-badge";
import { LoadingState } from "@/components/ui-states/loading-state";
import { EmptyState } from "@/components/ui-states/empty-state";
import { ComingSoon } from "@/components/coming-soon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils";
import type { ProjectDetail } from "@/lib/types";

const tabMapping = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "architecture", label: "Architecture", icon: Network },
  { value: "files", label: "Files", icon: FolderGit2 },
  { value: "documentation", label: "Documentation", icon: FileText },
  { value: "flows", label: "Flows", icon: Workflow },
  { value: "chat", label: "AI Chat", icon: MessageSquareText },
  { value: "analysis", label: "Analysis", icon: ShieldAlert },
];

const methodColors: Record<string, string> = {
  GET: "bg-success/15 text-success",
  POST: "bg-brand-muted text-brand",
  PUT: "bg-warning/15 text-warning",
  DELETE: "bg-destructive/15 text-destructive",
  KAFKA: "bg-info/15 text-info",
  JOB: "bg-secondary text-secondary-foreground",
};

const severityConfig = {
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive" },
  warning: { label: "Warning", className: "bg-warning/15 text-warning" },
  info: { label: "Info", className: "bg-info/15 text-info" },
} as const;

export function ProjectDetailView({ detail }: { detail: ProjectDetail }) {
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("overview");
  const { project } = detail;

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-72 animate-pulse rounded bg-muted" />
        </div>
        <LoadingState rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <Link
          href="/repositories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Repositories
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              <span className="text-muted-foreground">acme/</span>
              {project.name}
            </h2>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Analyzed {project.analyzedAt ? formatRelativeTime(project.analyzedAt) : "now"}</span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" /> main
            </span>
            <span>
              {formatCompactNumber(project.stats.linesOfCode)} lines · {project.stats.files} files
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Re-analyze
          <ComingSoon label="Phase 2" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start overflow-x-auto sm:h-9 sm:w-auto">
          {tabMapping.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <OverviewTab detail={detail} onNavigate={setTab} />
        </TabsContent>

        <TabsContent value="architecture" className="mt-0">
          <ArchitectureCard root={detail.architecture} />
        </TabsContent>

        <TabsContent value="files" className="mt-0">
          <FileTree root={detail.fileTree} />
        </TabsContent>

        <TabsContent value="documentation" className="mt-0 grid gap-4 lg:grid-cols-2">
          <DocumentationTab docEntries={detail.documentation} />
        </TabsContent>

        <TabsContent value="flows" className="mt-0 grid gap-4 lg:grid-cols-2">
          <FlowsTab flows={detail.flows} />
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <ChatInterface projectName={project.name} initialMessages={detail.chat} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-0">
          <AnalysisTab detail={detail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ detail, onNavigate }: { detail: ProjectDetail; onNavigate: (tab: string) => void }) {
  const { project } = detail;

  const stats = [
    { label: "Files", value: project.stats.files },
    { label: "Folders", value: project.stats.folders },
    { label: "Lines of code", value: formatCompactNumber(project.stats.linesOfCode) },
    { label: "Contributors", value: project.stats.contributors },
  ];

  const quickLinks = [
    { tab: "architecture", icon: Network, label: "Architecture map", desc: `${detail.architecture.children?.length} top-level modules` },
    { tab: "files", icon: FolderGit2, label: "Key files", desc: "Browse the repository structure" },
    { tab: "flows", icon: Workflow, label: "Flow explorer", desc: `${detail.flows.length} flows traced` },
    { tab: "chat", icon: MessageSquareText, label: "Ask the codebase", desc: "Get answers with file references" },
  ];

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <p className="leading-relaxed text-muted-foreground">{project.description}</p>
          <Separator className="my-5" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="font-normal">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 font-semibold">Jump in</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <button
              key={link.tab}
              onClick={() => onNavigate(link.tab)}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-brand/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand">
                <link.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {detail.issues.filter((i) => i.severity === "critical").length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">Critical issues found</p>
              <p className="text-sm text-muted-foreground">
                Open the Analysis tab to review {detail.issues.filter((i) => i.severity === "critical").length} issue(s).
              </p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => onNavigate("analysis")}>
              Review
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DocumentationTab({ docEntries }: { docEntries: ProjectDetail["documentation"] }) {
  if (docEntries.length === 0) {
    return (
      <div className="lg:col-span-2">
        <EmptyState
          icon={FileText}
          title="Documentation not generated yet"
          description="Documentation generation runs automatically once analysis finishes in the next phase."
        />
      </div>
    );
  }

  return docEntries.map((doc) => (
    <Card key={doc.title} className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-brand" />
          {doc.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{doc.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {doc.sections.map((section) => (
          <div key={section.heading}>
            <h4 className="mb-1.5 text-sm font-semibold">{section.heading}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  ));
}

function FlowsTab({ flows }: { flows: ProjectDetail["flows"] }) {
  if (flows.length === 0) {
    return (
      <div className="lg:col-span-2">
        <EmptyState
          icon={Workflow}
          title="No flows mapped"
          description="Flows are traced once the repository is analyzed."
        />
      </div>
    );
  }

  return flows.map((flow) => (
    <Card key={flow.title} className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Workflow className="h-4 w-4 text-brand" />
          {flow.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{flow.description}</p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {flow.entries.map((entry, i) => (
          <React.Fragment key={`${entry.method}-${entry.path}`}>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <span className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold ${methodColors[entry.method] ?? "bg-secondary text-secondary-foreground"}`}>
                {entry.method}
              </span>
              <code className="truncate font-mono text-xs">{entry.path}</code>
            </div>
            {i < flow.entries.length - 1 && (
              <div className="pl-7 text-muted-foreground">
                <ArrowFlow />
              </div>
            )}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  ));
}

function ArrowFlow() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden>
      <path d="M6 0v12M2 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalysisTab({ detail }: { detail: ProjectDetail }) {
  const { issues, project } = detail;
  const [rerunning, setRerunning] = React.useState(false);

  const runAnalysis = () => {
    setRerunning(true);
    setTimeout(() => setRerunning(false), 2500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-brand" />
              Analysis report
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={rerunning} onClick={runAnalysis}>
              <RefreshCw className={rerunning ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              {rerunning ? "Re-analyzing…" : "Re-run analysis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rerunning ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analyzing {project.name}</span>
                <span className="text-brand">Indexing files…</span>
              </div>
              <Progress value={66} />
              <LoadingState rows={3} />
            </div>
          ) : issues.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No issues found"
              description="This analysis flagged nothing. Re-run analysis anytime once real analysis is available."
            />
          ) : (
            <div className="space-y-3">
              {issues.map((issue, i) => {
                const config = severityConfig[issue.severity];
                return (
                  <div key={i} className="rounded-md border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${config.className}`}>
                          {config.label}
                        </span>
                        <p className="text-sm font-medium">{issue.title}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{issue.detail}</p>
                    <code className="mt-2 inline-block rounded border bg-background px-2 py-0.5 font-mono text-xs text-brand">
                      {issue.file}
                    </code>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}