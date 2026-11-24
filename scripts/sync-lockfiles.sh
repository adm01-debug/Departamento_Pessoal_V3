#!/usr/bin/env bash
# ============================================================
# P2-035: sync-lockfiles.sh
# Validates parity between bun.lock and package-lock.json
# Usage: ./scripts/sync-lockfiles.sh [--fix]
#   --fix   : update package-lock.json from bun.lock (dry-run by default)
# Exit codes:
#   0 = parity OK or --fix applied
#   1 = drift detected (CI should fail)
#   2 = missing lockfiles or dependencies
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK_BUN="$PROJECT_ROOT/bun.lock"
LOCK_NPM="$PROJECT_ROOT/package-lock.json"
LOCK_NPM_V3="$PROJECT_ROOT/node_modules/.package-lock.json"

# Critical packages to compare (production deps that affect runtime)
CRITICAL_PACKAGES=(
  "react"
  "react-dom"
  "react-router-dom"
  "zod"
  "zustand"
  "@tanstack/react-query"
  "@supabase/supabase-js"
  "vite"
  "typescript"
  "@hookform/resolvers"
  "react-hook-form"
  "recharts"
  "framer-motion"
  "zod"
)

# Threshold: warn if > N packages have version drift (fail CI if > 3)
DRIFT_THRESHOLD=3

# ── Helpers ────────────────────────────────────────────────

info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; }

has_bun()    { command -v bun >/dev/null 2>&1; }
has_npm()    { command -v npm >/dev/null 2>&1; }

# Extract version of a package from bun.lock (works with bun.lockb binary format)
bun_get_version() {
  local pkg="$1"
  # bun.lock is a binary TOML-like format. Try parsing via bun pm ls first.
  if has_bun; then
    bun pm ls --all 2>/dev/null | grep "^$pkg@" | head -1 | sed -E 's/.*@([0-9]+\.[0-9]+[^ ]*).*/\1/' || echo "NOT_FOUND"
  else
    echo "NOT_FOUND"
  fi
}

# Extract version from package-lock.json (npm v2/v3 format)
npm_get_version() {
  local pkg="$1"
  if [[ -f "$LOCK_NPM" ]]; then
    node -e "
      const lock = require('$LOCK_NPM');
      const v = lock.packages?.['node_modules/$pkg']?.version
             || lock.packages?.['node_modules/$pkg/node_modules/$pkg']?.version
             || lock.dependencies?.['$pkg']?.version
             || null;
      console.log(v || 'NOT_FOUND');
    " 2>/dev/null || echo "NOT_FOUND"
  else
    echo "NOT_FOUND"
  fi
}

# ── Pre-flight ─────────────────────────────────────────────

info "Checking lockfiles..."
[[ -f "$LOCK_BUN" ]] || { error "bun.lock not found at $LOCK_BUN"; exit 2; }
[[ -f "$LOCK_NPM" ]] || { info "package-lock.json not found (bun-only project — OK)"; exit 0; }

# ── Comparison ─────────────────────────────────────────────

info "Comparing bun.lock vs package-lock.json..."
info "Critical packages: ${CRITICAL_PACKAGES[*]}"

declare -A DRIFT=()
MAX_DRIFT=0

for pkg in "${CRITICAL_PACKAGES[@]}"; do
  bun_ver="$(bun_get_version "$pkg")"
  npm_ver="$(npm_get_version "$pkg")"

  if [[ "$bun_ver" == "NOT_FOUND" ]] || [[ "$npm_ver" == "NOT_FOUND" ]]; then
    # Package missing in one lockfile — only warn if it's in package.json
    if grep -q "\"$pkg\"" "$PROJECT_ROOT/package.json" 2>/dev/null; then
      warn "  $pkg: bun=$bun_ver  npm=$npm_ver  [MISSING IN ONE LOCKFILE]"
    fi
    continue
  fi

  if [[ "$bun_ver" != "$npm_ver" ]]; then
    DRIFT["$pkg"]="bun=$bun_ver  npm=$npm_ver"
    warn "  DRIFT: $pkg — bun=$bun_ver  npm=$npm_ver"
    ((MAX_DRIFT++))
  fi
done

# ── Result ─────────────────────────────────────────────────

if [[ $MAX_DRIFT -eq 0 ]]; then
  info "Parity OK — bun.lock and package-lock.json are in sync."
  exit 0
fi

if [[ $MAX_DRIFT -le $DRIFT_THRESHOLD ]]; then
  warn "Drift detected in $MAX_DRIFT package(s) — below threshold ($DRIFT_THRESHOLD)."
  info "Run with --fix to sync, or investigate manually."
  exit 0  # Warn but don't fail CI for small drift
fi

error "CRITICAL DRIFT: $MAX_DRIFT package(s) have version mismatch (threshold=$DRIFT_THRESHOLD)."
error "Run './scripts/sync-lockfiles.sh --fix' to update package-lock.json from bun.lock."
error "Review the diff with 'npm install --package-lock-only && git diff package-lock.json'"

# If --fix is passed, regenerate package-lock.json
if [[ "${1:-}" == "--fix" ]]; then
  info "Applying --fix: regenerating package-lock.json from bun.lock..."
  if has_npm; then
    npm install --package-lock-only 2>&1 | tail -5 || true
    info "package-lock.json regenerated. Review the diff:"
    git -C "$PROJECT_ROOT" diff --stat package-lock.json
    exit 0
  else
    error "npm not available — cannot regenerate package-lock.json."
    exit 2
  fi
fi

exit 1
