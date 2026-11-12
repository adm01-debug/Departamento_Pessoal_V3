#!/usr/bin/env bash
# Commit automático do trabalho local numa branch dedicada e envio ao GitHub, sem intervenção humana.
#
#   autocommit-local.sh --worktree <pasta> [--branch computador_local] [--remote origin]
#                       [--quiet-min 2] [--max-mb 5] [--pii cpf,cnpj] [--no-push] [--dry-run] [--quiet]
#
# Para cada execução: se o worktree está na branch <branch> e há alterações, faz UM commit com tudo (exceto o que as
# travas abaixo barram) e dá push em <branch>. Se não há alterações, só envia commits ainda não enviados.
# Com --no-push o commit fica só LOCAL: nada é enviado (as travas continuam valendo para o commit).
#
# ATENÇÃO — o repositório é PÚBLICO: tudo que for enviado é legível por qualquer pessoa. Travas (falham fechadas):
#   - gitleaks no que será commitado: se achar segredo, NADA é commitado nesta rodada;
#   - dados pessoais/dados em massa: arquivos NOVOS .csv .xlsx .xls .xlsm .ods .dump .bak .sqlite .db .zip .tar .gz .7z .pdf,
#     qualquer arquivo > --max-mb MB e qualquer arquivo com dado pessoal formatado nas linhas adicionadas (--pii: cpf =
#     000.000.000-00, cnpj = 00.000.000/0000-00; padrão cpf)
#     são EXCLUÍDOS do commit (ficam só no disco/autosave) e registrados no log;
#   - .env*, *.pem, *.key, *.p12, id_rsa* nunca entram, mesmo que não estejam no .gitignore.
# Outras proteções: nunca troca de branch, nunca usa --force (push rejeitado = só avisa), não age com rebase/merge/
# cherry-pick/bisect em andamento nem com index.lock presente, adia se algo foi editado há menos de --quiet-min min.
# Commits usam --no-verify (os hooks de pre-commit reformatariam o seu trabalho). Não dispara CI (o CI só roda em
# push na main e em PR para a main).
set -uo pipefail
# PATH explícito: sob o systemd o PATH não inclui ~/.local/bin (onde está o gitleaks) e as travas falham fechadas.
export PATH="$HOME/.local/bin:$HOME/.local/opt/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
# Operação sem supervisão: NUNCA roda hooks do repositório (ex.: reconstrução em segundo plano a cada troca de branch,
# husky). Vale para todos os `git` deste script e dos filhos.
_n="${GIT_CONFIG_COUNT:-0}"; export "GIT_CONFIG_KEY_$_n=core.hooksPath" "GIT_CONFIG_VALUE_$_n=/dev/null" GIT_CONFIG_COUNT=$((_n+1))   # acrescenta; não apaga a config do usuário via ambiente

WT=""; BRANCH="computador_local"; REMOTE="origin"; QUIET_MIN=2; MAX_MB=5; PII="cpf"; DRY=0; QUIET=0; NOPUSH=0
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) WT="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --remote) REMOTE="${2:-}"; shift 2 ;;
    --quiet-min) QUIET_MIN="${2:-}"; shift 2 ;;
    --max-mb) MAX_MB="${2:-}"; shift 2 ;;
    --pii) PII="${2:-}"; shift 2 ;;
    --no-push) NOPUSH=1; shift ;;   # só commit LOCAL (repos em que cada branch enviada dispara preview/CI; o git-autosave já copia para refs/autosave)
    --dry-run) DRY=1; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "opção desconhecida: $1" >&2; exit 2 ;;
  esac
done
[ -n "$WT" ] && { [ -d "$WT/.git" ] || [ -f "$WT/.git" ]; } || { echo "informe --worktree <pasta de um worktree git>" >&2; exit 2; }
WT="$(cd "$WT" && pwd -P)"

STATE="${XDG_CACHE_HOME:-$HOME/.cache}/dp-sync"; mkdir -p "$STATE" && chmod 700 "$STATE"
KEY="$(printf '%s' "$WT" | sha1sum | cut -c1-10)"; LOG="$STATE/sync.log"; G=(git -C "$WT")
# gitleaks: config própria = a do git-autosave (se existir) + regras extras (URL de banco com senha, token sbp_ do Supabase)
GLCFG="$STATE/gitleaks-dp-sync.toml"
cat > "$GLCFG" <<GLEOF
title = "dp-sync"
[extend]
$( [ -f "$HOME/.config/git-autosave/gitleaks.toml" ] && echo "path = \"$HOME/.config/git-autosave/gitleaks.toml\"" || echo "useDefault = true" )

