#!/usr/bin/env bash
# Deploy de todas as Edge Functions no NOVO projeto Supabase (frjbfeamybqsejlvmqbl).
#
# Uso:
#   1. Instale o CLI: https://supabase.com/docs/guides/cli
#   2. Faça login:    supabase login
#   3. Rode:          bash scripts/deploy-functions-novo-projeto.sh
#
# Idempotente. Erros em uma função não interrompem as demais (continua e reporta no fim).

set -u
PROJECT_REF="${SUPABASE_PROJECT_REF:-frjbfeamybqsejlvmqbl}"
FUNCTIONS_DIR="supabase/functions"

if ! command -v supabase >/dev/null 2>&1; then
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
  if supabase functions deploy "$name" --project-ref "$PROJECT_REF" --no-verify-jwt 2>&1; then
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
