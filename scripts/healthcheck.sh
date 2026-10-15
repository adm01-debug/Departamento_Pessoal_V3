#!/usr/bin/env bash
# ============================================================================
# E-095 · Healthcheck de ambiente — Departamento Pessoal
# Verifica: app web, build-sha do deploy, edge `healthcheck`, auth (settings
# + login E2E opcional), bridge (method-gate) e endpoint de métricas.
# Uso:  APP_URL=... SUPABASE_URL=... ./scripts/healthcheck.sh
# APP_URL é opcional até a hospedagem canônica ser definida; REQUIRE_APP=1 a torna obrigatória.
# W91: REQUIRE_LOGIN=1 torna falha de login E2E não-admin fatal (default: só avisa).
# W91: REQUIRE_BUILD_SHA=1 torna um build-sha divergente fatal (ausência da meta
#      tag NUNCA é fatal — ver nota no check_build_sha).
# Exit: 0 = tudo saudável · 1 = pelo menos uma falha
# ============================================================================
set -uo pipefail

APP_URL="${APP_URL:-}"
SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"
REQUIRE_APP="${REQUIRE_APP:-0}"
REQUIRE_BACKEND="${REQUIRE_BACKEND:-0}"
# W91b: identidade E2E não-admin — mesmos secrets já usados em e2e.yml
# (E2E_NON_ADMIN_EMAIL/E2E_NON_ADMIN_PASSWORD). Login é só um sinal de saúde
# do Auth; REQUIRE_LOGIN decide se uma falha aqui derruba o healthcheck.
E2E_NON_ADMIN_EMAIL="${E2E_NON_ADMIN_EMAIL:-}"
E2E_NON_ADMIN_PASSWORD="${E2E_NON_ADMIN_PASSWORD:-}"
REQUIRE_LOGIN="${REQUIRE_LOGIN:-0}"
REQUIRE_BUILD_SHA="${REQUIRE_BUILD_SHA:-0}"
# W91a: SHA esperado no <meta name="build-sha"> do deploy sob teste.
EXPECTED_BUILD_SHA="${EXPECTED_BUILD_SHA:-${GITHUB_SHA:-}}"
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

# W91a: compara o <meta name="build-sha" content="..."> servido em `GET /`
# com o SHA esperado (commit atual no healthcheck; commit do deploy no
# post-deploy-smoke). A meta tag só existe a partir do primeiro build feito
# após este PR (vite.config.ts injeta no HTML quando VITE_GIT_SHA/
# VERCEL_GIT_COMMIT_SHA/GITHUB_SHA está presente no ambiente de build) — por
# isso a AUSÊNCIA da tag nunca é fatal, só um aviso. Uma divergência (tag
# presente mas com outro SHA) é um sinal real de deploy desatualizado/stale;
# REQUIRE_BUILD_SHA=1 decide se isso derruba o healthcheck.
check_build_sha() {
  local url="$1" expected="$2" body found
  body=$(curl -sS --max-time "$TIMEOUT" "$url" 2>/dev/null)
  if [ -z "$body" ]; then
    echo "⚠️  build-sha → não foi possível ler o body de $url (ver check 'web app' acima)"
    return 0
  fi
  found=$(printf '%s' "$body" | grep -o '<meta[^>]*name="build-sha"[^>]*content="[^"]*"' | head -1 | sed -E 's/.*content="([^"]*)".*/\1/')
  if [ -z "$found" ]; then
    echo "⚠️  build-sha → meta tag ausente em $url (esperado até o 1º deploy pós-W91; não bloqueante)"
    return 0
  fi
  if [ -z "$expected" ]; then
    echo "⚠️  build-sha → meta tag presente ($found) mas nenhum SHA esperado foi informado (GITHUB_SHA/EXPECTED_BUILD_SHA vazio) — pulando comparação"
    return 0
  fi
  # Prefixo também conta como match (SHA curto vs completo).
  if [ "$found" = "$expected" ] || [ "${expected#"$found"}" != "$expected" ] || [ "${found#"$expected"}" != "$found" ]; then
    echo "✅ build-sha → $found (deploy corresponde ao commit esperado)"
  else
    if [ "$REQUIRE_BUILD_SHA" = "1" ]; then
      echo "❌ build-sha → $found (esperado $expected) — deploy desatualizado em $url"
      FAILURES=$((FAILURES + 1))
    else
      echo "⚠️  build-sha → $found (esperado $expected) — possível deploy desatualizado (REQUIRE_BUILD_SHA=0 — não bloqueante)"
    fi
  fi
}

