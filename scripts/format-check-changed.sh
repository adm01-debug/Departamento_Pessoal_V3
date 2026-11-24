#!/usr/bin/env bash
# Format-check only files changed vs the base ref.
# Rationale: enforcing Prettier on the entire legacy codebase would create a
# massive diff. Instead we gate NEW edits — anything a PR/commit touches must
# be formatted. Existing untouched files are opted-in gradually via
# `bun run format:write` on a per-directory basis.
set -euo pipefail

BASE_REF="${GITHUB_BASE_REF:-origin/main}"

# Fallback chain: try configured base, else main, else HEAD~1, else no diff.
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    BASE_REF="origin/main"
  elif git rev-parse --verify main >/dev/null 2>&1; then
    BASE_REF="main"
  elif git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    BASE_REF="HEAD~1"
  else
    echo "[format:check:changed] no base ref to diff against — skipping."
    exit 0
  fi
fi

mapfile -t CHANGED < <(
  git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD -- \
    'src/**/*.ts' 'src/**/*.tsx' 'src/**/*.css' 'src/**/*.json' 'src/**/*.md' \
    2>/dev/null || true
)

if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo "[format:check:changed] no changed source files vs $BASE_REF — OK."
  exit 0
fi

echo "[format:check:changed] checking ${#CHANGED[@]} changed file(s) vs $BASE_REF..."
exec bunx prettier --check "${CHANGED[@]}"
