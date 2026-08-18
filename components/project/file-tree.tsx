"use client";

import * as React from "react";
import { ChevronRight, File, FileCode2, Folder, FolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/types";

function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  switch (ext) {
    case ".tsx":
    case ".ts":
    case ".js":
    case ".jsx":
    case ".java":
    case ".go":
    case ".py":
    case ".css":
    case ".json":
    case ".prisma":
    case ".yml":
      return <FileCode2 className={className} />;
    default:
      return <File className={className} />;
  }
}

export function FileTree({ root }: { root: FileNode }) {
  return (
    <div className="rounded-md border bg-card">
      <div className="border-b px-4 py-2 font-mono text-xs font-medium text-muted-foreground">
        {root.name}/
      </div>
      <div className="p-2">
        <TreeNode node={root} depth={0} />
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = React.useState(depth < 1);
  const isFolder = node.type !== "file" && Boolean(node.children?.length);

  if (!isFolder) {
    return (
      <div
        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <FileIcon name={node.name} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-[13px]">{node.name}</span>
        {node.meta && (
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{node.meta}</span>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        aria-expanded={open}
      >
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        {open ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-brand" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-mono text-[13px]">{node.name}/</span>
      </button>
      {open && node.children && (
        <div className="ml-2 border-l pl-2">
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}