#!/usr/bin/env bash
# Regressão dos scripts de scripts/sync (mirror-github.sh, sync-github.sh e instaladores de timer) em laboratório:
# um repositório bare faz o papel do GitHub e clones fazem o papel do computador local. Tudo em mktemp, sem rede,
# com HOME próprio (nada toca o repositório real, o ~/.cache/dp-sync real nem o systemd).
#
# Uso: bash scripts/tests/sync-lab.test.sh
set -uo pipefail

S="$(cd "$(dirname "$0")/../sync" && pwd)"
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE XDG_CACHE_HOME XDG_CONFIG_HOME
GIT_REAL="$(command -v git)"
FAIL=0; N=0
ok() { N=$((N+1)); echo "  ok:   $1"; }
fail() { N=$((N+1)); FAIL=1; echo "  FAIL: $1"; }
check() { local d="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$d"; else fail "$d"; fi; }
LABS=()
trap 'rm -rf "${LABS[@]}"' EXIT

mklab() { # $LAB/gh.git = "GitHub"; $D = clone que publica no remoto; $L = computador local (o espelho)
  LAB="$(mktemp -d)"; LABS+=("$LAB"); export HOME="$LAB/home"; mkdir -p "$HOME"
  export GIT_CONFIG_GLOBAL="$HOME/.gitconfig" GIT_CONFIG_NOSYSTEM=1
  git config --global user.email lab@example.com; git config --global user.name Lab; git config --global init.defaultBranch main
  git init -q --bare "$LAB/gh.git"; git clone -q "$LAB/gh.git" "$LAB/dev" 2>/dev/null
  D="$LAB/dev"; L="$LAB/local"; LOG="$HOME/.cache/dp-sync/sync.log"
  ( cd "$D" && printf 'a\n' > a.txt && printf 'node_modules/\n.env\n*.log\nbuild/\n' > .gitignore && mkdir src && echo x > src/x.ts \
    && git add -A && git commit -qm init && git push -q origin main )
  git clone -q "$LAB/gh.git" "$L"
}
remoto() { ( cd "$D" && eval "$1" && git add -A -f && git commit -qm "${2:-remoto}" && git push -q origin HEAD ); }   # commit no "GitHub"
mirror() { bash "$S/mirror-github.sh" --repo "$L" --quiet-min 0 --quiet; }
syncg() { bash "$S/sync-github.sh" --repo "$L" --quiet; }
bk() { git -C "$L" for-each-ref --sort=-committerdate --count=1 --format='%(refname)' refs/mirror-backup; }
espelhado() { [ "$(git -C "$L" rev-parse HEAD)" = "$(git -C "$LAB/gh.git" rev-parse main)" ] && [ -z "$(git -C "$L" status --porcelain)" ]; }

echo "── sync-lab: mirror-github.sh"

mklab; ( cd "$L" && echo local >> a.txt && echo novo > "com espaço é.txt" && echo SEGREDO > .env && mkdir node_modules && echo m > node_modules/i.js )
remoto 'echo r >> src/x.ts'; mirror; B="$(bk)"
check "árvore suja: checkout fica idêntico ao GitHub" espelhado
check "árvore suja: alteração e arquivo não rastreado vão para o backup" test "$(git -C "$L" show "$B:a.txt" | tail -1)$(git -C "$L" show "$B:com espaço é.txt")" = localnovo
check "ignorados fora do caminho não são tocados" test "$(cat "$L/.env")$(cat "$L/node_modules/i.js")" = SEGREDOm

mklab; ( cd "$L" && git checkout -q -b fix/x && git checkout -q main && echo m1 >> a.txt && git commit -qam "main local" && git checkout -q fix/x )
X="$(git -C "$L" rev-parse main)"; mirror
check "commits locais da main não enviados (checkout em outra branch) ficam seguros no backup" test -n "$(git -C "$L" for-each-ref --contains "$X" refs/mirror-backup)"

mklab; ( cd "$L" && mkdir -p build/sub && echo artefato > "build/sub/o [1].bin" && echo "log local" > x.log )
remoto 'echo f > build; mkdir x.log; echo y > x.log/y'; mirror; B="$(bk)"
check "diretório ignorado no lugar de arquivo novo vai para o backup" test "$(git -C "$L" show "$B:build/sub/o [1].bin" 2>/dev/null)" = artefato
check "arquivo ignorado no lugar de diretório novo vai para o backup" test "$(git -C "$L" show "$B:x.log" 2>/dev/null)" = "log local"
check "com ignorado no caminho o checkout ainda fica idêntico ao GitHub" espelhado

