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
# PATH explícito: sob o systemd o PATH não inclui ~/.local/bin (onde está o gitleaks) e as travas falham fechadas.
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
# Operação sem supervisão: NUNCA roda hooks do repositório (ex.: reconstrução em segundo plano a cada troca de branch,
# husky). Vale para todos os `git` deste script e dos filhos.
_n="${GIT_CONFIG_COUNT:-0}"; export "GIT_CONFIG_KEY_$_n=core.hooksPath" "GIT_CONFIG_VALUE_$_n=/dev/null" GIT_CONFIG_COUNT=$((_n+1))   # acrescenta; não apaga a config do usuário via ambiente

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
    case "$wt" in */_arquivo/*) aviso "$branch" arquivado "$branch: está em worktree ARQUIVADO ($wt); não mexo em arquivo morto"; avisos=$((avisos+1)); continue ;; esac
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

# 3. computador_local acompanha a branch padrão ENQUANTO não tem commits próprios (o upstream dela é ela mesma, então o passo 2
#    nunca a avança e ela ficava para trás da main). Com commits próprios só avisa; com alterações locais não mexe.
CL=computador_local
if "${G[@]}" rev-parse -q --verify "refs/heads/$CL" >/dev/null 2>&1 && [ -n "${WT[$CL]:-}" ]; then
  wt="${WT[$CL]}"
  DEF="$("${G[@]}" symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  [ -n "$DEF" ] || for c in origin/main origin/master; do "${G[@]}" rev-parse -q --verify "$c" >/dev/null 2>&1 && { DEF="$c"; break; }; done
  case "$wt" in
    */_arquivo/*) ;;
    *)
      if [ -n "$DEF" ] && "${G[@]}" rev-parse -q --verify "$DEF" >/dev/null 2>&1; then
        hw="$(git -C "$wt" rev-parse HEAD 2>/dev/null)"; hd="$("${G[@]}" rev-parse "$DEF")"
        if [ "$hw" = "$hd" ]; then :
        elif git -C "$wt" merge-base --is-ancestor HEAD "$DEF" 2>/dev/null; then
          n="$("${G[@]}" rev-list --count "$hw..$hd")"
          if [ -n "$(git -C "$wt" status --porcelain --untracked-files=no 2>/dev/null)" ]; then
            say "PULEI $CL (${n} atrás de $DEF): há alterações locais não commitadas em $wt"; pulados=$((pulados+1))
          elif [ "$DRY" -eq 1 ]; then say "[dry-run] avançaria $CL ${n} commit(s) até $DEF em $wt"
          elif git -C "$wt" merge --ff-only --quiet "$DEF" 2>/dev/null; then say "ATUALIZADO $CL (+${n} commit(s) de $DEF) em $wt"; atualizados=$((atualizados+1))
          else say "PULEI $CL: fast-forward para $DEF recusado pelo git (arquivo não rastreado no caminho?)"; pulados=$((pulados+1)); fi
        else
          own="$("${G[@]}" rev-list --count "$DEF..$hw")"; beh="$("${G[@]}" rev-list --count "$hw..$hd")"
          aviso "$CL" proprios "$CL tem $own commit(s) próprio(s) fora de $DEF e está $beh atrás dela: integre (PR/rebase) quando quiser; não mexo"; avisos=$((avisos+1))
        fi
      fi ;;
  esac
fi

say "fim: $atualizados atualizado(s), $pulados pulado(s), $avisos aviso(s)"
exit 0
