#!/usr/bin/env bash
# ============================================================================
# E-095 · Healthcheck de ambiente — Departamento Pessoal
# Verifica: app web, edge `healthcheck`, endpoint de auth e bridge.
# Uso:  APP_URL=... SUPABASE_URL=... ./scripts/healthcheck.sh
# APP_URL é opcional até a hospedagem canônica ser definida; REQUIRE_APP=1 a torna obrigatória.
# Exit: 0 = tudo saudável · 1 = pelo menos uma falha
# ============================================================================
set -uo pipefail

APP_URL="${APP_URL:-}"
SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"
REQUIRE_APP="${REQUIRE_APP:-0}"
REQUIRE_BACKEND="${REQUIRE_BACKEND:-0}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-10}"
FAILURES=0

check() {
  local name="$1" url="$2" expect="${3:-200}" use_apikey="${4:-0}"
  local code
  if [ "$use_apikey" = "1" ] && [ -n "$SUPABASE_PUBLISHABLE_KEY" ]; then
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
      -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_PUBLISHABLE_KEY" \
      "$url" 2>/dev/null)
  else
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url" 2>/dev/null)
  fi
  # curl falho já emite 000 via -w; só garantir string vazia nunca vaze
  [ -z "$code" ] && code="000"
  if [ "$code" = "$expect" ]; then
    echo "✅ $name → HTTP $code"
  else
    echo "❌ $name → HTTP $code (esperado $expect) — $url"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "== Healthcheck $(date -u +%FT%TZ) =="
[ -n "$APP_URL" ] && echo "App: $APP_URL" || echo "App: (APP_URL não definida — pulando check do frontend)"
[ -n "$SUPABASE_URL" ] && echo "Supabase: $SUPABASE_URL" || echo "Supabase: (SUPABASE_URL não definida — pulando checks de backend)"

if [ "$REQUIRE_APP" = "1" ] && [ -z "$APP_URL" ]; then
  echo "❌ frontend obrigatório, mas APP_URL não está configurada"
  FAILURES=$((FAILURES + 1))
fi

if [ "$REQUIRE_BACKEND" = "1" ] && { [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ]; }; then
  echo "❌ backend obrigatório, mas SUPABASE_URL/chave pública não estão configuradas"
  FAILURES=$((FAILURES + 1))
fi

# 1. App web responde (quando uma hospedagem canônica estiver configurada)
if [ -n "$APP_URL" ]; then
  check "web app" "${APP_URL%/}/"
fi

# 2. Backend Supabase (se configurado)
if [ -n "$SUPABASE_URL" ]; then
  # Edge healthcheck é pública por decisão documentada (E-029, config.toml)
  check "edge healthcheck" "$SUPABASE_URL/functions/v1/healthcheck" "200" "1"
  # Auth settings endpoint responde (público por natureza)
  check "auth settings" "$SUPABASE_URL/auth/v1/settings" "200" "1"
  # Bridge exige POST: GET deve responder 405 (prova que está no ar e fail-closed)
  check "bridge method-gate" "$SUPABASE_URL/functions/v1/external-db-bridge" "405" "1"
fi

echo "== Resultado: $FAILURES falha(s) =="
[ "$FAILURES" -eq 0 ]
