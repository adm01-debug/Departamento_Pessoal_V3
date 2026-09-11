#!/usr/bin/env bash
# Regressão dos gates dinâmicos do banco:
# - sem alvo configurado, a execução local pode ser informativa;
# - com alvo configurado mas inacessível, nunca pode sair verde.
#
# O CI instala postgresql-client antes de chamar este script. A porta 1 do
# loopback é deliberadamente impossível para esta prova e não toca em banco
# algum.
set -euo pipefail

scripts=(
  scripts/audit-db-search-path.mjs
  scripts/smoke-hash-triggers.mjs
  scripts/audit-rls-pii.mjs
  scripts/audit-rls-least-privilege.mjs
  scripts/audit-rls-tenant-open.mjs
  scripts/audit-secdef-authz.mjs
  scripts/audit-embed-hints.mjs
)

for script in "${scripts[@]}"; do
  if ! env -u PGHOST -u DATABASE_URL -u SUPABASE_DB_URL node "$script" >/dev/null 2>&1; then
    echo "❌ $script deveria apenas informar ausência de alvo fora do CI" >&2
    exit 1
  fi

  if DATABASE_URL='postgresql://127.0.0.1:1/postgres?connect_timeout=1' \
    node "$script" >/dev/null 2>&1; then
    echo "❌ $script aprovou um alvo de auditoria inalcançável" >&2
    exit 1
  fi
done

echo "✅ Contrato fail-closed aprovado para ${#scripts[@]} auditores de banco."
