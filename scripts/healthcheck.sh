#!/usr/bin/env bash
# ============================================================================
# E-095 · Healthcheck de ambiente — Departamento Pessoal
# Verifica: app web, edge `healthcheck`, endpoint de auth e bridge.
# Uso:  APP_URL=... SUPABASE_URL=... ./scripts/healthcheck.sh
# Exit: 0 = tudo saudável · 1 = pelo menos uma falha
# ============================================================================
set -uo pipefail

APP_URL="${APP_URL:-https://sistema-dp.lovable.app}"
SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-10}"
FAILURES=0

check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$expect" ]; then
    echo "✅ $name → HTTP $code"
  else
    echo "❌ $name → HTTP $code (esperado $expect) — $url"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "== Healthcheck $(date -u +%FT%TZ) =="
echo "App: $APP_URL"
[ -n "$SUPABASE_URL" ] && echo "Supabase: $SUPABASE_URL" || echo "Supabase: (SUPABASE_URL não definida — pulando checks de backend)"

# 1. App web responde
check "web app" "$APP_URL/"

# 2. Backend Supabase (se configurado)
if [ -n "$SUPABASE_URL" ]; then
  # Edge healthcheck é pública por decisão documentada (E-029, config.toml)
  check "edge healthcheck" "$SUPABASE_URL/functions/v1/healthcheck"
  # Auth settings endpoint responde (público por natureza)
  check "auth settings" "$SUPABASE_URL/auth/v1/settings"
  # Bridge exige POST: GET deve responder 405 (prova que está no ar e fail-closed)
  check "bridge method-gate" "$SUPABASE_URL/functions/v1/external-db-bridge" "405"
fi

echo "== Resultado: $FAILURES falha(s) =="
[ "$FAILURES" -eq 0 ]
