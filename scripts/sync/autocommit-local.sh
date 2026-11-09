#!/usr/bin/env bash
# Commit automático do trabalho local numa branch dedicada e envio ao GitHub, sem intervenção humana.
#
#   autocommit-local.sh --worktree <pasta> [--branch computador_local] [--remote origin]
#                       [--quiet-min 2] [--max-mb 5] [--dry-run] [--quiet]
#
# Para cada execução: se o worktree está na branch <branch> e há alterações, faz UM commit com tudo (exceto o que as
# travas abaixo barram) e dá push em <branch>. Se não há alterações, só envia commits ainda não enviados.
#
# ATENÇÃO — o repositório é PÚBLICO: tudo que for enviado é legível por qualquer pessoa. Travas (falham fechadas):
#   - gitleaks no que será commitado: se achar segredo, NADA é commitado nesta rodada;
#   - dados pessoais/dados em massa: arquivos NOVOS .csv .xlsx .xls .xlsm .ods .dump .bak .sqlite .db .zip .tar .gz .7z .pdf,
#     qualquer arquivo > --max-mb MB e qualquer arquivo com CPF formatado (000.000.000-00) nas linhas adicionadas
#     são EXCLUÍDOS do commit (ficam só no disco/autosave) e registrados no log;
#   - .env*, *.pem, *.key, *.p12, id_rsa* nunca entram, mesmo que não estejam no .gitignore.
# Outras proteções: nunca troca de branch, nunca usa --force (push rejeitado = só avisa), não age com rebase/merge/
# cherry-pick/bisect em andamento nem com index.lock presente, adia se algo foi editado há menos de --quiet-min min.
# Commits usam --no-verify (os hooks de pre-commit reformatariam o seu trabalho). Não dispara CI (o CI só roda em
# push na main e em PR para a main).
set -uo pipefail

WT=""; BRANCH="computador_local"; REMOTE="origin"; QUIET_MIN=2; MAX_MB=5; DRY=0; QUIET=0
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) WT="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --quiet-min) QUIET_MIN="${2:-}"; shift 2 ;;
    --max-mb) MAX_MB="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; exit 2 ;;
  esac
done
[ -n "$WT" ] && { [ -d "$WT/.git" ] || [ -f "$WT/.git" ]; } || { echo "informe --worktree <pasta de um worktree git>" >&2; exit 2; }
WT="$(cd "$WT" && pwd -P)"

STATE="${XDG_CACHE_HOME:-$HOME/.cache}/dp-sync"; mkdir -p "$STATE" && chmod 700 "$STATE"
KEY="$(printf '%s' "$WT" | sha1sum | cut -c1-10)"; LOG="$STATE/sync.log"; G=(git -C "$WT")
say() { local line; line="$(date '+%F %T') [$(basename "$WT")] autocommit: $*"; printf '%s\n' "$line" >> "$LOG"; [ "$QUIET" -eq 1 ] || printf '%s\n' "$line"; }

exec 9>"$STATE/ac-$KEY.lock"; flock -n 9 || { say "outra execução em andamento; pulando"; exit 0; }
export GIT_TERMINAL_PROMPT=0

# 0. pré-condições
CUR="$("${G[@]}" rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$CUR" = "$BRANCH" ] || { say "PULEI: o worktree está em '$CUR', não em '$BRANCH' (nunca troco de branch)"; exit 0; }
GD="$("${G[@]}" rev-parse --absolute-git-dir)"
for f in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG index.lock; do
  [ -e "$GD/$f" ] && { say "PULEI: operação git em andamento ($f)"; exit 0; }
done

push_pendente() {
  local ahead; ahead="$("${G[@]}" rev-list --count "$REMOTE/$BRANCH..HEAD" 2>/dev/null || echo novo)"
  [ "$ahead" = "0" ] && return 0
  if [ "$DRY" -eq 1 ]; then say "[dry-run] enviaria $BRANCH ao GitHub ($ahead commit(s) à frente)"; return 0; fi
  if timeout 300 "${G[@]}" push -q --no-verify -u "$REMOTE" "$BRANCH" 2>"$STATE/ac-$KEY.err"; then
    say "ENVIADO $BRANCH ao GitHub ($([ "$ahead" = novo ] && echo "branch nova" || echo "$ahead commit(s)")) @ $("${G[@]}" rev-parse --short HEAD)"
  else
    say "AVISO: push de $BRANCH recusado/falhou — NÃO forço; o commit segue seguro localmente: $(head -c 220 "$STATE/ac-$KEY.err" | tr '\n' ' ')"
  fi
}

timeout 120 "${G[@]}" fetch -q "$REMOTE" "$BRANCH" 2>/dev/null || true   # só para calcular "à frente"; falha de rede não impede o commit

# 1. há o que commitar?
if [ -z "$("${G[@]}" status --porcelain 2>/dev/null)" ]; then push_pendente; say "ok: nada novo para commitar"; exit 0; fi

