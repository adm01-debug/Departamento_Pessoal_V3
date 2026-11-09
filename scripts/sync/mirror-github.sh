#!/usr/bin/env bash
# Deixa o checkout local EXATAMENTE igual ao GitHub (espelho), sem intervenção humana.
#
#   mirror-github.sh [--repo <caminho>] [--branch main] [--quiet-min 10] [--keep-days 30] [--dry-run] [--quiet]
#
# Resultado de cada execução bem-sucedida: o checkout está na branch <branch> (padrão main), no mesmo commit de
# origin/<branch>, sem nenhuma alteração local (tracked ou untracked) — `git status` limpo e `git diff origin/<branch>` vazio.
#
# Segurança (nada se perde):
#   - ANTES de descartar, tudo que é só local é gravado em refs/mirror-backup/<data> (alterações, arquivos não
#     rastreados e o commit local de partida). Recuperar:  git checkout refs/mirror-backup/<data> -- .
#     Os backups ficam só nesta máquina e são apagados após --keep-days dias.
#   - Arquivos IGNORADOS pelo git (.env, node_modules, dist...) NUNCA são tocados.
#   - A branch local em que você estava (ex.: fix/x) continua existindo; só o checkout troca para <branch>.
#   - Se você mexeu em algum arquivo nos últimos --quiet-min minutos, adia para a próxima execução.
#   - Não age se houver rebase/merge/cherry-pick/bisect em andamento, se <branch> estiver em checkout em
#     outro worktree, ou se o fetch falhar (rede: tenta de novo na próxima hora).
# Nunca faz push. Uma execução por vez (flock, o mesmo trinco do sync-github.sh).
set -uo pipefail

REPO=""; BRANCH="main"; DRY=0; QUIET=0; QUIET_MIN=10; KEEP_DAYS=30
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --quiet-min) QUIET_MIN="${2:-}"; shift 2 ;;
    --keep-days) KEEP_DAYS="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; exit 2 ;;
  esac
done

REPO="${REPO:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
[ -n "$REPO" ] && { [ -d "$REPO/.git" ] || [ -f "$REPO/.git" ]; } || { echo "informe --repo <caminho de um repositório git>" >&2; exit 2; }
REPO="$(cd "$REPO" && pwd -P)"

STATE="${XDG_CACHE_HOME:-$HOME/.cache}/dp-sync"
mkdir -p "$STATE" && chmod 700 "$STATE"
KEY="$(printf '%s' "$REPO" | sha1sum | cut -c1-10)"
LOG="$STATE/sync.log"
G=(git -C "$REPO")

say() { local line; line="$(date '+%F %T') [$(basename "$REPO")] mirror: $*"; printf '%s\n' "$line" >> "$LOG"; [ "$QUIET" -eq 1 ] || printf '%s\n' "$line"; }

exec 9>"$STATE/$KEY.lock"
flock -n 9 || { say "outra sincronização em andamento; pulando"; exit 0; }
export GIT_TERMINAL_PROMPT=0

# 0. operação git em andamento? Não atropela.
GD="$("${G[@]}" rev-parse --absolute-git-dir)"
for f in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG; do
  [ -e "$GD/$f" ] && { say "PULEI: operação git em andamento ($f)"; exit 0; }
done

# 1. fetch e conferência de que origin/<branch> é mesmo o que está no GitHub agora
if ! timeout 180 "${G[@]}" fetch --prune --quiet origin 2>"$STATE/$KEY.err"; then
  say "fetch falhou (rede/credencial?): $(head -c 160 "$STATE/$KEY.err" | tr '\n' ' ') — tentarei na próxima"; exit 0
fi
REMOTE_SHA="$(timeout 60 "${G[@]}" ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | cut -f1)"
[ -n "$REMOTE_SHA" ] || { say "AVISO: o GitHub não tem a branch $BRANCH; nada feito"; exit 0; }
[ "$("${G[@]}" rev-parse "origin/$BRANCH" 2>/dev/null)" = "$REMOTE_SHA" ] || { say "AVISO: origin/$BRANCH não bate com o GitHub após o fetch; nada feito"; exit 0; }

CUR="$("${G[@]}" rev-parse --abbrev-ref HEAD)"
HEAD_SHA="$("${G[@]}" rev-parse HEAD)"
DIRTY="$("${G[@]}" status --porcelain 2>/dev/null)"

# 2. já espelhado?
if [ "$CUR" = "$BRANCH" ] && [ "$HEAD_SHA" = "$REMOTE_SHA" ] && [ -z "$DIRTY" ]; then
  say "ok: já idêntico ao GitHub (${REMOTE_SHA:0:9})"; exit 0
fi

