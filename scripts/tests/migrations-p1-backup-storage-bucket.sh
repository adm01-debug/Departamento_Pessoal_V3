#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912200000_p1_backup_storage_bucket.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-backup-bucket-$$"
cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/migration.sql
docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets(
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL,
  file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE storage.objects(id text PRIMARY KEY DEFAULT md5(random()::text), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon, authenticated, service_role;
SQL

for pass in 1 2; do run_psql -f /tmp/migration.sql >/dev/null; done

bucket="$(run_psql -qAtc "SELECT public::text||':'||file_size_limit||':'||array_to_string(allowed_mime_types,',') FROM storage.buckets WHERE id='backups';")"
[ "$bucket" = "false:104857600:application/json" ] || { echo "bucket contract failed: $bucket" >&2; exit 1; }

anon_count="$(run_psql -qAtc "SET ROLE anon; SELECT count(*) FROM storage.objects WHERE bucket_id='backups';")"
[ "$anon_count" = "0" ] || { echo "anonymous storage scope failed" >&2; exit 1; }
run_psql -c "SET ROLE service_role; INSERT INTO storage.objects(bucket_id,name) VALUES('backups','tenant/backup.json');" >/dev/null
service_count="$(run_psql -qAtc "SET ROLE service_role; SELECT count(*) FROM storage.objects WHERE bucket_id='backups';")"
[ "$service_count" = "1" ] || { echo "service role bucket access failed" >&2; exit 1; }

run_psql -c 'CREATE DATABASE missing_storage' >/dev/null
set +e
missing="$(docker exec "$NAME" psql -X -U postgres -d missing_storage -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"; status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *"requires Supabase storage tables"* ]] || { echo "preflight did not fail closed" >&2; exit 1; }

echo 'P1_BACKUP_BUCKET_OK: private/MIME/size/service-only/idempotency/preflight scenarios passed.'