# 2. editando agora? adia
if [ "$QUIET_MIN" -gt 0 ]; then
  while IFS= read -r -d '' f; do
    [ -e "$WT/$f" ] && [ -n "$(find "$WT/$f" -type f -mmin "-$QUIET_MIN" -print -quit 2>/dev/null)" ] && { say "ADIEI: '$f' foi alterado há menos de $QUIET_MIN min; próxima execução"; exit 0; }
  done < <("${G[@]}" ls-files -z -m -o --exclude-standard)
fi

# 3. trava de dados: monta a lista de exclusões ANTES de stagear
EXCL=(); declare -A MOTIVO=()
excluir() { EXCL+=(":(exclude,literal)$1"); MOTIVO["$1"]="$2"; }
max_bytes=$((MAX_MB * 1024 * 1024))
while IFS= read -r -d '' f; do   # arquivos novos (não rastreados)
  case "${f,,}" in
    *.csv|*.xlsx|*.xls|*.xlsm|*.ods|*.dump|*.bak|*.sqlite|*.sqlite3|*.db|*.zip|*.tar|*.gz|*.tgz|*.7z|*.pdf) excluir "$f" "arquivo de dados/binário novo" ;;
  esac
done < <("${G[@]}" ls-files -z -o --exclude-standard)
while IFS= read -r -d '' f; do    # qualquer arquivo grande (novo ou alterado)
  [ -f "$WT/$f" ] && [ "$(stat -c %s "$WT/$f")" -gt "$max_bytes" ] && excluir "$f" "maior que ${MAX_MB} MB"
done < <("${G[@]}" ls-files -z -m -o --exclude-standard)
SEGREDOS=(':(exclude,glob)**/.env' ':(exclude,glob)**/.env.*' ':(exclude,glob)**/*.pem' ':(exclude,glob)**/*.key' ':(exclude,glob)**/*.p12' ':(exclude,glob)**/id_rsa*')

if [ "$DRY" -eq 1 ]; then
  say "[dry-run] commitaria $("${G[@]}" status --porcelain | grep -c .) item(ns) em $BRANCH (excluindo ${#EXCL[@]} por trava de dados)"; push_pendente; exit 0
fi

# 4. stageia (respeita .gitignore; deleções incluídas)
if ! "${G[@]}" add -A -- . "${SEGREDOS[@]}" "${EXCL[@]}" 2>"$STATE/ac-$KEY.err"; then
  say "PULEI: não consegui stagear ($(head -c 160 "$STATE/ac-$KEY.err" | tr '\n' ' '))"; "${G[@]}" reset -q 2>/dev/null; exit 0
fi

# 5. CPF formatado nas linhas adicionadas => exclui o arquivo
CPF='[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}'
while IFS= read -r -d '' f; do
  if "${G[@]}" diff --cached -U0 -- "$f" | grep -E '^\+' | grep -vE '^\+\+\+' | grep -qE "$CPF"; then
    "${G[@]}" reset -q -- "$f"; MOTIVO["$f"]="CPF formatado nas linhas adicionadas"
  fi
done < <("${G[@]}" diff --cached --name-only -z)
for f in "${!MOTIVO[@]}"; do say "EXCLUÍDO do commit: $f (${MOTIVO[$f]}) — segue só no disco/autosave"; done

# 6. gitleaks no que sobrou (falha fechada: erro = não commita)
if [ -n "$("${G[@]}" diff --cached --name-only)" ]; then
  CFG="$HOME/.config/git-autosave/gitleaks.toml"; extra=(); [ -f "$CFG" ] && extra=(--config "$CFG")
  rep="$STATE/ac-gitleaks-$KEY.json"
  "${G[@]}" diff --cached -U0 | gitleaks stdin "${extra[@]}" --no-banner --redact --exit-code 9 --report-format json --report-path "$rep" >/dev/null 2>&1
  case $? in
    0) ;;
    9) "${G[@]}" reset -q; say "BLOQUEADO pelo gitleaks: segredo no que seria commitado — NADA foi commitado ($rep)"; exit 0 ;;
    *) "${G[@]}" reset -q; say "BLOQUEADO: o gitleaks falhou (falha fechada) — NADA foi commitado"; exit 0 ;;
  esac
fi

# 7. commit + push
if [ -z "$("${G[@]}" diff --cached --name-only)" ]; then
  say "nada a commitar depois das travas"; push_pendente; exit 0
fi
N="$("${G[@]}" diff --cached --name-only | grep -c .)"
if "${G[@]}" commit -q --no-verify -m "autosave($BRANCH): $(date '+%F %T') — $N arquivo(s)" 2>"$STATE/ac-$KEY.err"; then
  say "COMMIT $("${G[@]}" rev-parse --short HEAD) em $BRANCH ($N arquivo(s))"
else
  "${G[@]}" reset -q; say "ERRO no commit: $(head -c 200 "$STATE/ac-$KEY.err" | tr '\n' ' ')"; exit 0
fi
push_pendente
exit 0
