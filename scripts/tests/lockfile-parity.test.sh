#!/usr/bin/env bash
# W98 — Paridade package.json ↔ package-lock.json.
# Detecta regressão D1: lock desatualizado (package.json mudou sem regenerar o lock).
# Não faz `npm install`; usa apenas node -e para leitura rápida dos manifests.
#
# Uso: bash scripts/tests/lockfile-parity.test.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

echo "── lockfile-parity"

PKG="$ROOT/package.json"
LOCK="$ROOT/package-lock.json"

# 1. Ambos os arquivos existem
if [[ ! -f "$PKG" ]]; then
  echo "  FAIL: package.json ausente"
  FAIL=1
fi
if [[ ! -f "$LOCK" ]]; then
  echo "  FAIL: package-lock.json ausente"
  FAIL=1
fi

[[ $FAIL -ne 0 ]] && { echo "Arquivos essenciais ausentes."; exit 1; }

# 2. lockfileVersion >= 3 (npm v7+)
LFV=$(node -p "JSON.parse(require('fs').readFileSync('$LOCK','utf8')).lockfileVersion")
if [[ "$LFV" -ge 3 ]]; then
  echo "  ok:   lockfileVersion=$LFV (>= 3)"
else
  echo "  FAIL: lockfileVersion=$LFV < 3 — regenerar com npm install"
  FAIL=1
fi

# 3. name e version coincidem entre package.json e packages[""] do lockfile
node - <<'JS'
const fs = require('fs');
const pkg  = JSON.parse(fs.readFileSync(process.env.PKG,  'utf8'));
const lock = JSON.parse(fs.readFileSync(process.env.LOCK, 'utf8'));
const root = (lock.packages || {})[''] || {};
let ok = true;
if (root.name !== pkg.name) {
  console.error('  FAIL: nome diverge — pkg:', pkg.name, '/ lock:', root.name);
  ok = false;
}
if (root.version !== pkg.version) {
  console.error('  FAIL: versão diverge — pkg:', pkg.version, '/ lock:', root.version);
  ok = false;
}
if (ok) console.log('  ok:   name e version coincidem');
process.exitCode = ok ? 0 : 1;
JS
if [[ $? -ne 0 ]]; then FAIL=1; fi

# 4. Dependências diretas declaradas em package.json existem no lockfile
node - <<'JS'
const fs = require('fs');
const pkg  = JSON.parse(fs.readFileSync(process.env.PKG,  'utf8'));
const lock = JSON.parse(fs.readFileSync(process.env.LOCK, 'utf8'));
const allDeps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
const pkgs = lock.packages || {};
const missing = Object.keys(allDeps).filter(name => {
  // Aceita node_modules/<name> ou node_modules/@scope/<name>
  return !Object.keys(pkgs).some(k => k === `node_modules/${name}` || k.endsWith(`/${name}`));
});
if (missing.length === 0) {
  console.log('  ok:   todas as dependências diretas presentes no lock');
} else {
  console.error('  FAIL: dependências ausentes no lock:', missing.join(', '));
  process.exitCode = 1;
}
JS
if [[ $? -ne 0 ]]; then FAIL=1; fi

# 5. package-lock.json não é mais antigo que package.json
# (mtime: lock deve ter sido regenerado APÓS ou JUNTO com package.json)
PKG_MTIME=$(stat -c '%Y' "$PKG")
LOCK_MTIME=$(stat -c '%Y' "$LOCK")
if [[ "$LOCK_MTIME" -ge "$PKG_MTIME" ]]; then
  echo "  ok:   package-lock.json atualizado (mtime >= package.json)"
else
  echo "  WARN: package-lock.json mais antigo que package.json — rode npm install"
  # Não falha — pode ser artefato de checkout; npm ci detecta o drift real
fi

export PKG LOCK

if [[ $FAIL -ne 0 ]]; then
  echo ""
  echo "lockfile-parity FALHOU. Rode: npm install && git add package-lock.json"
  exit 1
fi
echo ""
echo "lockfile-parity OK."