[[rules]]
id = "dp-postgres-url-com-senha"
description = "URL de banco com usuário e senha"
regex = '''postgres(?:ql)?://[^:\s/@]+:[^@\s]{3,}@[^\s'"]+'''
keywords = ["postgres"]

[[rules]]
id = "dp-jwt-qualquer"
description = "Token no formato JWT (inclui service_role/anon do Supabase); sem filtro de entropia"
regex = '''\bey[A-Za-z0-9_-]{15,}\.ey[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}'''
keywords = ["ey"]

[[rules]]
id = "dp-supabase-pat"
description = "Supabase personal access token"
regex = '''sbp_[a-f0-9]{40}'''
keywords = ["sbp_"]
GLEOF

NAME="$(basename "$WT")"; [ "$NAME" = computador_local ] && NAME="$(basename "$(dirname "$WT")")/computador_local"
say() { local line; line="$(date '+%F %T') [$NAME] autocommit: $*"; printf '%s\n' "$line" >> "$LOG"; [ "$QUIET" -eq 1 ] || printf '%s\n' "$line"; }

exec 9>"$STATE/ac-$KEY.lock"; flock -n 9 || { say "outra execução em andamento; pulando"; exit 0; }
export GIT_TERMINAL_PROMPT=0

# 0. pré-condições
# --pii com valor desconhecido ("cfp", "cpf|cnpj") desligava a trava em silêncio e o CPF ia para o GitHub: falha fechada.
PII="${PII//[[:space:]]/}"; PII="${PII,,}"; IFS=, read -r -a _tipos <<< "$PII"
for _t in "${_tipos[@]}"; do
  case "$_t" in cpf|cnpj|'') ;; *) say "ERRO: --pii '$PII' inválido (use cpf, cnpj ou cpf,cnpj; vazio desliga) — NADA foi commitado"; echo "--pii inválido: $PII" >&2; exit 2 ;; esac
done
CUR="$("${G[@]}" rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$CUR" = "$BRANCH" ] || { say "PULEI: o worktree está em '$CUR', não em '$BRANCH' (nunca troco de branch)"; exit 0; }
GD="$("${G[@]}" rev-parse --absolute-git-dir)"
for f in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG index.lock; do
  [ -e "$GD/$f" ] && { say "PULEI: operação git em andamento ($f)"; exit 0; }
done

push_pendente() {
  [ "$NOPUSH" -eq 1 ] && return 0   # modo sem push: o commit fica local; nada é varrido nem enviado
  local ahead; ahead="$("${G[@]}" rev-list --count "$REMOTE/$BRANCH..HEAD" 2>/dev/null || echo novo)"
  [ "$ahead" = "0" ] && return 0
  if [ "$DRY" -eq 1 ]; then say "[dry-run] enviaria $BRANCH ao GitHub ($ahead commit(s) à frente)"; return 0; fi
  # varre TUDO que vai ser enviado (inclui commits manuais do usuário), como texto — falha fechada
  local base="$REMOTE/$BRANCH" largs=(log -p -U0 --text --format=)
  "${G[@]}" rev-parse -q --verify "$base" >/dev/null 2>&1 || base="$REMOTE/main"
  # commits que JÁ estão na branch padrão do GitHub são públicos e não são enviados "de novo": fora da varredura (senão uma
  # falsa detecção num commit antigo da main bloquearia o push da computador_local para sempre)
  local dref; dref="$("${G[@]}" symbolic-ref -q --short "refs/remotes/$REMOTE/HEAD" 2>/dev/null || true)"; [ -n "$dref" ] || dref="$REMOTE/main"
  if "${G[@]}" rev-parse -q --verify "$base" >/dev/null 2>&1; then
    largs+=("$base..HEAD"); "${G[@]}" rev-parse -q --verify "$dref" >/dev/null 2>&1 && largs+=("^$dref")
  else largs+=(-1); fi
  local ex=(); [ -f "$GLCFG" ] && ex=(--config "$GLCFG")
  "${G[@]}" "${largs[@]}" | gitleaks stdin "${ex[@]}" --no-banner --redact --exit-code 9 --report-format json --report-path "$STATE/ac-push-$KEY.json" >/dev/null 2>&1
  case $? in
    0) ;;
    9) say "BLOQUEADO: segredo em commit que seria ENVIADO — não enviei nada ($STATE/ac-push-$KEY.json); remova do histórico local"; RC=75; return 0 ;;
    *) say "BLOQUEADO: o gitleaks falhou ao varrer o que seria enviado (falha fechada) — não enviei nada"; RC=75; return 0 ;;
  esac
  if timeout 300 "${G[@]}" push -q --no-verify -u "$REMOTE" "$BRANCH" 2>"$STATE/ac-$KEY.err"; then
    say "ENVIADO $BRANCH ao GitHub ($([ "$ahead" = novo ] && echo "branch nova" || echo "$ahead commit(s)")) @ $("${G[@]}" rev-parse --short HEAD)"
  else
    RC=75   # push recusado/falhou: o timer precisa mostrar (run-all conta falhas consecutivas)
    local ws="$("${G[@]}" rev-parse HEAD)"   # avisa uma vez por commit (não enche o log a cada hora)
    if [ "$(cat "$STATE/ac-$KEY.pushwarn" 2>/dev/null)" != "$ws" ]; then
      printf '%s' "$ws" > "$STATE/ac-$KEY.pushwarn"
      say "AVISO: push de $BRANCH recusado/falhou — NÃO forço; o commit segue seguro localmente: $(head -c 220 "$STATE/ac-$KEY.err" | tr '\n' ' ')"
    fi
  fi
}

