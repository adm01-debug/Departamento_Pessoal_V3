#!/usr/bin/env bash
# Deploy de todas as Edge Functions no projeto Supabase canônico.
#
# Uso:
#   1. Instale o CLI: https://supabase.com/docs/guides/cli
#   2. Faça login:    supabase login
#   3. Rode:          bash scripts/deploy-functions-novo-projeto.sh
#
# Idempotente. Erros em uma função não interrompem as demais (continua e reporta no fim).
# O CLI lê os overrides de `verify_jwt` de supabase/config.toml. Nunca
# desabilite essa verificação globalmente: isso publicaria todas as Functions.

set -u
CANONICAL_PROJECT_REF="frjbfeamybqsejlvmqbl"
PROJECT_REF="${SUPABASE_PROJECT_REF:-$CANONICAL_PROJECT_REF}"
ALLOW_NON_CANONICAL_PROJECT="${ALLOW_NON_CANONICAL_PROJECT:-0}"
DRY_RUN="${DRY_RUN:-0}"
FUNCTIONS_DIR="supabase/functions"

if [ "$PROJECT_REF" != "$CANONICAL_PROJECT_REF" ] && [ "$ALLOW_NON_CANONICAL_PROJECT" != "1" ]; then
  echo "❌ Projeto '$PROJECT_REF' não é o canônico. Para um staging deliberado, defina ALLOW_NON_CANONICAL_PROJECT=1." >&2
  exit 64
fi

if [ "$DRY_RUN" != "1" ] && ! command -v supabase >/dev/null 2>&1; then
  echo "❌ supabase CLI não encontrado. Instale: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "❌ Diretório $FUNCTIONS_DIR não encontrado. Rode da raiz do projeto." >&2
  exit 1
fi

echo "🚀 Deploy de Edge Functions para projeto: $PROJECT_REF"
echo "----------------------------------------------------------"

declare -a OK=()
declare -a FAIL=()

for dir in "$FUNCTIONS_DIR"/*/; do
  name="$(basename "$dir")"
  # Ignora diretórios auxiliares (não são functions)
  case "$name" in
    _shared|_tests|_utils) continue ;;
  esac
  if [ ! -f "${dir}index.ts" ]; then
    continue
  fi

  echo ""
  echo "▶️  Deploy: $name"
  if [ "$DRY_RUN" = "1" ]; then
    echo "🧪 Dry-run: supabase functions deploy $name --project-ref $PROJECT_REF"
    OK+=("$name")
  elif supabase functions deploy "$name" --project-ref "$PROJECT_REF" 2>&1; then
    OK+=("$name")
  else
    FAIL+=("$name")
  fi
done

echo ""
echo "=========================================================="
echo "✅ Sucesso (${#OK[@]}): ${OK[*]:-nenhum}"
echo "❌ Falha  (${#FAIL[@]}): ${FAIL[*]:-nenhum}"
echo "=========================================================="

if [ "${#FAIL[@]}" -gt 0 ]; then
  exit 2
fi
