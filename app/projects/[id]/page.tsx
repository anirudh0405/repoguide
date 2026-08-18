import Link from "next/link";
import { FolderGit2 } from "lucide-react";
import type { Metadata } from "next";

import { ProjectDetailView } from "@/components/project/project-detail-view";
import { Button } from "@/components/ui/button";
import { getProjectById, getProjectDetail, mockProjects } from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return mockProjects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) return { title: "Project not found" };
  return { title: `${project.name}` };
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const project = getProjectById(id);
  const detail = getProjectDetail(id);

  if (!project || !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/50">
          <FolderGit2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Project not found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            We couldn&apos;t find a project for <code className="font-mono">{id}</code>. It may not be
            analyzed yet, or the repository wasn&apos;t connected.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild>
            <Link href="/repositories">Browse repositories</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ProjectDetailView detail={detail} />;
}