# 3. $BRANCH em checkout em OUTRO worktree? Não dá para assumi-la aqui.
other="$("${G[@]}" worktree list --porcelain | awk -v b="refs/heads/$BRANCH" -v me="$REPO" '/^worktree /{p=substr($0,10)} $0=="branch " b && p!=me {print p}')"
[ -z "$other" ] || { say "PULEI: $BRANCH está em checkout em outro worktree ($other)"; exit 0; }

# 4. editando agora? Adia.
if [ -n "$DIRTY" ] && [ "$QUIET_MIN" -gt 0 ]; then
  recent=""
  while IFS= read -r -d '' f; do
    [ -e "$REPO/$f" ] && [ -n "$(find "$REPO/$f" -type f -mmin "-$QUIET_MIN" -print -quit 2>/dev/null)" ] && { recent="$f"; break; }
  done < <("${G[@]}" ls-files -z -m -o --exclude-standard)
  [ -z "$recent" ] || { say "ADIEI: '$recent' foi alterado há menos de $QUIET_MIN min (alguém está editando); próxima execução"; exit 0; }
fi

# 5. backup do que é só local (nada se perde)
BACKUP=""
perde_commits=0
if [ "$CUR" = "$BRANCH" ] || [ "$CUR" = "HEAD" ]; then
  "${G[@]}" merge-base --is-ancestor "$HEAD_SHA" "origin/$BRANCH" 2>/dev/null || perde_commits=1
fi
if [ -n "$DIRTY" ] || [ "$perde_commits" -eq 1 ]; then
  if [ "$DRY" -eq 1 ]; then
    say "[dry-run] faria backup (alterações: $(printf '%s\n' "$DIRTY" | grep -c .) item(ns)) em refs/mirror-backup/<data>"
  else
    TMPIDX="$(mktemp "$STATE/idx.XXXXXX")"; rm -f "$TMPIDX"
    export GIT_INDEX_FILE="$TMPIDX"
    "${G[@]}" read-tree HEAD && "${G[@]}" add -A >/dev/null 2>&1
    TREE="$("${G[@]}" write-tree)"
    unset GIT_INDEX_FILE; rm -f "$TMPIDX"
    COMMIT="$(printf 'mirror-backup: branch=%s head=%s\n' "$CUR" "$HEAD_SHA" | "${G[@]}" commit-tree "$TREE" -p "$HEAD_SHA")"
    base_ref="refs/mirror-backup/$(date +%Y%m%d-%H%M%S)"; BACKUP="$base_ref"; n=0
    while "${G[@]}" show-ref --verify --quiet "$BACKUP"; do n=$((n+1)); BACKUP="$base_ref-$n"; done   # nunca sobrescreve um backup existente
    "${G[@]}" update-ref "$BACKUP" "$COMMIT" || { say "ERRO: não consegui gravar o backup; nada foi descartado"; exit 0; }
    say "backup gravado em $BACKUP ($("${G[@]}" diff-tree --no-commit-id --name-only -r "$HEAD_SHA" "$COMMIT" | grep -c .) arquivo(s) diferentes do commit $CUR@${HEAD_SHA:0:9})"
  fi
fi

if [ "$DRY" -eq 1 ]; then say "[dry-run] espelharia: checkout $BRANCH @ ${REMOTE_SHA:0:9} (hoje: $CUR @ ${HEAD_SHA:0:9})"; exit 0; fi

# 6. espelha. `clean` ANTES do checkout (arquivo não rastreado no caminho de um rastreado); sem -x: ignorados ficam.
"${G[@]}" clean -fdq
if ! "${G[@]}" checkout -q -f -B "$BRANCH" "origin/$BRANCH" 2>"$STATE/$KEY.err"; then
  say "ERRO no checkout: $(head -c 200 "$STATE/$KEY.err" | tr '\n' ' ')${BACKUP:+ (backup preservado em $BACKUP)}"; exit 0
fi
"${G[@]}" clean -fdq

# 7. confere
if [ "$("${G[@]}" rev-parse HEAD)" = "$REMOTE_SHA" ] && [ -z "$("${G[@]}" status --porcelain)" ] && "${G[@]}" diff --quiet "origin/$BRANCH"; then
  say "ESPELHADO: $BRANCH @ ${REMOTE_SHA:0:9} (antes: $CUR @ ${HEAD_SHA:0:9})${BACKUP:+; backup: $BACKUP}"
else
  say "ERRO: após o espelhamento o checkout ainda difere do GitHub${BACKUP:+ (backup: $BACKUP)}"
fi

# 8. retenção dos backups
corte=$(( $(date +%s) - KEEP_DAYS * 86400 ))
while read -r ref ts; do
  [ -n "$ref" ] && [ "$ts" -lt "$corte" ] && "${G[@]}" update-ref -d "$ref"
done < <("${G[@]}" for-each-ref --format='%(refname) %(committerdate:unix)' refs/mirror-backup/)
exit 0