# Tira do índice UM arquivo, em modo LITERAL (nome com ':' no começo, '[', '*', '\\' ou '-' é pathspec/magia para o git: o
# `reset -- nome` falhava e o arquivo ficava no commit). Falha fechada: se não conseguiu tirar, nada é commitado.
unstage() { "${G[@]}" reset -q -- ":(literal)$1" 2>/dev/null || { "${G[@]}" reset -q 2>/dev/null; say "BLOQUEADO: não consegui tirar '$1' do índice (falha fechada) — NADA foi commitado"; exit 75; }; }

timeout 120 "${G[@]}" fetch -q "$REMOTE" "$BRANCH" 2>/dev/null || true   # só para calcular "à frente"; falha de rede não impede o commit

# 1. há o que commitar?
if [ -z "$("${G[@]}" status --porcelain 2>/dev/null)" ]; then push_pendente; say "ok: nada novo para commitar"; exit "${RC:-0}"; fi

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
# artefatos GERADOS que mudam milhares de linhas a cada rodada (ex.: graphify-out) poluem o histórico e o GitHub; ficam só no disco
GERADOS=(':(exclude,glob)graphify-out/**' ':(exclude,glob)**/graphify-out/**')

if [ "$DRY" -eq 1 ]; then
  say "[dry-run] commitaria $("${G[@]}" status --porcelain | grep -c .) item(ns) em $BRANCH (excluindo ${#EXCL[@]} por trava de dados)"; push_pendente; exit 0
fi

# 4. stageia (respeita .gitignore; deleções incluídas)
if ! "${G[@]}" add -A -- . "${SEGREDOS[@]}" "${GERADOS[@]}" "${EXCL[@]}" 2>"$STATE/ac-$KEY.err"; then
  # (12/11) era exit 0 (sucesso invisível); disco cheio/permissão repetiria toda hora sem ninguém ver: 75 = atenção
  say "PULEI: não consegui stagear ($(head -c 160 "$STATE/ac-$KEY.err" | tr '\n' ' '))"; "${G[@]}" reset -q 2>/dev/null; exit 75
fi

# 4b. revalida o que está NO ÍNDICE. O `add -A` só filtra o que ele mesmo adiciona: o usuário pode ter feito `git add`
# antes, e arquivos JÁ rastreados e modificados não passam pela regra de "novos". Falha fechada.
SECRET_RE='^(.*/)?(\.env|\.env\..*|.*\.env|\.envrc|\.npmrc|\.netrc|id_rsa.*|id_ed25519.*|id_ecdsa.*)$'
while IFS= read -r -d '' f; do
  lc="${f,,}"; bad=""
  case "$lc" in
    *.csv|*.xlsx|*.xls|*.xlsm|*.ods|*.dump|*.bak|*.sqlite|*.sqlite3|*.db|*.zip|*.tar|*.gz|*.tgz|*.7z|*.pdf|*.doc|*.docx|*.ppt|*.pptx|*.odt|*.pem|*.key|*.p12|*.pfx|*.jks|*.keystore|*.kdbx) bad="tipo de dado/segredo" ;;
  esac
  [ -z "$bad" ] && [[ "$lc" =~ $SECRET_RE ]] && bad="arquivo de segredo/ambiente"
  if [ -z "$bad" ]; then sz="$("${G[@]}" cat-file -s ":0:$f" 2>/dev/null || echo 0)"; [ "$sz" -gt "$max_bytes" ] && bad="maior que ${MAX_MB} MB"; fi
  [ -n "$bad" ] && { unstage "$f"; MOTIVO["$f"]="$bad (já no índice/rastreado)"; }
