-- RepoGuide Phase 5 — vector search setup.
--
-- Creates the semantic-index tables (CodeIndex, FileChunk, ChatSession,
-- ChatMessage), enables the pgvector extension, and adds the `vector`
-- column + HNSW index that Prisma intentionally does not manage (Prisma's
-- `db push` cannot create `Unsupported` columns).
--
-- One-time apply (or re-run safely thanks to IF NOT EXISTS where supported).

CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CodeIndex" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INDEXING',
    "step" TEXT,
    "error" TEXT,
    "analysisId" TEXT,
    "commitSha" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FileChunk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CodeIndex_projectId_key" ON "CodeIndex"("projectId");
CREATE INDEX IF NOT EXISTS "CodeIndex_status_idx" ON "CodeIndex"("status");

CREATE INDEX IF NOT EXISTS "FileChunk_projectId_idx" ON "FileChunk"("projectId");
CREATE INDEX IF NOT EXISTS "FileChunk_projectId_filePath_idx" ON "FileChunk"("projectId", "filePath");
CREATE UNIQUE INDEX IF NOT EXISTS "FileChunk_projectId_fileId_chunkIndex_key" ON "FileChunk"("projectId", "fileId", "chunkIndex");

CREATE INDEX IF NOT EXISTS "ChatSession_projectId_idx" ON "ChatSession"("projectId");
CREATE INDEX IF NOT EXISTS "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt");

CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- AddForeignKey (guarded so the script stays idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CodeIndex_projectId_fkey') THEN
        ALTER TABLE "CodeIndex" ADD CONSTRAINT "CodeIndex_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatSession_projectId_fkey') THEN
        ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatSession_userId_fkey') THEN
        ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_sessionId_fkey') THEN
        ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- pgvector column + HNSW cosine index (managed outside Prisma).
ALTER TABLE "FileChunk" ADD COLUMN IF NOT EXISTS "vector" vector(1024);

CREATE INDEX IF NOT EXISTS "FileChunk_vector_idx"
    ON "FileChunk" USING hnsw ("vector" vector_cosine_ops);