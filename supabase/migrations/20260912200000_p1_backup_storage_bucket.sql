-- P1: provision the bucket already required by backup-automatico.
-- Backups contain bulk PII and remain service-role only; authenticated users
-- receive time-limited signed URLs from the admin-only Edge Function.

DO $preflight$
BEGIN
  IF to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'backup bucket requires Supabase storage tables';
  END IF;
END
$preflight$;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'backups',
  'backups',
  false,
  104857600,
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS backups_service_role_all ON storage.objects;
CREATE POLICY backups_service_role_all
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'backups')
  WITH CHECK (bucket_id = 'backups');

COMMENT ON POLICY backups_service_role_all ON storage.objects IS
  'Only the service-role backup function may store or retrieve bulk backup objects.';