# W91b: POST /auth/v1/token?grant_type=password com a identidade E2E
# não-admin. JSON vai via stdin (--data-binary @-) para a senha nunca
# aparecer como argumento de processo (ps/logs). Só confirma que o Auth
# aceita login de verdade — não é um teste E2E completo.
check_login() {
  local email="$1" password="$2" url="$3" json code
  # Escape só o necessário para um JSON string válido (\ e "); e-mail/senha
  # de teste não devem conter newlines/control chars.
  local e_esc="${email//\\/\\\\}"; e_esc="${e_esc//\"/\\\"}"
  local p_esc="${password//\\/\\\\}"; p_esc="${p_esc//\"/\\\"}"
  json="{\"email\":\"${e_esc}\",\"password\":\"${p_esc}\"}"
  code=$(printf '%s' "$json" | curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
    -X POST \
    -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @- \
    "$url" 2>/dev/null)
  [ -z "$code" ] && code="000"
  if [ "$code" = "200" ]; then
    echo "✅ login (E2E não-admin) → HTTP $code"
    return 0
  fi
  if [ "$REQUIRE_LOGIN" = "1" ]; then
    echo "❌ login (E2E não-admin) → HTTP $code (esperado 200) — $url"
    FAILURES=$((FAILURES + 1))
  else
    echo "⚠️  login (E2E não-admin) → HTTP $code (REQUIRE_LOGIN=0 — não bloqueante) — $url"
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

# W91b: login obrigatório só é cobrado se REQUIRE_LOGIN=1 pedir credenciais
# que não existem — a tentativa de login em si segue não-bloqueante por
# padrão (ver check_login).
if [ "$REQUIRE_LOGIN" = "1" ] && { [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ] || [ -z "$E2E_NON_ADMIN_EMAIL" ] || [ -z "$E2E_NON_ADMIN_PASSWORD" ]; }; then
  echo "❌ login obrigatório (REQUIRE_LOGIN=1), mas SUPABASE_URL/chave/credenciais E2E não-admin não estão configuradas"
  FAILURES=$((FAILURES + 1))
fi

# 1. App web responde (quando uma hospedagem canônica estiver configurada)
if [ -n "$APP_URL" ]; then
  check "web app" "${APP_URL%/}/"
  # W91a: build-sha — ver comentário na definição de check_build_sha.
  check_build_sha "${APP_URL%/}/" "$EXPECTED_BUILD_SHA"
fi

# 2. Backend Supabase (se configurado)
if [ -n "$SUPABASE_URL" ]; then
  # Edge healthcheck é pública por decisão documentada (E-029, config.toml)
  check "edge healthcheck" "$SUPABASE_URL/functions/v1/healthcheck" "200" "1"
  # Auth settings endpoint responde (público por natureza)
  check "auth settings" "$SUPABASE_URL/auth/v1/settings" "200" "1"
  # Bridge exige POST: GET deve responder 405 (prova que está no ar e fail-closed)
  check "bridge method-gate" "$SUPABASE_URL/functions/v1/external-db-bridge" "405" "1"
  # W91c: métricas Prometheus do bridge — 503 = scrape incompleto/degradado
  # (fail-closed por design, ver supabase/functions/metrics/index.ts).
  check "bridge metrics" "$SUPABASE_URL/functions/v1/metrics" "200" "1"

  # W91b: login da identidade E2E não-admin (não bloqueante salvo REQUIRE_LOGIN=1)
  if [ -n "$SUPABASE_PUBLISHABLE_KEY" ] && [ -n "$E2E_NON_ADMIN_EMAIL" ] && [ -n "$E2E_NON_ADMIN_PASSWORD" ]; then
    check_login "$E2E_NON_ADMIN_EMAIL" "$E2E_NON_ADMIN_PASSWORD" "$SUPABASE_URL/auth/v1/token?grant_type=password"
  else
    echo "⚠️  login (E2E não-admin): E2E_NON_ADMIN_EMAIL/PASSWORD não definidas — pulando"
  fi
fi

echo "== Resultado: $FAILURES falha(s) =="
[ "$FAILURES" -eq 0 ]
