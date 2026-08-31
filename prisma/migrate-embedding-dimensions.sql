-- RepoGuide Phase 5 — Migration from NVIDIA 1024-dim to Gemini 3072-dim embeddings.
--
-- SIMPLIFIED DESTRUCTIVE MIGRATION for testing stage.
--
-- This migration:
-- 1. Drops the legacy HNSW index (if exists)
-- 2. Drops the existing vector(1024) column (if exists)
-- 3. Creates new vector(3072) column
-- 4. Creates HNSW index using halfvec expression (supports up to 4000 dims)
--
-- Existing NVIDIA 1024-dim embeddings are discarded (cannot be reused).
-- Application will regenerate embeddings via runIndexing(projectId) after migration.
-- CodeIndex.model will be set to "gemini-embedding-2" for new indexes.

-- ============================================================
-- STEP 0: Detect current state and handle idempotently
-- ============================================================
DO $$
DECLARE
    col_dim integer;
    has_legacy_idx boolean;
    has_halfvec_idx boolean;
BEGIN
    -- Check if "vector" column exists and get its dimension
    SELECT atttypmod INTO col_dim
    FROM pg_attribute
    WHERE attrelid = '"FileChunk"'::regclass
      AND attname = 'vector'
      AND NOT attisdropped;

    -- Check for legacy HNSW index (vector_cosine_ops on vector column directly)
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'FileChunk'
          AND indexname = 'FileChunk_vector_idx'
          AND indexdef NOT LIKE '%halfvec%'
    ) INTO has_legacy_idx;

    -- Check for correct halfvec expression index
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'FileChunk'
          AND indexname = 'FileChunk_vector_idx'
          AND indexdef LIKE '%halfvec%'
    ) INTO has_halfvec_idx;

    -- Case 1: Already correct - vector(3072) with halfvec index
    IF col_dim = 3072 AND has_halfvec_idx THEN
        RAISE NOTICE 'Database already at target state: vector(3072) with halfvec HNSW index. Nothing to do.';
        RETURN;
    END IF;

    -- Case 2: vector(3072) but wrong/missing index - rebuild index only
    IF col_dim = 3072 AND NOT has_halfvec_idx THEN
        RAISE NOTICE 'vector(3072) exists but index needs rebuild. Dropping old index and creating halfvec index...';
        DROP INDEX IF EXISTS "FileChunk_vector_idx";
        CREATE INDEX IF NOT EXISTS "FileChunk_vector_idx"
            ON "FileChunk" USING hnsw (("vector"::halfvec(3072)) halfvec_cosine_ops);
        RAISE NOTICE 'halfvec HNSW index created.';
        RETURN;
    END IF;

    -- Case 3: vector(1024) or other - full migration needed
    IF col_dim IS NOT NULL AND col_dim <> 3072 THEN
        RAISE NOTICE 'Found vector column with dimension %. Migrating to 3072...', col_dim;
    ELSIF col_dim IS NULL THEN
        RAISE NOTICE 'No vector column found. Creating vector(3072) with halfvec index...';
    END IF;

    -- Drop legacy HNSW index if it exists
    IF has_legacy_idx THEN
        RAISE NOTICE 'Dropping legacy HNSW index...';
        DROP INDEX IF EXISTS "FileChunk_vector_idx";
    END IF;

    -- Drop the old vector column (discards NVIDIA 1024-dim embeddings)
    IF col_dim IS NOT NULL THEN
        RAISE NOTICE 'Dropping existing vector(%s) column...', col_dim;
        ALTER TABLE "FileChunk" DROP COLUMN "vector";
    END IF;

    -- Create new vector(3072) column
    RAISE NOTICE 'Creating vector(3072) column...';
    ALTER TABLE "FileChunk" ADD COLUMN "vector" vector(3072);

    -- Create halfvec HNSW index
    RAISE NOTICE 'Creating halfvec HNSW index...';
    CREATE INDEX IF NOT EXISTS "FileChunk_vector_idx"
        ON "FileChunk" USING hnsw (("vector"::halfvec(3072)) halfvec_cosine_ops);

    RAISE NOTICE 'Migration complete. Run runIndexing(projectId) to regenerate embeddings.';
END $$;