mklab; ( cd "$L" && echo "SEGREDO LOCAL" > .env )
remoto 'echo "do remoto" > .env'; mirror; rc=$?
check "ignorado com nome de segredo no lugar de caminho rastreado: erro, nada descartado e NADA no backup" test "$rc" -ne 0 -a "$(cat "$L/.env" 2>/dev/null)" = "SEGREDO LOCAL" -a -z "$(bk)"

mklab; ( cd "$L" && mkdir pasta && git init -q pasta/sub && cd pasta/sub && echo trabalho > s && git add -A && git commit -qm s )
remoto 'echo f > pasta'; mirror; rc=$?
check "repositório git aninhado no lugar de caminho novo do GitHub: erro e nada é apagado" test "$rc" -ne 0 -a -d "$L/pasta/sub/.git" -a "$(cat "$L/pasta/sub/s" 2>/dev/null)" = trabalho

mklab; ( cd "$L" && echo "SEGREDO LOCAL" > .env && git add -f .env ); mirror
check "ignorado já no índice (git add -f) vai para o backup" test "$(git -C "$L" show "$(bk):.env" 2>/dev/null)" = "SEGREDO LOCAL"

mklab; ( cd "$L" && echo "versao A" > novo.txt && git add novo.txt && echo "versao B" > novo.txt ); mirror; B="$(bk)"
check "versão em git add diferente do disco: disco no backup, índice no pai extra" test "$(git -C "$L" show "$B:novo.txt")$(git -C "$L" show "$B^2:novo.txt" 2>/dev/null)" = "versao Bversao A"

mklab; ( cd "$L" && echo novo > staged.txt && git add staged.txt ); bash "$S/mirror-github.sh" --repo "$L" --quiet-min 10 --quiet
check "arquivo novo em git add editado agora: adia (não descarta)" test -f "$L/staged.txt"

mklab; ( cd "$L" && echo relatorio > r.txt ); mirror; B="$(bk)"
VELHO="$(GIT_COMMITTER_DATE='@1000000000 +0000' git -C "$L" commit-tree "$B^{tree}" -p "$(git -C "$L" rev-parse "$B^")" -m velho)"; git -C "$L" update-ref "$B" "$VELHO"
( cd "$L" && echo relatorio > r.txt ); mirror; B2="$(bk)"
check "mesmo estado de um backup vencido: o backup do descarte de agora sobrevive à retenção" test "$(git -C "$L" show "$B2:r.txt" 2>/dev/null)" = relatorio
check "backup de mesmo estado é substituído (não acumula uma ref por execução)" test "$(git -C "$L" for-each-ref refs/mirror-backup | wc -l)" -eq 1

mklab; remoto 'echo r >> a.txt'; git -C "$L" fetch -q; ( cd "$L" && echo "trabalho local" > wip.txt )
mkdir -p "$HOME/.local/bin"; printf '#!/bin/sh\nfor a in "$@"; do [ "$a" = status ] && { echo "fatal: disco cheio (simulado)" >&2; exit 128; }; done\nexec "%s" "$@"\n' "$GIT_REAL" > "$HOME/.local/bin/git"; chmod +x "$HOME/.local/bin/git"
mirror; rc=$?; rm -f "$HOME/.local/bin/git"
check "git status falhando (disco cheio): sai com erro e não descarta nada" test "$rc" -ne 0 -a "$(cat "$L/wip.txt" 2>/dev/null)" = "trabalho local"

mklab
timeout 10 bash "$S/mirror-github.sh" --repo >/dev/null 2>&1; rc1=$?; timeout 10 bash "$S/sync-github.sh" --repo >/dev/null 2>&1; rc2=$?
check "--repo sem valor sai com erro (não entra em laço infinito)" test "$rc1" -ne 0 -a "$rc1" -ne 124 -a "$rc2" -ne 0 -a "$rc2" -ne 124
bash "$S/mirror-github.sh" --repo "$L" --keep-days abc >/dev/null 2>&1; check "--keep-days não numérico é recusado antes de agir" test $? -eq 2
check "--help não imprime código do script" test -z "$(bash "$S/mirror-github.sh" --help | grep -E 'set -uo|PATH')$(bash "$S/sync-github.sh" --help | grep -E 'set -uo|PATH')"

