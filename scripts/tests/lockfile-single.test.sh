#!/usr/bin/env bash
# W03 — npm é o gerenciador único. Impede o retorno do drift D1 (dois lockfiles
# divergindo). A paridade package.json ↔ package-lock.json é garantida pelo
# próprio `npm ci`, que falha quando os dois estão fora de sincronia.
#
# Uso: bash scripts/tests/lockfile-single.test.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

echo "── lockfile-single"

if [[ -f "$ROOT/package-lock.json" ]]; then
  echo "  ok:   package-lock.json presente"
else
  echo "  FAIL: package-lock.json ausente"
  FAIL=1
fi

for lock in bun.lock bun.lockb yarn.lock pnpm-lock.yaml; do
  if [[ -e "$ROOT/$lock" ]]; then
    echo "  FAIL: $lock encontrado — npm é o gerenciador único (W03)"
    FAIL=1
  fi
done

PM=$(node -p "require('$ROOT/package.json').packageManager ?? ''")
if [[ "$PM" == npm@* ]]; then
  echo "  ok:   packageManager=$PM"
else
  echo "  FAIL: package.json packageManager deve ser npm@* (atual: '${PM}')"
  FAIL=1
fi

if grep -nE '\bbunx?\b|setup-bun' "$ROOT"/.github/workflows/*.yml; then
  echo "  FAIL: workflows ainda referenciam Bun (linhas acima)"
  FAIL=1
else
  echo "  ok:   nenhum workflow usa Bun"
fi

if [[ $FAIL -ne 0 ]]; then
  echo ""
  echo "lockfile-single FALHOU."
  exit 1
fi
echo ""
echo "lockfile-single OK."
