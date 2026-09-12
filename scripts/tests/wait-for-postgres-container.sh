#!/usr/bin/env bash
# Wait until a disposable PostgreSQL container executes a real query. A bare
# pg_isready probe can turn green slightly before the SQL session is usable on
# loaded GitHub runners, which made the migration suite intermittently fail.
set -euo pipefail

NAME="${1:?container name is required}"
MAX_ATTEMPTS="${2:-60}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if docker exec "$NAME" psql -X -h 127.0.0.1 -U postgres -qAtc 'SELECT 1' 2>/dev/null | grep -qx '1'; then
    exit 0
  fi
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then sleep 1; fi
done

echo "PostgreSQL container $NAME did not execute SQL within ${MAX_ATTEMPTS}s" >&2
docker logs "$NAME" >&2 || true
exit 1