done < <("${G[@]}" diff --cached --name-only --no-renames --diff-filter=AM -z)
# binário fora da lista permitida (imagens/fontes/mídia): o gitleaks e a trava de PII não leem binário; UTF-16 também conta como binário
while IFS= read -r -d '' rec; do
  case "$rec" in
    -$'\t'-$'\t'*)
      f="${rec#-$'\t'-$'\t'}"; lc="${f,,}"
      case "$lc" in *.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.bmp|*.avif|*.woff|*.woff2|*.ttf|*.otf|*.eot|*.mp3|*.mp4|*.webm|*.wav|*.ogg) ;;
        *) unstage "$f"; MOTIVO["$f"]="binário fora da lista permitida" ;;
      esac ;;
  esac
done < <("${G[@]}" diff --cached --numstat -z --no-renames --diff-filter=AM)

# 5. dado pessoal nas linhas adicionadas e nos NOMES dos arquivos (--pii). Formatado (000.000.000-00) sempre conta;
# sem pontuação/com espaços só conta se o dígito verificador for válido (evita barrar qualquer número de 11 dígitos).
PIIOFF=0; [ -z "${PII// /}" ] && PIIOFF=1
if [ "$PIIOFF" -eq 0 ]; then
  read -r -d '' PIISCAN <<'PYEOF' || true
import sys,re,os
tipos=set(sys.argv[1].split(','))
def cpf_ok(d):
    if len(d)!=11 or d==d[0]*11: return False
    s=sum(int(d[i])*(10-i) for i in range(9)); d1=(s*10)%11%10
    s=sum(int(d[i])*(11-i) for i in range(10)); d2=(s*10)%11%10
    return d1==int(d[9]) and d2==int(d[10])
def cnpj_ok(d):
    if len(d)!=14 or d==d[0]*14: return False
    w1=[5,4,3,2,9,8,7,6,5,4,3,2]; w2=[6]+w1
    d1=sum(int(d[i])*w1[i] for i in range(12))%11; d1=0 if d1<2 else 11-d1
    d2=sum(int(d[i])*w2[i] for i in range(13))%11; d2=0 if d2<2 else 11-d2
    return d1==int(d[12]) and d2==int(d[13])
FCPF=re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}'); FCNPJ=re.compile(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}')
LCPF=re.compile(r'(?<!\d)\d{3}[. ]?\d{3}[. ]?\d{3}[-. ]?\d{2}(?!\d)'); LCNPJ=re.compile(r'(?<!\d)\d{2}[. ]?\d{3}[. ]?\d{3}[/. ]?\d{4}[-. ]?\d{2}(?!\d)')
def tem(t):
    if 'cpf' in tipos:
        if FCPF.search(t): return True
        for m in LCPF.finditer(t):
            if cpf_ok(re.sub(r'\D','',m.group())): return True
    if 'cnpj' in tipos:
        if FCNPJ.search(t): return True
        for m in LCNPJ.finditer(t):
            if cnpj_ok(re.sub(r'\D','',m.group())): return True
    return False
modo=sys.argv[2]
raw=sys.stdin.buffer.read().decode('utf-8','replace')
if modo=='any':   # há algum dado pessoal em qualquer linha adicionada ou nome de arquivo?
    for l in raw.split('\n'):
        if (l.startswith('+') and not l.startswith('+++')) or l.startswith('+++ ') or l.startswith('diff --git'):
            if tem(l): print('1'); break
else:             # modo 'nomes': stdin = nomes separados por NUL
    for n in raw.split('\0'):
        if n and tem(n): sys.stdout.write(n+'\0')
