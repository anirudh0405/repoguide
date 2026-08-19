"use client";

import { ArrowDown, Boxes, FileText, GitBranch, ListOrdered, PlayCircle, Puzzle, Route, Terminal, Variable } from "lucide-react";

import { FileViewerDialog } from "@/components/project/file-viewer-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingGuideContent } from "@/lib/ai/onboarding-schema";

function FileRef({ projectId, path }: { projectId: string; path: string }) {
  return (
    <FileViewerDialog projectId={projectId} path={path}>
      <span className="font-mono text-xs underline decoration-brand/40 underline-offset-2">
        {path}
      </span>
    </FileViewerDialog>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-muted text-brand">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function OnboardingGuideContent({
  projectId,
  content,
}: {
  projectId: string;
  content: OnboardingGuideContent;
}) {
  return (
    <div className="space-y-6">
      <Section icon={<FileText className="h-3.5 w-3.5" />} title="Project overview">
        <p className="text-sm leading-relaxed text-foreground/90">{content.projectOverview}</p>
      </Section>

      {content.technologyStack.length > 0 && (
        <Section icon={<Puzzle className="h-3.5 w-3.5" />} title="Technology stack">
          <div className="flex flex-wrap gap-2">
            {content.technologyStack.map((tech) => (
              <Badge key={tech} variant="outline" className="font-normal">
                {tech}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      <Section icon={<Boxes className="h-3.5 w-3.5" />} title="Architecture overview">
        <p className="text-sm leading-relaxed text-foreground/90">
          {content.architectureOverview}
        </p>
      </Section>

      {content.directoryGuide.length > 0 && (
        <Section icon={<GitBranch className="h-3.5 w-3.5" />} title="Directory guide">
          <div className="space-y-2">
            {content.directoryGuide.map((dir) => (
              <div
                key={dir.path}
                className="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-3 py-2"
              >
                <p className="font-mono text-xs font-medium">{dir.path}</p>
                <p className="text-sm text-muted-foreground">{dir.purpose}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {content.importantFiles.length > 0 && (
        <Section icon={<FileText className="h-3.5 w-3.5" />} title="Important files">
          <div className="space-y-4">
            {content.importantFiles.map((file) => (
              <div key={file.path} className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <FileRef projectId={projectId} path={file.path} />
                </div>
                <p className="mt-2 text-sm text-foreground/90">{file.purpose}</p>
                {file.whyItMatters && (
                  <p className="mt-1 text-sm text-muted-foreground">{file.whyItMatters}</p>
                )}
                {file.relatedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Related
                    </span>
                    {file.relatedFiles.map((related) => (
                      <FileRef key={related} projectId={projectId} path={related} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {content.applicationFlows.length > 0 && (
        <Section icon={<Route className="h-3.5 w-3.5" />} title="Application flows">
          <div className="space-y-4">
            {content.applicationFlows.map((flow) => (
              <div key={flow.name} className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-semibold">{flow.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{flow.description}</p>
                {flow.steps.length > 0 && (
                  <ol className="mt-3 space-y-1.5">
                    {flow.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
                          {index + 1}
                        </span>
                        <span className="text-foreground/90">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {flow.relatedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Files
                    </span>
                    {flow.relatedFiles.map((related) => (
                      <FileRef key={related} projectId={projectId} path={related} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {content.gettingStarted.length > 0 && (
        <Section icon={<PlayCircle className="h-3.5 w-3.5" />} title="Getting started">
          <ol className="space-y-2">
            {content.gettingStarted.map((step, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {content.environmentVariables.length > 0 && (
        <Section icon={<Variable className="h-3.5 w-3.5" />} title="Environment variables">
          <p className="mb-3 text-xs text-muted-foreground">
            Names only — values never leave the repository.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {content.environmentVariables.map((name) => (
              <code
                key={name}
                className="rounded border bg-muted/40 px-2 py-1 font-mono text-xs text-foreground"
              >
                {name}
              </code>
            ))}
          </div>
        </Section>
      )}

      {content.recommendedReadingOrder.length > 0 && (
        <Section icon={<ListOrdered className="h-3.5 w-3.5" />} title="Recommended reading order">
          <ol className="space-y-3">
            {content.recommendedReadingOrder.map((item, index) => (
              <li key={item.path} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <FileRef projectId={projectId} path={item.path} />
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.reason}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ArrowDown className="h-3.5 w-3.5" />
        <Terminal className="h-3.5 w-3.5" />
        <span>Click any file path to open it.</span>
      </div>
    </div>
  );
}