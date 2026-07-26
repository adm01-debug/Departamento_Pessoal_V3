#!/usr/bin/env bash
# ==============================================================
# P5-079: Script de build Mobile (Capacitor + Android)
# ==============================================================
# Uso:
#   ./scripts/capacitor-build.sh              # build web + sync android
#   ./scripts/capacitor-build.sh --apk        # build web + sync + APK
#   ./scripts/capacitor-build.sh --check      # apenas validação de ambiente
#
# Pré-requisitos na primeira execução:
#   npm install @capacitor/core @capacitor/cli
#   npx cap init "DP Folhas" "br.com.empresa.departamento-pessoal"
#   npm install @capacitor/android
#   npx cap add android
#
# Variáveis de ambiente:
#   ANDROID_HOME  — caminho do Android SDK (obrigatório para APK)
#   CAPACITOR_DIR — caminho do projeto capacitor (padrão: ./)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

ANDROID_SDK="${ANDROID_HOME:-}"
BUILD_APK=false
CHECK_ONLY=false

# ── Parse argumentos ──────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --apk)      BUILD_APK=true ;;
    --check)    CHECK_ONLY=true ;;
    --help|-h)
      echo "Uso: $0 [--apk|--check|--help]"
      echo "  --apk    executa build Android + APK (requer ANDROID_HOME)"
      echo "  --check  apenas validação de ambiente"
      exit 0
      ;;
  esac
done

# ── Cores ─────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }
info() { echo -e "${CYAN}ℹ${NC} $*"; }

# ── 1. Validação de ambiente ──────────────────────────────────
info "=== Validação de ambiente ==="

if [[ ! -f capacitor.config.ts ]]; then
  err "capacitor.config.ts não encontrado. Execute: npx cap init"
  exit 1
fi

# Versão do Node
NODE_VERSION=$(node -v)
info "Node: $NODE_VERSION"

# Capacitor CLI
if npx --yes @capacitor/cli@latest --version >/dev/null 2>&1; then
  CAP_VERSION=$(npx --yes @capacitor/cli@latest --version 2>/dev/null)
  log "Capacitor CLI: $CAP_VERSION"
else
  warn "Capacitor CLI não instalado. Execute: npm install @capacitor/cli @capacitor/core"
fi

# Dependências npm
info "Verificando dependências..."
if ! npm ci --dry-run >/dev/null 2>&1; then
  warn "npm ci falhou — executando npm install"
  npm install
fi

# Android SDK (requerido apenas para APK)
if [[ "$BUILD_APK" == "true" ]]; then
  if [[ -z "$ANDROID_SDK" ]]; then
    if [[ -d "$LOCALAPPDATA/Android/Sdk" ]]; then
      ANDROID_SDK="$LOCALAPPDATA/Android/Sdk"
    elif [[ -d "$HOME/Android/Sdk" ]]; then
      ANDROID_SDK="$HOME/Android/Sdk"
    fi
  fi

  if [[ -z "$ANDROID_SDK" || ! -d "$ANDROID_SDK" ]]; then
    err "ANDROID_HOME não configurado — Android SDK não encontrado."
    err "Instale em: https://developer.android.com/studio#command-line-tools-only"
    err "Após instalar, defina: export ANDROID_HOME=/caminho/para/Android/Sdk"
    exit 1
  fi
  log "Android SDK: $ANDROID_SDK"
fi

if [[ "$CHECK_ONLY" == "true" ]]; then
  log "Ambiente validado — sem erros."
  exit 0
fi

# ── 2. Build Web (Vite) ────────────────────────────────────────
info "=== Build Web (Vite) ==="
log "Executando: npm run build"

npm run build

if [[ ! -d dist ]]; then
  err "Diretório 'dist' não foi gerado. Verifique o build."
  exit 1
fi

DIST_SIZE=$(du -sh dist --block-size=1M 2>/dev/null | cut -f1 || du -sh dist | cut -f1)
log "Build OK — dist/ (${DIST_SIZE})"

# ── 3. Sync Capacitor ──────────────────────────────────────────
info "=== Sync Capacitor ==="
log "Executando: npx cap sync android"

npx cap sync android --no-interactive

# Copia source maps para Android (debugging de produção)
if [[ -f dist/assets/*.js.map ]]; then
  mkdir -p android/app/src/main/assets/public
  cp dist/assets/*.js.map android/app/src/main/assets/public/ 2>/dev/null || true
  log "Source maps copiados para Android"
fi

# ── 4. Build APK (opcional) ───────────────────────────────────
if [[ "$BUILD_APK" == "true" ]]; then
  info "=== Build Android APK ==="

  if [[ ! -d android ]]; then
    err "Diretório android/ não encontrado. Execute: npx cap add android"
    exit 1
  fi

  export ANDROID_HOME
  export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

  log "Executando: ./gradlew assembleDebug"
  cd android

  if ./gradlew assembleDebug --no-daemon 2>&1 | tee /tmp/capacitor-build.log; then
    APK=$(find . -name '*.apk' -type f 2>/dev/null | head -1)
    if [[ -n "$APK" ]]; then
      APK_SIZE=$(du -sh "$APK" --block-size=1M 2>/dev/null | cut -f1 || du -sh "$APK" | cut -f1)
      APK_ABS="$(pwd)/$APK"
      log "APK gerado: $APK_ABS (${APK_SIZE})"
      info "Para instalar no dispositivo: adb install '$APK_ABS'"
    else
      warn "Build concluído mas APK não encontrado em $(pwd)"
    fi
  else
    err "Gradle build falhou. Verifique:"
    err "  1. Android SDK instalado corretamente"
    err "  2. JAVA_HOME configurado (JDK 17+)"
    err "  3. Gradle daemon não travado: ./gradlew --stop"
    err "Logs: /tmp/capacitor-build.log"
    exit 1
  fi

  cd "$PROJECT_ROOT"
fi

# ── 5. Resumo ─────────────────────────────────────────────────
info ""
info "=== Build Mobile Completo ==="
log "Web:   dist/ — pronto para deploy"
log "Mobile: android/ — sincronizado com web"
if [[ "$BUILD_APK" == "true" ]]; then
  log "APK:   android/app/build/outputs/apk/debug/"
fi
info ""
info "Para reinstallar no dispositivo: npx cap open android"
