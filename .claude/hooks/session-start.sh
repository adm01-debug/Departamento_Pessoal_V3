#!/bin/bash
# Sessão na nuvem: instala o graphify e gera/atualiza o grafo do código em graphify-out/.
# graph.json fica fora do Git, então cada clone precisa gerar o seu; sem isso os agentes da nuvem
# não têm graph.json e buscam por texto às cegas. Mesmo hook do Zapp Web V2 (#2632), adaptado:
# - Só roda com CLAUDE_CODE_REMOTE=true (VPS/local usam `npm run graph:update`).
# - Assíncrono: o build leva minutos e não segura o início da sessão.
# - Pula se o grafo já foi gerado no commit atual (marca em graphify-out/.session-built-commit).
# - Neste repo GRAPH_REPORT.md e manifest.json são versionados: o build da sessão os marca com
#   `git update-index --skip-worktree` para não sujar o `git status` nem entrar por engano num PR.
#   Para commitar um rebuild de propósito: git update-index --no-skip-worktree <arquivo>.
# Log de tudo (instalação inclusive): graphify-out/.session-start.log
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 900000}'

cd "${CLAUDE_PROJECT_DIR:-.}"
export PATH="$HOME/.local/bin:$PATH"
mkdir -p graphify-out
LOG=graphify-out/.session-start.log
MARCA=graphify-out/.session-built-commit
versao="${GRAPHIFY_VERSION:-0.9.68}"

exec >>"$LOG" 2>&1
echo "== $(date -u +%FT%TZ) session-start (graphify $versao)"

# O hook também dispara em resume/clear/compact, que podem cair no meio de um build de
# minutos: só um por vez neste clone. O segundo sai na hora; o primeiro termina e carimba.
exec 9>graphify-out/.session-start.lock
if ! flock -n 9; then
  echo "outro session-start já está rodando neste clone — saindo"
  exit 0
fi

# Instala/confere a versão ANTES do atalho: o grafo pode estar em dia e o binário ter sumido
# (os hooks hook-guard dependem dele).
if ! graphify --version 2>/dev/null | grep -qx "graphify $versao"; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install --force "graphifyy[sql]==${versao}"
  elif command -v pipx >/dev/null 2>&1; then
    pipx install --force "graphifyy[sql]==${versao}"
  else
    python3 -m pip install --user --quiet "graphifyy[sql]==${versao}"
  fi
fi
graphify --version

head_sha="$(git rev-parse HEAD)"
if [ -f graphify-out/graph.json ] && [ "$(cat "$MARCA" 2>/dev/null)" = "$head_sha" ]; then
  echo "grafo já está no commit $head_sha — nada a fazer"
  exit 0
fi

rm -f "$MARCA"
git update-index --skip-worktree graphify-out/GRAPH_REPORT.md graphify-out/manifest.json 2>/dev/null || true
PYTHONHASHSEED=0 graphify update .
# O build roda em segundo plano: se o checkout mudou no meio, não carimba — a próxima sessão refaz.
if [ "$(git rev-parse HEAD)" = "$head_sha" ]; then
  echo "$head_sha" > "$MARCA"
  echo "grafo pronto no commit $head_sha"
else
  echo "HEAD mudou durante o build ($head_sha -> $(git rev-parse HEAD)); marca não gravada"
fi
