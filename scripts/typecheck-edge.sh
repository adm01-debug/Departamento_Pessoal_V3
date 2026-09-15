#!/usr/bin/env bash
# Mirrors the CI job "Edge Functions (deno check)" (.github/workflows/ci.yml)
# so a contributor can catch a real `deno check` failure before pushing.
#
# Why this exists: `npm run ci:verify` never ran `deno check` — only
# scripts/audit-edge-syntax.mjs, which parses Edge Function sources with the
# TypeScript compiler API for syntax errors only. It does not resolve the
# remote esm.sh/deno.land imports or the generated Database types, so a real
# type error (a renamed column, two different `@supabase/supabase-js`
# version pins resolving to structurally incompatible client types) passed
# every local gate and only surfaced in CI. See
# docs/auditoria/SIMULACAO_E_EXECUCAO_E51_2026-09-13.md for the two bugs this
# gap let through once.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

command -v deno >/dev/null || {
  echo "deno is required (https://deno.land) — install it or run this check in CI." >&2
  exit 1
}

echo "Type-check external-db-bridge (gate crítico)"
deno check --no-lock --node-modules-dir=false supabase/functions/external-db-bridge/index.ts

ERRORS=0
for fn in supabase/functions/*/index.ts; do
  dir=$(dirname "$fn")
  name=$(basename "$dir")
  if [ "$name" = "external-db-bridge" ]; then continue; fi
  if ! deno check --no-lock --node-modules-dir=false "$fn"; then
    ERRORS=$((ERRORS + 1))
    echo "::error file=$fn::Edge Function $name falhou no deno check"
  fi
done

echo "Funções com erros de tipo (não-bridge): $ERRORS"
[ "$ERRORS" -eq 0 ]
