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

# Edge Functions não importam nada do package.json (só npm:/jsr:/https:); sem isto
# todo bump de dependência do front exigia regenerar deno.lock e quebrava --frozen.
export DENO_NO_PACKAGE_JSON=1

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

command -v deno >/dev/null || {
  # No CI este script É o gate: sem deno ele não pode sair verde sem checar nada.
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error::[typecheck:edge] deno ausente no CI — gate reprovado (nada foi verificado)." >&2
    exit 1
  fi
  echo "[typecheck:edge] deno ausente — verificação ignorada neste ambiente." >&2
  echo "[typecheck:edge] Instale deno (https://deno.land) ou confie no gate de CI." >&2
  exit 0
}

echo "Type-check external-db-bridge (gate crítico)"
deno check --frozen --node-modules-dir=false supabase/functions/external-db-bridge/index.ts

ERRORS=0
for fn in supabase/functions/*/index.ts; do
  dir=$(dirname "$fn")
  name=$(basename "$dir")
  if [ "$name" = "external-db-bridge" ]; then continue; fi
  if ! deno check --frozen --node-modules-dir=false "$fn"; then
    ERRORS=$((ERRORS + 1))
    echo "::error file=$fn::Edge Function $name falhou no deno check"
  fi
done

echo "Funções com erros de tipo (não-bridge): $ERRORS"
[ "$ERRORS" -eq 0 ]
