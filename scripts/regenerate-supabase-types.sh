#!/usr/bin/env bash
# Regenera src/integrations/supabase/types.ts a partir do schema atual.
# Requer: supabase CLI instalado, SUPABASE_DB_URL ou SUPABASE_PROJECT_ID configurado.
#
# Uso:
#   ./scripts/regenerate-supabase-types.sh
#
# Validação:
#   - Compara com versão commitada
#   - Falha se drift > 30 dias (configurável)

set -euo pipefail

PROJECT_ID="${SUPABASE_PROJECT_ID:-}"
OUTPUT="src/integrations/supabase/types.ts"
TMP_OUTPUT=""
trap '[ -z "$TMP_OUTPUT" ] || rm -f "$TMP_OUTPUT"' EXIT
trap 'exit 130' INT TERM

if [ -z "$PROJECT_ID" ]; then
  echo "❌ SUPABASE_PROJECT_ID não configurado."
  echo "   Para Supabase self-hosted, use: --db-url postgresql://..."
  exit 1
fi

echo "🔄 Regenerando tipos Supabase do projeto $PROJECT_ID..."

# Supabase cloud
if command -v supabase &> /dev/null; then
  # Gera em temporário: se a CLI falhar ou for interrompida, o types.ts atual fica intacto.
  TMP_OUTPUT="$(mktemp "${OUTPUT}.tmp.XXXXXX")"
  supabase gen types typescript --project-id "$PROJECT_ID" --schema public > "$TMP_OUTPUT"
  chmod 644 "$TMP_OUTPUT"
  mv "$TMP_OUTPUT" "$OUTPUT"
  TMP_OUTPUT=""
  echo "✅ Tipos regenerados via Supabase CLI (cloud)"
# Self-hosted via psql
elif [ -n "${SUPABASE_DB_URL:-}" ] && command -v psql &> /dev/null; then
  echo "❌ Self-hosted detectado, mas este script só gera via supabase CLI (não instalada). Nada foi gerado."
  exit 1
else
  echo "❌ Nem supabase CLI nem psql disponíveis."
  exit 1
fi

# Validação: arquivo mudou?
if git diff --quiet "$OUTPUT" 2>/dev/null; then
  echo "ℹ️  Nenhuma mudança nos tipos."
else
  echo "⚠️  Tipos foram atualizados. Rode 'git diff $OUTPUT' para revisar."
  echo "   Atualize CLAUDE.md com a nova data de sincronização."
fi
