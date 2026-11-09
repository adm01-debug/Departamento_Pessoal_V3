#!/usr/bin/env bash
# Deixa o checkout local EXATAMENTE igual ao GitHub (espelho), sem intervenção humana.
#
#   mirror-github.sh [--repo <caminho>] [--branch main] [--quiet-min 10] [--keep-days 30] [--dry-run] [--quiet]
#
# Resultado de cada execução bem-sucedida: o checkout está na branch <branch> (padrão main), no mesmo commit de
# origin/<branch>, sem nenhuma alteração local (tracked ou untracked) — `git status` limpo e `git diff origin/<branch>` vazio —
# e com os MESMOS BYTES do GitHub (fins de linha CRLF herdados do Windows são normalizados).
#
# Segurança (nada se perde):
#   - ANTES de descartar, tudo que é só local é gravado em refs/mirror-backup/<data> (alterações, arquivos não
#     rastreados e o commit local de partida). Recuperar:  git checkout refs/mirror-backup/<data> -- .
#     Commits locais de <branch> não enviados e a versão que estava em `git add` (se diferente do disco) entram como pais
#     extras do backup:  git log --graph refs/mirror-backup/<data>
#     Os backups ficam só nesta máquina e são apagados após --keep-days dias.
#   - Arquivos IGNORADOS pelo git (.env, node_modules, dist...) NUNCA são tocados. Única exceção: o ignorado que estiver no lugar de um caminho que o GitHub passou a rastrear (ou já no índice via `git add -f`) vai para o backup antes de ser substituído.
#   - A branch local em que você estava (ex.: fix/x) continua existindo; só o checkout troca para <branch>.
#   - Se você mexeu em algum arquivo nos últimos --quiet-min minutos, adia para a próxima execução.
#   - Não age se houver rebase/merge/cherry-pick/bisect em andamento, se <branch> estiver em checkout em
#     outro worktree, ou se o fetch falhar (rede: tenta de novo na próxima hora).
# Nunca faz push. Uma execução por vez (flock, o mesmo trinco do sync-github.sh).
set -uo pipefail
# PATH explícito: sob o systemd o PATH não inclui ~/.local/bin (onde está o gitleaks) e as travas falham fechadas.
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
# Operação sem supervisão: NUNCA roda hooks do repositório (ex.: reconstrução em segundo plano a cada troca de branch,
# husky). Vale para todos os `git` deste script e dos filhos.
_n="${GIT_CONFIG_COUNT:-0}"; export "GIT_CONFIG_KEY_$_n=core.hooksPath" "GIT_CONFIG_VALUE_$_n=/dev/null" GIT_CONFIG_COUNT=$((_n+1))   # acrescenta; não apaga a config do usuário via ambiente

REPO=""; BRANCH="main"; DRY=0; QUIET=0; QUIET_MIN=10; KEEP_DAYS=30
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --quiet-min) QUIET_MIN="${2:-}"; shift 2 ;;
    --keep-days) KEEP_DAYS="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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
for f in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG index.lock; do
  [ -e "$GD/$f" ] && { say "PULEI: operação git em andamento ($f)"; exit 0; }
done

# 1. fetch e conferência de que origin/<branch> é mesmo o que está no GitHub agora
if ! timeout 180 "${G[@]}" fetch --prune --quiet origin 2>"$STATE/$KEY.err"; then
  say "fetch falhou (rede/credencial?): $(head -c 160 "$STATE/$KEY.err" | tr '\n' ' ') — tentarei na próxima"; exit 75
fi
REMOTE_SHA="$(timeout 60 "${G[@]}" ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | cut -f1)"
[ -n "$REMOTE_SHA" ] || { say "AVISO: o GitHub não tem a branch $BRANCH (ou ls-remote falhou); nada feito"; exit 75; }
[ "$("${G[@]}" rev-parse "origin/$BRANCH" 2>/dev/null)" = "$REMOTE_SHA" ] || { say "AVISO: origin/$BRANCH não bate com o GitHub após o fetch; nada feito"; exit 75; }


