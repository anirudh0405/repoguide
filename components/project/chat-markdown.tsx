"use client";

import * as React from "react";

/**
 * Tiny, dependency-free markdown renderer for chat answers. Supports fenced
 * code blocks, inline code, bold, bullet and numbered lists, and paragraphs.
 * Everything renders through React (auto-escaped), so model output is safe.
 */

function InlineText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((part, index) => {
    if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={index}
          className="rounded border bg-muted/60 px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((segment, segIndex) => {
      if (!segment) return;
      if (segment.length > 3 && segment.startsWith("**") && segment.endsWith("**")) {
        nodes.push(
          <strong key={`${index}-${segIndex}`} className="font-semibold">
            {segment.slice(2, -2)}
          </strong>
        );
      } else {
        nodes.push(<React.Fragment key={`${index}-${segIndex}`}>{segment}</React.Fragment>);
      }
    });
  });
  return <>{nodes}</>;
}

function isBullet(line: string): boolean {
  return /^\s*(?:[-*•])\s+/.test(line);
}

function isNumbered(line: string): boolean {
  return /^\s*\d+[.)]\s+/.test(line);
}

export function ChatMarkdown({ text }: { text: string }) {
  const blocks = splitBlocks(text);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-foreground/90">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border bg-background/70 p-3 font-mono text-xs leading-relaxed"
            >
              {block.code}
            </pre>
          );
        }

        const lines = (block.text ?? "").split("\n");
        if (lines.every((line) => line.trim().length === 0)) return null;

        if (lines.every((line) => isBullet(line))) {
          return (
            <ul key={index} className="space-y-1 pl-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0">
                    <InlineText text={line.replace(/^\s*(?:[-*•])\s+/, "")} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => isNumbered(line))) {
          return (
            <ol key={index} className="space-y-1 pl-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 font-semibold text-brand">
                    {line.match(/^\s*(\d+)[.)]/)?.[1]}
                  </span>
                  <span className="min-w-0">
                    <InlineText text={line.replace(/^\s*\d+[.)]\s+/, "")} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index}>
            <InlineText text={block.text ?? ""} />
          </p>
        );
      })}
    </div>
  );
}

interface Block {
  type: "text" | "code";
  text?: string;
  code?: string;
}

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let currentText: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  const flushText = () => {
    if (currentText.length === 0) return;
    blocks.push({ type: "text", text: currentText.join("\n") });
    currentText = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", code: codeLines.join("\n") });
        codeLines = [];
        inCode = false;
      } else {
        flushText();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
    } else {
      if (line.trim().length === 0) {
        flushText();
        currentText.push("");
      } else {
        currentText.push(line);
      }
    }
  }

  if (inCode) {
    blocks.push({ type: "code", code: codeLines.join("\n") });
  } else {
    flushText();
  }

  return blocks;
}