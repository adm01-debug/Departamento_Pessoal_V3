\set ON_ERROR_STOP on

-- SOMENTE DR/STAGING LOCAL.
-- A imagem local usada na auditoria (PostgreSQL 17.6.1.159) tinha o schema
-- gerenciado de Storage anterior ao schema canônico. Nunca executar este
-- arquivo no projeto hospedado sem comparar antes canonical_storage_schema.sql.

ALTER TABLE storage.buckets
  ADD COLUMN IF NOT EXISTS versioning_status text DEFAULT 'DISABLED'::text NOT NULL;

ALTER TABLE storage.objects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_delete_marker boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS is_versioned boolean DEFAULT false NOT NULL;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'storage.buckets'::regclass
      AND conname = 'buckets_versioning_dark_check'
  ) THEN
    ALTER TABLE storage.buckets
      ADD CONSTRAINT buckets_versioning_dark_check
      CHECK (versioning_status = 'DISABLED'::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'storage.buckets'::regclass
      AND conname = 'buckets_versioning_standard_only_check'
  ) THEN
    ALTER TABLE storage.buckets
      ADD CONSTRAINT buckets_versioning_standard_only_check
      CHECK (
        type = 'STANDARD'::storage.buckettype
        OR versioning_status = 'DISABLED'::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'storage.buckets'::regclass
      AND conname = 'buckets_versioning_status_check'
  ) THEN
    ALTER TABLE storage.buckets
      ADD CONSTRAINT buckets_versioning_status_check
      CHECK (
        versioning_status = ANY (
          ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text]
        )
      );
  END IF;
END
$block$;