echo "── sync-lab: sync-github.sh"

mklab; ( cd "$L" && echo "SEGREDO LOCAL" > .env ); remoto 'echo "do remoto" > .env'; syncg
check "fast-forward não sobrescreve arquivo ignorado local" test "$(cat "$L/.env")" = "SEGREDO LOCAL"

mklab; ( cd "$L" && git branch -q --track foo main && git checkout -q -b outra ); remoto 'echo r >> a.txt'; syncg; syncg
check "branch com upstream LOCAL atrás avança por fast-forward" test "$(git -C "$L" rev-parse foo)" = "$(git -C "$LAB/gh.git" rev-parse main)"

mklab; ( cd "$L" && echo sujo >> a.txt ); remoto 'echo r >> src/x.ts'; H0="$(git -C "$L" rev-parse HEAD)"; syncg
check "checkout com alteração local não é avançado" test "$(git -C "$L" rev-parse HEAD)" = "$H0" -a "$(tail -1 "$L/a.txt")" = sujo

# um processo em segundo plano nascido do fetch (como o `git gc --auto`) não pode herdar o trinco (fd 9)
mklab; remoto 'echo r >> a.txt'
mkdir -p "$HOME/.local/bin"; printf '#!/bin/sh\nfor a in "$@"; do [ "$a" = fetch ] && { sleep 6 & }; done\nexec "%s" "$@"\n' "$GIT_REAL" > "$HOME/.local/bin/git"; chmod +x "$HOME/.local/bin/git"
mirror; rm -f "$HOME/.local/bin/git"; syncg
check "processo em segundo plano do fetch não segura o trinco para o script seguinte" test "$(grep -c 'outra sincronização em andamento' "$LOG")" -eq 0

echo "── sync-lab: instaladores de timer (systemctl falso, caminhos com espaço)"

mklab; export HOME="$LAB/home do usuário"; mkdir -p "$HOME" "$LAB/bin"; R="$LAB/Meu Repo"; git clone -q "$LAB/gh.git" "$R"
printf '#!/bin/sh\nexit 0\n' > "$LAB/bin/systemctl"; chmod +x "$LAB/bin/systemctl"
mkdir -p "$R/scripts"; cp -r "$S" "$R/scripts/sync"; U="$HOME/.config/systemd/user"
PATH="$LAB/bin:$PATH" bash "$R/scripts/sync/install-timer.sh" >/dev/null 2>&1
check "install-timer: ExecStart com caminhos entre aspas" grep -qF "ExecStart=/bin/bash \"$HOME/.local/share/dp-sync/sync-github.sh\" --repo \"$R\" --quiet" "$U/dp-sync-github.service"
check "install-timer: linha do mirror com caminhos entre aspas" grep -qF "ExecStart=-/bin/bash \"$HOME/.local/share/dp-sync/mirror-github.sh\" --repo \"$R\" --quiet" "$U/dp-sync-github.service"
PATH="$LAB/bin:$PATH" bash "$R/scripts/sync/install-autocommit-timer.sh" --worktree "$R" >/dev/null 2>&1
check "install-autocommit-timer: ExecStart com caminhos entre aspas" grep -qF "\"$HOME/.local/share/dp-sync/autocommit-local.sh\" --worktree \"$R\" --branch \"computador_local\"" "$U/dp-autocommit.service"
mkdir -p "$HOME/.config/dp-sync"; printf '%s||main|1|cpf\n' "$R" > "$HOME/.config/dp-sync/repos.conf"
PATH="$LAB/bin:$PATH" bash "$R/scripts/sync/install-all-timers.sh" >/dev/null 2>&1
check "install-all-timers: ExecStart com caminho entre aspas" grep -qF "ExecStart=/bin/bash \"$HOME/.local/share/dp-sync/run-all.sh\" mirror" "$U/dp-sync-all.service"
if command -v systemd-analyze >/dev/null 2>&1; then
  check "unidades geradas passam no systemd-analyze verify" systemd-analyze verify "$U/dp-sync-all.service" "$U/dp-sync-all.timer" "$U/dp-autocommit-all.timer"
fi

echo "── sync-lab: $N verificações"
exit "$FAIL"
