"use client";

import * as React from "react";
import { FileCode2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileViewerProps {
  projectId: string;
  path: string;
}

interface FileData {
  path: string;
  name: string;
  language: string | null;
  size: number;
  lineCount: number;
  content: string | null;
  note?: string;
  truncated?: boolean;
}

function FileViewer({ projectId, path }: FileViewerProps) {
  const [data, setData] = React.useState<FileData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`)
      .then(async (response) => {
        const body = (await response.json()) as FileData & { error?: string };
        if (!cancelled) {
          if (!response.ok) setError(body.error ?? "Could not load this file.");
          else setData(body);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this file.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, path]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading file…
      </div>
    );
  }

  if (error || !data) {
    return <p className="py-6 text-sm text-destructive">{error ?? "Could not load this file."}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {data.language && <span className="font-medium text-foreground">{data.language}</span>}
        <span>{data.lineCount} lines</span>
        <span>{(data.size / 1024).toFixed(1)} KB</span>
      </div>
      {data.content === null ? (
        <p className="py-6 text-sm text-muted-foreground">{data.note ?? "File not available."}</p>
      ) : (
        <>
          <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground">
            {data.content}
          </pre>
          {data.truncated && (
            <p className="text-xs text-muted-foreground">
              File truncated — showing the first 512 KB.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function FileViewerDialog({
  projectId,
  path,
  children,
}: {
  projectId: string;
  path: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-brand"
      >
        {children}
      </span>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileCode2 className="h-4 w-4 text-brand" />
            <span className="truncate font-mono text-xs">{path}</span>
          </DialogTitle>
        </DialogHeader>
        <FileViewer projectId={projectId} path={path} />
      </DialogContent>
    </Dialog>
  );
}