# Arquivos rastreados cujos bytes reais no disco diferem do blob do índice SÓ no fim de linha (CRLF x LF). O `git status`
# não vê isso quando core.autocrlf=input normaliza CRLF->LF na comparação (cópia criada no Windows, por exemplo).
#   stdout (NUL): só deriva de fim de linha E sem edição recente -> pode ser reescrito sem perda
#   $1 (arquivo, NUL): arquivos cujo CONTEÚDO difere (assume-unchanged/skip-worktree escondem isso do `git status`) ou que
#       foram editados há pouco: NÃO se toca; só se avisa.
# Pula links simbólicos, submódulos e arquivos cuja conversão de checkout é DE PROPÓSITO diferente do blob (atributos
# eol/filter/ident/working-tree-encoding): esses continuam diferindo por regra do repositório.
byte_drift() {
  python3 -I - "$REPO" "${1:-/dev/null}" "$((QUIET_MIN * 60))" <<'PY'
import hashlib, os, subprocess, sys, time
repo, real_out, quiet = sys.argv[1], sys.argv[2], int(sys.argv[3])
G = ["git", "-C", repo, "-c", "core.autocrlf=false", "-c", "core.quotepath=false"]
out = subprocess.run(G + ["ls-files", "-s", "-z"], capture_output=True, check=True).stdout
ents = []
for rec in out.split(b"\0"):
    if not rec: continue
    meta, _, path = rec.partition(b"\t")
    mode, sha, stage = meta.split(b" ")
    if mode in (b"120000", b"160000") or stage != b"0": continue
    ents.append((sha.decode(), path))
special = set()
if ents:
    r = subprocess.run(G + ["check-attr", "-z", "--stdin", "eol", "filter", "ident", "working-tree-encoding"],
                       input=b"\0".join(p for _, p in ents) + b"\0", capture_output=True, check=True).stdout.split(b"\0")
    for i in range(0, len(r) - 2, 3):
        if r[i + 2] not in (b"unspecified", b"unset", b""): special.add(r[i])
real = []
now = time.time()
cat = subprocess.Popen(G + ["cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
def blob_of(sha):   # um único processo cat-file para todos os arquivos divergentes
    cat.stdin.write(sha.encode() + b"\n"); cat.stdin.flush()
    hdr = cat.stdout.readline().split()
    if len(hdr) != 3 or hdr[1] != b"blob": raise OSError("blob ausente")
    data = cat.stdout.read(int(hdr[2])); cat.stdout.read(1)
    return data
for sha, path in ents:
    if path in special: continue
    full = os.path.join(repo.encode(), path)
    if not os.path.isfile(full) or os.path.islink(full): continue
    try:
        n = os.path.getsize(full); h = hashlib.sha1(b"blob %d\0" % n)
        with open(full, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
        if h.hexdigest() == sha: continue
        recente = quiet > 0 and now - os.stat(full).st_mtime < quiet
        eol = False
        if not recente:
            blob = blob_of(sha)
            with open(full, "rb") as f: disk = f.read()
            eol = disk.replace(b"\r\n", b"\n") == blob.replace(b"\r\n", b"\n")
    except OSError:
        continue
    if eol: sys.stdout.buffer.write(path + b"\0")
    else: real.append(path)
cat.stdin.close(); cat.wait()
if real and real_out != "/dev/null":
    with open(real_out, "wb") as f: f.write(b"\0".join(real) + b"\0")
PY
}
# Reescreve esses arquivos com os bytes do blob (autocrlf desligado).
normaliza_bytes() {
  local lista real; lista="$(mktemp "$STATE/drift.XXXXXX")"; real="$(mktemp "$STATE/real.XXXXXX")"
  byte_drift "$real" > "$lista" 2>/dev/null || { say "AVISO: não consegui conferir os bytes dos arquivos (python3/git falhou); nada normalizado"; rm -f "$lista" "$real"; return 0; }
  if [ -s "$real" ]; then   # conteúdo diferente do GitHub que o git status não mostra: trabalho do usuário -> não toco
    local nr; nr="$(tr -cd '\0' < "$real" | wc -c)"
    local sig; sig="$(tr '\0' '\n' < "$real" | sha1sum | cut -c1-12)"
    if [ "$(cat "$STATE/$KEY.realwarn" 2>/dev/null)" != "$sig" ]; then
      printf '%s' "$sig" > "$STATE/$KEY.realwarn"
      say "AVISO: $nr arquivo(s) com CONTEÚDO diferente do GitHub escondido do git status (assume-unchanged/skip-worktree?) ou editado(s) há pouco — NÃO toquei: $(tr '\0' ' ' < "$real" | head -c 160)"
    fi
  fi
  rm -f "$real"
  [ -s "$lista" ] || { rm -f "$lista"; return 0; }
  local n; n="$(tr -cd '\0' < "$lista" | wc -c)"
  # `checkout-index -f` PULA arquivos que o cache de stat do índice dá como em dia (mesmo com -f). Mudar o mtime antes
  # invalida o cache e força a reescrita. Só chega aqui o que difere apenas no fim de linha (nada de conteúdo se perde).
  (cd "$REPO" && xargs -0 -a "$lista" touch -d '1970-01-02' --) 2>/dev/null
  "${G[@]}" -c core.autocrlf=false -c core.eol=lf checkout-index -u -f -z --stdin < "$lista" 2>/dev/null
  rm -f "$lista"
  local resto; resto="$(byte_drift 2>/dev/null | tr -cd '\0' | wc -c)"
  if [ "$resto" -gt 0 ]; then say "AVISO: NORMALIZADOS $n arquivo(s), mas $resto ainda diferem do GitHub nos bytes"
  else say "NORMALIZADOS $n arquivo(s): bytes do disco (fim de linha) diferiam do GitHub"; fi
}

CUR="$("${G[@]}" rev-parse --abbrev-ref HEAD)"
HEAD_SHA="$("${G[@]}" rev-parse HEAD)"
# Falha fechada: se o `git status` falhar (disco cheio, índice corrompido), DIRTY viria vazio e a árvore suja seria tratada como
# limpa — sem backup antes do descarte.
DIRTY="$("${G[@]}" status --porcelain --ignore-submodules=all 2>"$STATE/$KEY.err")" || { say "ERRO: git status falhou; NADA foi descartado: $(head -c 200 "$STATE/$KEY.err" | tr '\n' ' ')"; exit 1; }

# 2. já espelhado?
if [ "$CUR" = "$BRANCH" ] && [ "$HEAD_SHA" = "$REMOTE_SHA" ] && [ -z "$DIRTY" ]; then
  if [ "$DRY" -eq 1 ]; then say "ok (dry-run): commit idêntico; bytes não verificados no dry-run"; exit 0; fi
  normaliza_bytes
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
  done < <("${G[@]}" ls-files -z -m -o --exclude-standard; "${G[@]}" diff --cached --name-only -z --no-renames --diff-filter=AM)   # + o que está em `git add` (arquivo novo staged não aparece em -m/-o)
  [ -z "$recent" ] || { say "ADIEI: '$recent' foi alterado há menos de $QUIET_MIN min (alguém está editando); próxima execução"; exit 0; }
fi

# 5. backup do que é só local (nada se perde)
BACKUP=""
perde_commits=0
if [ "$CUR" = "$BRANCH" ] || [ "$CUR" = "HEAD" ]; then
  "${G[@]}" merge-base --is-ancestor "$HEAD_SHA" "origin/$BRANCH" 2>/dev/null || perde_commits=1
fi
# A branch local <branch> também é reposicionada (checkout -B) quando o checkout está em OUTRA branch: se ela tem commits que
# não estão em origin/<branch>, o backup os segura como pai extra (senão só restariam no reflog).
PAIS="$HEAD_SHA"; P2=(); EXTRA=""
LOCAL_SHA="$("${G[@]}" rev-parse -q --verify "refs/heads/$BRANCH" 2>/dev/null || true)"
if [ -n "$LOCAL_SHA" ] && [ "$LOCAL_SHA" != "$HEAD_SHA" ] && ! "${G[@]}" merge-base --is-ancestor "$LOCAL_SHA" "origin/$BRANCH" 2>/dev/null; then
  perde_commits=1; PAIS="$HEAD_SHA $LOCAL_SHA"; P2=(-p "$LOCAL_SHA"); EXTRA="; inclui os commits locais de $BRANCH não enviados (${LOCAL_SHA:0:9})"
fi
# Arquivos IGNORADOS que o espelhamento destruiria mesmo assim (o `add -A` do backup não os vê): o que estiver no lugar de um
# caminho que origin/<branch> rastreia e o índice local não — o próprio arquivo, um diretório no lugar dele ou um arquivo no
# lugar de um diretório pai (o `checkout -f` os sobrescreve/apaga). Lista (NUL) em $NOCAMINHO; entram no backup. Falha fechada.
NOCAMINHO="$STATE/$KEY.ign"
"${G[@]}" diff-index --cached --name-only -z --diff-filter=D "origin/$BRANCH" 2>"$STATE/$KEY.err" | while IFS= read -r -d '' p; do
  printf '%s\0' "$p"
  while [[ "$p" == */* ]]; do p="${p%/*}"; { [ -d "$REPO/$p" ] && [ ! -L "$REPO/$p" ]; } || printf '%s\0' "$p"; done
done | GIT_LITERAL_PATHSPECS=1 xargs -0 -r "${G[@]}" ls-files -z -o -i --exclude-standard -- > "$NOCAMINHO" 2>>"$STATE/$KEY.err" \
  || { say "ERRO: não consegui listar os arquivos ignorados no caminho do espelhamento; NADA foi descartado: $(head -c 200 "$STATE/$KEY.err" | tr '\n' ' ')"; exit 1; }
[ -s "$NOCAMINHO" ] && EXTRA="$EXTRA; inclui $(tr -cd '\0' < "$NOCAMINHO" | wc -c) arquivo(s) IGNORADO(S) que estavam no lugar de caminhos que o GitHub rastreia"
if [ -n "$DIRTY" ] || [ "$perde_commits" -eq 1 ] || [ -s "$NOCAMINHO" ]; then
  if [ "$DRY" -eq 1 ]; then
    say "[dry-run] faria backup (alterações: $(printf '%s\n' "$DIRTY" | grep -c .) item(ns)) em refs/mirror-backup/<data>"
  else
    # árvore de TUDO que está no disco (rastreados + não rastreados, sem ignorados), com os bytes exatos; vazio = falhou.
    # Dos ignorados entram só os que seriam destruídos: os de $NOCAMINHO e os que já estavam no índice via `git add -f`
    # (o checkout -f apaga do disco o que está no índice e não está em origin/<branch>).
    snap_tree() {
      local ix t=""; ix="$(mktemp "$STATE/idx.XXXXXX")"; rm -f "$ix"
      if GIT_INDEX_FILE="$ix" "${G[@]}" read-tree HEAD 2>/dev/null \
         && GIT_INDEX_FILE="$ix" "${G[@]}" -c core.autocrlf=false -c core.safecrlf=false add -A 2>"$STATE/$KEY.err" \
         && { "${G[@]}" diff --cached --name-only -z --no-renames --diff-filter=A HEAD; cat "$NOCAMINHO"; } \
            | GIT_INDEX_FILE="$ix" "${G[@]}" -c core.autocrlf=false -c core.safecrlf=false update-index --add --remove -z --stdin 2>"$STATE/$KEY.err"; then
        t="$(GIT_INDEX_FILE="$ix" "${G[@]}" write-tree 2>/dev/null)"
      fi
      rm -f "$ix"; printf '%s' "$t"
    }
    estavel=0
    for tentativa in 1 2 3; do
      TREE="$(snap_tree)"
      [ -n "$TREE" ] || { say "ERRO: não consegui ler tudo para o backup (arquivo ilegível?); NADA foi descartado: $(head -c 200 "$STATE/$KEY.err" | tr '\n' ' ')"; exit 1; }
      # A árvore acima é a do DISCO. O que estava em `git add` com conteúdo diferente (versão intermediária) sumiria no reset do
      # índice: entra como pai extra, como no stash (data fixa => mesmo estado gera o mesmo commit e o backup é reaproveitado).
      PAIS_T="$PAIS"; PIDX=(); EXTRA_T="$EXTRA"
      IDX="$("${G[@]}" write-tree 2>/dev/null || true)"
      if [ -n "$IDX" ] && [ "$IDX" != "$TREE" ] && [ "$IDX" != "$("${G[@]}" rev-parse "$HEAD_SHA^{tree}")" ]; then
        ICOMMIT="$(printf 'mirror-backup: o que estava no índice (git add) em %s\n' "$HEAD_SHA" | GIT_AUTHOR_DATE='@1 +0000' GIT_COMMITTER_DATE='@1 +0000' "${G[@]}" commit-tree "$IDX" -p "$HEAD_SHA")"
        [ -n "$ICOMMIT" ] || { say "ERRO: não consegui guardar o índice (git add) no backup; nada foi descartado"; exit 1; }
        PAIS_T="$PAIS $ICOMMIT"; PIDX=(-p "$ICOMMIT"); EXTRA_T="$EXTRA; a versão que estava em 'git add' ficou em ${ICOMMIT:0:9}"
      fi
      ultimo="$("${G[@]}" for-each-ref --sort=-committerdate --count=1 --format='%(refname)' refs/mirror-backup/)"
      if [ -n "$ultimo" ] && [ "$("${G[@]}" rev-parse "$ultimo^{tree}" 2>/dev/null)" = "$TREE" ] && [ "$("${G[@]}" log -1 --format=%P "$ultimo" 2>/dev/null)" = "$PAIS_T" ]; then
        velho="$ultimo"   # mesmo estado do último backup: o novo o SUBSTITUI (não acumula uma ref por hora) e a retenção passa a
      else velho=""; fi   # contar DESTE descarte (reaproveitar o antigo com mais de --keep-days o apagava na mesma execução)
      COMMIT="$(printf 'mirror-backup: branch=%s head=%s\n' "$CUR" "$HEAD_SHA" | "${G[@]}" commit-tree "$TREE" -p "$HEAD_SHA" "${P2[@]}" "${PIDX[@]}")"
      base_ref="refs/mirror-backup/$(date +%Y%m%d-%H%M%S)"; BACKUP="$base_ref"; n=0
      while "${G[@]}" show-ref --verify --quiet "$BACKUP"; do n=$((n+1)); BACKUP="$base_ref-$n"; done   # nunca sobrescreve um backup existente
      "${G[@]}" update-ref "$BACKUP" "$COMMIT" || { say "ERRO: não consegui gravar o backup; nada foi descartado"; exit 1; }
      [ -z "$velho" ] || "${G[@]}" update-ref -d "$velho"
      # confere de novo: se algo mudou no disco durante o backup (usuário salvando), refaz
      if [ "$(snap_tree)" = "$TREE" ]; then estavel=1; break; fi
    done
    [ "$estavel" -eq 1 ] || { say "ADIEI: os arquivos continuam mudando durante o backup; NADA foi descartado; próxima execução"; exit 0; }
    COMMIT="$("${G[@]}" rev-parse "$BACKUP")"
    say "backup gravado em $BACKUP ($("${G[@]}" diff-tree --no-commit-id --name-only -r "$HEAD_SHA" "$COMMIT" | grep -c .) arquivo(s) diferentes do commit $CUR@${HEAD_SHA:0:9})$EXTRA_T"
  fi
fi

if [ "$DRY" -eq 1 ]; then say "[dry-run] espelharia: checkout $BRANCH @ ${REMOTE_SHA:0:9} (hoje: $CUR @ ${HEAD_SHA:0:9})"; exit 0; fi

# 6. espelha. `clean` ANTES do checkout (arquivo não rastreado no caminho de um rastreado); sem -x: ignorados ficam.
"${G[@]}" clean -fdq
if ! "${G[@]}" checkout -q -f -B "$BRANCH" "origin/$BRANCH" 2>"$STATE/$KEY.err"; then
  say "ERRO no checkout: $(head -c 200 "$STATE/$KEY.err" | tr '\n' ' ')${BACKUP:+ (backup preservado em $BACKUP)}"; exit 1
fi
"${G[@]}" clean -fdq

# 7. confere (bytes inclusive)
normaliza_bytes
if [ "$("${G[@]}" rev-parse HEAD)" = "$REMOTE_SHA" ] && [ -z "$("${G[@]}" status --porcelain --ignore-submodules=all)" ] && "${G[@]}" diff --quiet "origin/$BRANCH"; then
  say "ESPELHADO: $BRANCH @ ${REMOTE_SHA:0:9} (antes: $CUR @ ${HEAD_SHA:0:9})${BACKUP:+; backup: $BACKUP}"
else
  say "ERRO: após o espelhamento o checkout ainda difere do GitHub${BACKUP:+ (backup: $BACKUP)}"; RC=1
fi

# 8. retenção dos backups
corte=$(( $(date +%s) - KEEP_DAYS * 86400 ))
while read -r ref ts; do
  [ -n "$ref" ] && [ "$ts" -lt "$corte" ] && "${G[@]}" update-ref -d "$ref"
done < <("${G[@]}" for-each-ref --format='%(refname) %(committerdate:unix)' refs/mirror-backup/)
exit "${RC:-0}"
