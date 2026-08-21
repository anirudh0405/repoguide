// Code chunking for retrieval.
//
// Files are split into meaningful chunks rather than arbitrary N-character
// slices: function/class/method declarations start a new chunk, and oversized
// blocks are broken at logical boundaries (blank lines) instead of mid-token.
// Each chunk remembers the 1-based line range it came from so answers can be
// traced back to the real file.

export interface CodeChunk {
  content: string;
  startLine: number;
  endLine: number;
}

// Chunk cap is deliberately small: the default embedding model
// (nvidia/nv-embedqa-e5-v5) only accepts 512 tokens per input, and dense
// content like HTML tokenizes at ~1.5-2 characters per token, so chunks must
// stay well under ~600 characters to always embed in full.
export const DEFAULT_CHUNK_MAX_CHARS = 600;
export const DEFAULT_CHUNK_MAX_LINES = 80;

// Lines that look like the start of a declaration (function, class, method,
// component, top-level assignment) in common languages. A match means a new
// chunk should begin here.
const DECLARATION_PATTERNS: RegExp[] = [
  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+[A-Za-z_$]/,
  /^\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:final\s+)?class\s+[A-Za-z_$]/,
  /^\s*(?:export\s+)?(?:interface|enum|type|namespace|module)\s+[A-Za-z_$]/,
  /^\s*(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:function|\(|\w+\s*=>)/,
  /^\s*(?:export\s+)?let\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:function|\(|\w+\s*=>)/,
  /^\s*(?:public|private|protected|internal)\s+(?:static\s+|final\s+|readonly\s+|override\s+|abstract\s+|async\s+)*(?:function|class|interface|enum|struct|record|method)\b/,
  /^\s*(?:public|private|protected|internal)\s+(?:static\s+|final\s+|async\s+)*[A-Za-z_][\w<>,\[\],.\s]*\s+[A-Za-z_]\w*\s*\(/,
  /^\s*@\w+(?:\([^)]*\))?\s*(?:export\s+|default\s+)?(?:async\s+)?(?:function|class|const|let)\b/,
  /^\s*fn\s+[A-Za-z_]\w*/,
  /^\s*(?:pub\s+)?fn\s+[A-Za-z_]\w*/,
  /^\s*def\s+[A-Za-z_]\w*\s*\(/,
  /^\s*(?:async\s+)?def\s+[A-Za-z_]\w*\s*\(/,
  /^\s*class\s+[A-Za-z_]\w*(\s*\([^)]*\))?\s*:/,
  /^\s*func\s+[A-Za-z_]\w*\s*\(/,
  /^\s*sub\s+[A-Za-z_]\w*/,
  /^\s*procedure\s+[A-Za-z_]\w*/,
  /^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:function|procedure|sub|class)\s+[A-Za-z_]/i,
];

function isDeclarationLine(line: string): boolean {
  return DECLARATION_PATTERNS.some((pattern) => pattern.test(line));
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

/** Cheap rough token estimate (chars / 4), used to bound context size. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export interface ChunkOptions {
  maxCharsPerChunk?: number;
  maxLinesPerChunk?: number;
}

/**
 * Splits source text into meaningful chunks. Prefers declaration boundaries;
 * falls back to blank-line-separated blocks for files with no declarations.
 *
 * Chunks are guaranteed to stay under `maxCharsPerChunk` characters (checked
 * per chunk), so they fit within the embedding model's token limit — including
 * files with very long single lines.
 */
export function chunkCode(content: string, options: ChunkOptions = {}): CodeChunk[] {
  const maxChars = options.maxCharsPerChunk ?? DEFAULT_CHUNK_MAX_CHARS;
  const maxLines = options.maxLinesPerChunk ?? DEFAULT_CHUNK_MAX_LINES;

  const lines = content.split(/\r?\n/);
  const chunks: CodeChunk[] = [];

  // Push lines [startIdx, endIdx) as one or more chunks, splitting whenever a
  // block (or a single line) would exceed maxChars.
  const pushRange = (startIdx: number, endIdx: number): void => {
    let s = startIdx;
    while (s < endIdx) {
      let e = s + 1;
      let joined = lines[s];
      while (e < endIdx && joined.length + 1 + lines[e].length <= maxChars) {
        joined += "\n" + lines[e];
        e += 1;
      }

      if (joined.length > maxChars) {
        // A single line is longer than the cap — split it by characters.
        let offset = 0;
        while (offset < joined.length) {
          let cut = joined.lastIndexOf("\n", offset + maxChars - 1);
          if (cut < offset) cut = offset + maxChars;
          const piece = joined.slice(offset, cut);
          if (piece.trim().length > 0) {
            chunks.push({ content: piece, startLine: s + 1, endLine: s + 1 });
          }
          offset = cut;
        }
        s += 1;
      } else {
        if (joined.trim().length > 0) {
          chunks.push({ content: joined, startLine: s + 1, endLine: e });
        }
        s = e;
      }
    }
  };

  let start = 0;
  let cursor = 0;

  while (cursor < lines.length) {
    const isDeclaration = isDeclarationLine(lines[cursor]);
    const blockTooBig =
      cursor - start >= maxLines ||
      lines.slice(start, cursor + 1).join("\n").length >= maxChars;

    if (isDeclaration && cursor > start) {
      pushRange(start, cursor);
      start = cursor;
    } else if (blockTooBig) {
      // Cut at the last blank line inside the current block for a clean break.
      let cut = cursor + 1;
      for (let i = cursor; i > start && i >= cursor - 12; i -= 1) {
        if (isBlank(lines[i])) {
          cut = i;
          break;
        }
      }
      pushRange(start, cut);
      start = cut;
      if (start >= lines.length) break;
      cursor = start;
      continue;
    }

    cursor += 1;
  }

  pushRange(start, lines.length);
  return chunks;
}