PYEOF
  if [ -n "$("${G[@]}" -c core.quotePath=false diff --cached -U0 --text --no-renames | python3 -c "$PIISCAN" "$PII" any 2>/dev/null)" ]; then
    # há algo: atribui por arquivo (caro, mas só roda quando a varredura geral achou)
    while IFS= read -r -d '' f; do
      if "${G[@]}" diff --cached -U0 --text --no-renames -- ":(literal)$f" | python3 -c "$PIISCAN" "$PII" any 2>/dev/null | grep -q 1; then
        unstage "$f"; MOTIVO["$f"]="dado pessoal (${PII}) no conteúdo ou no nome"
      fi
    done < <("${G[@]}" diff --cached --name-only -z)
  fi
fi
# 5b. TRAVA FINAL (cinto e suspensório): revarre o índice inteiro. Se ainda há dado pessoal, NADA é commitado.
if [ "$PIIOFF" -eq 0 ] && [ -n "$("${G[@]}" -c core.quotePath=false diff --cached -U0 --text --no-renames | python3 -c "$PIISCAN" "$PII" any 2>/dev/null)" ]; then
  "${G[@]}" reset -q; say "BLOQUEADO: dado pessoal ainda presente no índice depois das exclusões (falha fechada) — NADA foi commitado"; exit 75
fi
# avisa uma vez por arquivo (enquanto ele seguir igual), para não encher o log a cada hora
EXCL_SEEN="$STATE/ac-$KEY.excl"; touch "$EXCL_SEEN"
for f in "${!MOTIVO[@]}"; do
  sig="$f|$(stat -c %Y "$WT/$f" 2>/dev/null || echo 0)"
  grep -qxF "$sig" "$EXCL_SEEN" 2>/dev/null && continue
  printf '%s\n' "$sig" >> "$EXCL_SEEN"
  say "EXCLUÍDO do commit: $f (${MOTIVO[$f]}) — segue só no disco/autosave"
done

# 6. gitleaks no que sobrou (falha fechada: erro = não commita)
if [ -n "$("${G[@]}" diff --cached --name-only)" ]; then
  extra=(); [ -f "$GLCFG" ] && extra=(--config "$GLCFG")
  rep="$STATE/ac-gitleaks-$KEY.json"
  "${G[@]}" diff --cached -U0 --text | gitleaks stdin "${extra[@]}" --no-banner --redact --exit-code 9 --report-format json --report-path "$rep" >/dev/null 2>&1
  case $? in
    0) ;;
    9) "${G[@]}" reset -q; say "BLOQUEADO pelo gitleaks: segredo no que seria commitado — NADA foi commitado ($rep)"; exit 75 ;;
    *) "${G[@]}" reset -q; say "BLOQUEADO: o gitleaks falhou (falha fechada) — NADA foi commitado"; exit 75 ;;
  esac
fi

# 7. commit + push
if [ -z "$("${G[@]}" diff --cached --name-only)" ]; then
  say "nada a commitar depois das travas"; push_pendente; exit "${RC:-0}"
fi
N="$("${G[@]}" diff --cached --name-only | grep -c .)"
# (12/11) Sem identidade Git (perfil novo, .gitconfig movido) o commit falhava a cada hora. A identidade do usuário vale
# quando existe; senão, uma neutra — o trabalho continua sendo salvo.
IDENT=(); { "${G[@]}" config user.email >/dev/null 2>&1 && "${G[@]}" config user.name >/dev/null 2>&1; } \
  || IDENT=(-c user.name=autocommit-local -c user.email=autocommit-local@localhost)
if git "${IDENT[@]}" -C "$WT" commit -q --no-verify -m "autosave($BRANCH): $(date '+%F %T') — $N arquivo(s)" 2>"$STATE/ac-$KEY.err"; then
  say "COMMIT $("${G[@]}" rev-parse --short HEAD) em $BRANCH ($N arquivo(s))$([ "$NOPUSH" -eq 1 ] && echo ' — só local (--no-push)')"
else
  # (12/11) era exit 0: o run-all contava como sucesso e a falha ficava invisível para sempre. 75 = "precisa de atenção"
  # (3 seguidas aparecem em systemctl --failed); o índice volta ao normal e nada é perdido.
  "${G[@]}" reset -q; say "ERRO no commit: $(head -c 200 "$STATE/ac-$KEY.err" | tr '\n' ' ')"; exit 75
fi
push_pendente
exit "${RC:-0}"
