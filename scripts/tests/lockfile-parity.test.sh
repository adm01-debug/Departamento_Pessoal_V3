#!/usr/bin/env bash
# W98 — Verifica paridade entre package.json e bun.lock.
# Detecta o problema D1: Dependabot atualiza package-lock.json mas não bun.lock,
# fazendo `bun install --frozen-lockfile` falhar no CI.
#
# Uso: bash scripts/tests/lockfile-parity.test.sh
# Saída 0 = OK, saída 1 = divergência detectada.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCKFILE="$ROOT/bun.lock"
PKG="$ROOT/package.json"

echo "── lockfile-parity"

# 1. bun.lock deve existir
if [[ ! -f "$LOCKFILE" ]]; then
  echo "  FAIL: bun.lock não encontrado em $ROOT (D1)"
  exit 1
fi
echo "  ok:   bun.lock existe"

# 2. Versão do lockfile deve ser reconhecida (1 = Bun 1.3.x, 3 = Bun 1.4.x+)
LF_VERSION=$(grep -m1 '"lockfileVersion"' "$LOCKFILE" | grep -oE '[0-9]+' | head -1 || true)
if [[ -z "$LF_VERSION" ]]; then
  echo "  FAIL: lockfileVersion não encontrada em bun.lock"
  exit 1
fi
if [[ "$LF_VERSION" != "1" && "$LF_VERSION" != "3" ]]; then
  echo "  FAIL: lockfileVersion=$LF_VERSION não reconhecida (esperado 1 ou 3)"
  exit 1
fi
echo "  ok:   lockfileVersion=$LF_VERSION"

# 3. bun deve ser capaz de ler o lockfile sem divergência.
# Usa --frozen-lockfile para detectar divergências sem modificar o lockfile.
# Se bun não estiver instalado, pula com aviso.
if ! command -v bun &>/dev/null; then
  echo "  WARN: bun não encontrado — checagem de frozen-lockfile pulada"
  echo ""
  echo "─────────────────────────────────────────"
  echo ""
  echo "lockfile-parity OK (bun ausente, checks parciais)."
  echo ""
  exit 0
fi

BUN_VER=$(bun --version 2>/dev/null || echo "unknown")
echo "  ok:   bun $BUN_VER disponível"

# Roda em subshell para não contaminar o ambiente
if ! (cd "$ROOT" && bun install --frozen-lockfile --no-progress 2>&1 | grep -v "^$"); then
  echo ""
  echo "  FAIL: bun install --frozen-lockfile falhou — bun.lock divergiu de package.json (D1)"
  echo "        Corrija: bun install (sem --frozen-lockfile) e commite bun.lock"
  exit 1
fi

echo "  ok:   bun install --frozen-lockfile passou"

# 4. Verifica que as dependências diretas de package.json estão no bun.lock
MISSING=0
PKG_NAMES=$(node -e "
const p = require('$PKG');
const deps = { ...p.dependencies, ...p.devDependencies };
Object.keys(deps).forEach(k => console.log(k));
" 2>/dev/null || true)

while IFS= read -r pkg_name; do
  [[ -z "$pkg_name" ]] && continue
  if ! grep -qF "\"$pkg_name\"" "$LOCKFILE" && ! grep -qF "\"${pkg_name}@" "$LOCKFILE"; then
    echo "  WARN: $pkg_name listado em package.json mas não encontrado em bun.lock"
    MISSING=$((MISSING + 1))
  fi
done <<< "$PKG_NAMES"

if [[ $MISSING -gt 0 ]]; then
  echo ""
  echo "  FAIL: $MISSING pacote(s) de package.json ausentes em bun.lock"
  exit 1
fi

echo ""
echo "─────────────────────────────────────────"
echo ""
echo "lockfile-parity OK."
echo ""
