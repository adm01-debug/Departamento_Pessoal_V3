#!/usr/bin/env bash
# Mantém o repositório local atualizado com o GitHub, com segurança.
#
#   sync-github.sh [--repo <caminho>] [--dry-run] [--quiet]
#
# O que faz (a cada execução):
#   1. git fetch --all --prune           (traz tudo do remoto; não altera nenhum branch local)
#   2. para cada branch local que está APENAS ATRÁS do upstream, avança por fast-forward:
#        - branch sem checkout em nenhum worktree  -> atualiza a referência (fast-forward)
#        - branch com checkout e árvore LIMPA      -> git merge --ff-only
#        - branch com checkout e alterações locais -> PULA (nunca mexe no seu trabalho)
#        - branch com checkout num worktree ARQUIVADO (caminho com /_arquivo/) -> PULA (não mexo em arquivo morto)
#   3. branch adiantado, divergente ou com upstream apagado -> só avisa.
#
# Nunca faz: reset, rebase, merge com commit, checkout, stash, force, delete de branch, push.
# Uma execução por vez (flock); falha de rede não é erro (tenta de novo na próxima hora).
set -uo pipefail

REPO=""
DRY=0
QUIET=0
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; exit 2 ;;
  esac
done

REPO="${REPO:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
[ -n "$REPO" ] && [ -d "$REPO/.git" -o -f "$REPO/.git" ] || { echo "informe --repo <caminho de um repositório git>" >&2; exit 2; }
REPO="$(cd "$REPO" && pwd -P)"

STATE="${XDG_CACHE_HOME:-$HOME/.cache}/dp-sync"
mkdir -p "$STATE" && chmod 700 "$STATE"
KEY="$(printf '%s' "$REPO" | sha1sum | cut -c1-10)"
LOG="$STATE/sync.log"
G=(git -C "$REPO")
[ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt 1048576 ] && mv -f "$LOG" "$LOG.1"

say() { # grava no log e (se não --quiet) na tela
  local line; line="$(date '+%F %T') [$(basename "$REPO")] $*"
  printf '%s\n' "$line" >> "$LOG"
  [ "$QUIET" -eq 1 ] || printf '%s\n' "$line"
}

# Avisos repetidos (branch divergente, upstream apagado) entram no log uma vez só, enquanto nada mudar.
VISTOS="$STATE/$KEY.avisos"
touch "$VISTOS"
aviso() { # aviso <branch> <tipo> <mensagem>
  local sig; sig="$1|$2|$("${G[@]}" rev-parse --short "$1" 2>/dev/null)"
  grep -qxF "$sig" "$VISTOS" 2>/dev/null && return 0
  printf '%s\n' "$sig" >> "$VISTOS"
  say "AVISO $3"
}

exec 9>"$STATE/$KEY.lock"
flock -n 9 || { say "outra sincronização em andamento; pulando"; exit 0; }

export GIT_TERMINAL_PROMPT=0   # nunca ficar esperando senha

# 1. fetch
if ! timeout 180 "${G[@]}" fetch --all --prune --quiet 2>"$STATE/$KEY.err"; then
  say "fetch falhou (rede/credencial?): $(head -c 200 "$STATE/$KEY.err" | tr '\n' ' ') — tentarei na próxima execução"
  exit 0
fi

# mapa branch -> worktree (caminho) para quem está com checkout
declare -A WT=()
cur_path=""
while IFS= read -r l; do
  case "$l" in
    "worktree "*) cur_path="${l#worktree }" ;;
    "branch refs/heads/"*) WT["${l#branch refs/heads/}"]="$cur_path" ;;
  esac
done < <("${G[@]}" worktree list --porcelain)

atualizados=0; pulados=0; avisos=0

while IFS='|' read -r branch upstream track; do
  [ -n "$upstream" ] || continue
  case "$track" in
    "") continue ;;                                   # já em dia
    *"gone"*) aviso "$branch" gone "$branch: o upstream $upstream não existe mais (branch apagado no GitHub); nada feito"; avisos=$((avisos+1)); continue ;;
    *"ahead"*"behind"*|*"behind"*"ahead"*) aviso "$branch" diverg "$branch: divergente de $upstream ($track); resolva manualmente"; avisos=$((avisos+1)); continue ;;
    *"ahead"*) continue ;;                            # só adiantado: nada a trazer
    *"behind"*) ;;
    *) continue ;;
  esac

  if [ -n "${WT[$branch]:-}" ]; then
    wt="${WT[$branch]}"
    case "$wt" in */_arquivo/*) aviso "$branch" arquivado "$branch: está em worktree ARQUIVADO ($wt); não mexo em arquivo morto"; continue ;; esac
    if [ -n "$(git -C "$wt" status --porcelain --untracked-files=no 2>/dev/null)" ]; then
      say "PULEI $branch ($track): há alterações locais não commitadas em $wt"; pulados=$((pulados+1)); continue
    fi
    if [ "$DRY" -eq 1 ]; then say "[dry-run] avançaria $branch ($track) por fast-forward em $wt"; continue; fi
    if git -C "$wt" merge --ff-only --quiet "$upstream" 2>/dev/null; then say "ATUALIZADO $branch ($track) em $wt"; atualizados=$((atualizados+1)); else say "PULEI $branch: fast-forward recusado pelo git"; pulados=$((pulados+1)); fi
  else
    if [ "$DRY" -eq 1 ]; then say "[dry-run] avançaria $branch ($track) por fast-forward"; continue; fi
    # `fetch . origem:destino` só aceita fast-forward; recusa qualquer outra coisa
    if "${G[@]}" fetch --quiet . "refs/remotes/$upstream:refs/heads/$branch" 2>/dev/null; then say "ATUALIZADO $branch ($track)"; atualizados=$((atualizados+1)); else say "PULEI $branch: fast-forward recusado pelo git"; pulados=$((pulados+1)); fi
  fi
done < <("${G[@]}" for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads)

say "fim: $atualizados atualizado(s), $pulados pulado(s), $avisos aviso(s)"
exit 0
