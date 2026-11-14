#!/usr/bin/env bash
# Cenários do dp-sync/autocommit-local.sh (commit+push automático da computador_local em repositório PÚBLICO).
# HOME isolado, remoto bare local, gitleaks real. Uso: bash scripts/tests/autocommit-lab.test.sh [caminho]  Saída 0 = todos ok.
# Cópia versionada da bateria local (repo-maintenance/tests/autocommit-local.cenarios.sh). Os segredos FALSOS abaixo são
# montados em tempo de execução para o gitleaks do CI não acusar este arquivo.
set -u
A=${1:-$(cd "$(dirname "$0")/../sync" && pwd)/autocommit-local.sh}
GL=$(command -v gitleaks) || { echo "gitleaks ausente"; exit 2; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
export HOME=$T/home XDG_CACHE_HOME=$T/cache; mkdir -p "$HOME/.local/bin"; ln -s "$GL" "$HOME/.local/bin/gitleaks"
G() { git -c user.name=t -c user.email=t@t.invalid -c init.defaultBranch=main "$@"; }
PASS=0; FAIL=0
ok() { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL+1)); printf '  FALHA %s (rc=%s)\n        %s\n' "$1" "$RC" "$(tail -2 "$XDG_CACHE_HOME/dp-sync/sync.log" 2>/dev/null | tr '\n' ' ' | cut -c1-300)"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }
novo() { N=$1; O=$T/$N.git; R=$T/$N
  G init -q --bare "$O"; G clone -q "$O" "$R" 2>/dev/null
  (cd "$R" && printf 'base\n' > a && printf 'node_modules/\n' > .gitignore && G add -A && G commit -qm base && G push -q origin main && G checkout -q -b computador_local)
  G -C "$R" config user.name Dev; G -C "$R" config user.email dev@exemplo.invalid; }
roda() { bash "$A" --worktree "$R" --quiet-min 0 --quiet "$@" >/dev/null 2>&1; RC=$?; }
noremoto() { git --git-dir="$O" cat-file -e "computador_local:$1" 2>/dev/null; }
remoto_tem() { git --git-dir="$O" rev-parse -q --verify refs/heads/computador_local >/dev/null; }
noindice() { git -C "$R" ls-files --error-unmatch -- "$1" >/dev/null 2>&1; }
CPF_FMT="123.456.789-09"; CPF_NU="52998224725"; CNPJ="11.222.333/0001-81"
TOKEN="ghp""_Ab9xQ2mZ7kL4pR8sT1vW3yC6dF0hJ5nBx9Kq"; JWT="ey""JhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey""Jyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJhX2Zha2VfcGFyYV90ZXN0ZQ"

echo "autocommit-local: $A"
novo basico; echo novo >> "$R/a"; roda
check "alteração: commit + push da computador_local (branch nova no remoto)" '[ $RC -eq 0 ] && remoto_tem && git --git-dir="$O" show computador_local:a | grep -q novo'
check "autor do commit = identidade do usuário" '[ "$(git -C "$R" log -1 --format=%ae)" = dev@exemplo.invalid ]'
roda; check "nada novo: não cria commit vazio" '[ $RC -eq 0 ] && [ "$(git -C "$R" rev-list --count computador_local)" -eq 2 ]'
novo naoenviado; (cd "$R" && echo m > m && G add m && G commit -qm manual); roda
check "commit manual ainda não enviado: é enviado" 'noremoto m'
novo outrabranch; G -C "$R" checkout -q -b fix/x; echo x >> "$R/a"; roda
check "worktree em outra branch: nunca troca nem commita" '[ $RC -eq 0 ] && [ "$(git -C "$R" symbolic-ref --short HEAD)" = fix/x ] && [ -n "$(git -C "$R" status --porcelain)" ]'
novo env; echo "K=1" > "$R/.env"; echo "K=2" > "$R/.env.production"; echo "ok" > "$R/b"; roda
check ".env e .env.* não ignorados nunca entram (o resto entra)" 'noremoto b && ! noremoto .env && ! noremoto .env.production'
novo envforcado; echo "K=1" > "$R/x.env"; G -C "$R" add -f x.env; echo b > "$R/b"; roda
check "arquivo de ambiente já no índice (git add): retirado" 'noremoto b && ! noremoto x.env'
novo dados; echo "nome;tel" > "$R/clientes.csv"; echo pdf > "$R/doc.pdf"; echo b > "$R/b"; roda
check "csv/pdf novos ficam fora (dados em massa)" 'noremoto b && ! noremoto clientes.csv && ! noremoto doc.pdf'
novo grande; head -c 6000000 /dev/urandom | base64 > "$R/grande.txt"; echo b > "$R/b"; roda
check "arquivo > 5 MB fica fora" 'noremoto b && ! noremoto grande.txt'
novo cpf; echo "cliente $CPF_FMT" > "$R/c.ts"; echo b > "$R/b"; roda
check "CPF formatado: arquivo fora, resto entra" 'noremoto b && ! noremoto c.ts && [ -f "$R/c.ts" ]'
novo cpfnu; echo "doc=$CPF_NU" > "$R/c.ts"; roda
check "CPF sem pontuação com dígito válido: barrado" '! noremoto c.ts'
novo naocpf; echo "id=12345678901" > "$R/n.ts"; roda
check "11 dígitos que não são CPF válido: não barra (sem falso positivo)" 'noremoto n.ts'
novo cnpj; echo "empresa $CNPJ" > "$R/e.ts"; bash "$A" --worktree "$R" --quiet-min 0 --quiet --pii cpf,cnpj >/dev/null 2>&1; RC=$?
check "CNPJ com --pii cpf,cnpj: barrado" '! noremoto e.ts'
novo piinome; echo x > "$R/$CPF_FMT.txt"; roda
check "CPF no NOME do arquivo: barrado" '! git --git-dir="$O" ls-tree -r --name-only computador_local 2>/dev/null | grep -q "$CPF_FMT"'
novo piiinvalido; echo y >> "$R/a"; bash "$A" --worktree "$R" --quiet-min 0 --quiet --pii cfp >/dev/null 2>&1; RC=$?
check "--pii inválido: falha fechada (exit 2, nada commitado)" '[ $RC -eq 2 ] && ! remoto_tem'
novo token; printf 'const t="%s";\n' "$TOKEN" > "$R/t.ts"; roda
check "token no conteúdo: BLOQUEADO (75), nada commitado nem enviado" '[ $RC -eq 75 ] && ! remoto_tem && [ "$(git -C "$R" rev-list --count HEAD)" -eq 1 ] && [ -f "$R/t.ts" ]'
novo jwt; printf 'k="%s"\n' "$JWT" > "$R/k.ts"; roda
check "JWT (service_role do Supabase): BLOQUEADO" '[ $RC -eq 75 ] && ! remoto_tem'
novo pg; echo 'DB="postgresql://user:senhaforte@db.exemplo.invalid:5432/x"' > "$R/db.ts"; roda
check "URL de banco com senha: BLOQUEADO" '[ $RC -eq 75 ] && ! remoto_tem'
novo commitsegredo; (cd "$R" && printf 'x="%s"\n' "$TOKEN" > s.ts && G add s.ts && G commit -qm manual); roda
check "segredo num commit MANUAL não enviado: push barrado (75)" '[ $RC -eq 75 ] && ! remoto_tem'
novo binario; printf '\x00\x01\x02binario' > "$R/x.bin"; echo i > "$R/img.png"; roda
check "binário fora da lista sai; imagem permitida entra" '! noremoto x.bin && noremoto img.png'
novo literal; echo "$CPF_FMT" > "$R/:estranho[1]*.ts"; echo b > "$R/b"; roda
check "nome com : [ * (pathspec mágico) com CPF: tirado do commit (modo literal)" 'noremoto b && ! git --git-dir="$O" ls-tree -r --name-only computador_local | grep -qF ":estranho"'
novo gerado; mkdir -p "$R/graphify-out"; echo '{}' > "$R/graphify-out/graph.json"; echo b > "$R/b"; roda
check "graphify-out (gerado) fica fora" 'noremoto b && ! noremoto graphify-out/graph.json'
novo delecao; (cd "$R" && echo d > d && G add d && G commit -qm d); roda; rm "$R/d"; roda
check "deleção é commitada" '! noremoto d && noremoto a'
novo recente; echo r >> "$R/a"; bash "$A" --worktree "$R" --quiet-min 5 --quiet >/dev/null 2>&1; RC=$?
check "editado há menos de --quiet-min: adia" '[ $RC -eq 0 ] && ! remoto_tem'
novo nopush; echo np >> "$R/a"; roda --no-push
check "--no-push: commit só local, nada enviado" '[ "$(git -C "$R" rev-list --count HEAD)" -eq 2 ] && ! remoto_tem'
novo dry; echo dr >> "$R/a"; roda --dry-run
check "--dry-run: nada commitado nem enviado" '[ "$(git -C "$R" rev-list --count HEAD)" -eq 1 ] && ! remoto_tem && [ -n "$(git -C "$R" status --porcelain)" ]'
novo rebase; mkdir "$R/.git/rebase-merge"; echo z >> "$R/a"; roda; rmdir "$R/.git/rebase-merge"
check "rebase em andamento: não age" '! remoto_tem'
novo rejeitado; echo 1 >> "$R/a"; roda; (cd $T && G clone -q -b computador_local "$O" outro-$N && cd outro-$N && echo r > r && G add r && G commit -qm r && G push -q origin computador_local); echo 2 >> "$R/a"; roda
check "push rejeitado (não fast-forward): 75, sem --force, commit fica local" '[ $RC -eq 75 ] && noremoto r && git -C "$R" log -1 --format=%s | grep -q autosave'
novo semidentidade; G -C "$R" config --unset user.name; G -C "$R" config --unset user.email; echo s >> "$R/a"; roda
check "sem identidade Git: commit feito com identidade neutra e enviado (antes: ERRO + exit 0 silencioso)" '[ $RC -eq 0 ] && noremoto a && [ "$(git --git-dir="$O" log -1 --format=%ae computador_local)" = autocommit-local@localhost ]'
novo stagefalha; echo f >> "$R/a"; find "$R/.git/objects" -type d -exec chmod 0555 {} +; roda; find "$R/.git/objects" -type d -exec chmod 0755 {} +
check "falha ao stagear (objetos sem escrita): exit 75 visível, índice limpo" '[ $RC -eq 75 ] && [ -z "$(git -C "$R" diff --cached --name-only)" ]'
novo commitfalha; echo f >> "$R/a"; chmod 0555 "$R/.git/refs/heads"; roda; chmod 0755 "$R/.git/refs/heads"
check "falha no commit (refs sem escrita): exit 75 visível, índice limpo, alteração no disco" '[ $RC -eq 75 ] && [ -z "$(git -C "$R" diff --cached --name-only)" ] && grep -q "^f$" "$R/a"'
novo ilegivel; echo edit >> "$R/a"; echo seg > "$R/trancado.txt"; chmod 000 "$R/trancado.txt"; roda; chmod 644 "$R/trancado.txt"
check "[revisão] arquivo ilegível: sai do commit e o RESTO é commitado (antes nada entrava)" '[ $RC -eq 0 ] && noremoto a && git --git-dir="$O" show computador_local:a | grep -q edit && ! noremoto trancado.txt'
novo aninhado; echo edit >> "$R/a"; mkdir "$R/sub"; git -C "$R/sub" init -q; roda
check "[revisão] repositório aninhado sem commit: o resto é commitado" '[ $RC -eq 0 ] && git --git-dir="$O" show computador_local:a | grep -q edit'
novo espaco; mv "$R" "$T/com espaco"; R="$T/com espaco"; G -C "$R" worktree prune 2>/dev/null; echo e >> "$R/a"; roda
check "caminho com espaço" 'noremoto a && git --git-dir="$O" show computador_local:a | grep -q "^e$"'
novo usage; out=$(bash "$A" 2>&1); RC=$?; check "sem --worktree: uso, exit 2" '[ $RC -eq 2 ]'

# --- (13/11) revisão 2
novo r1; (cd "$R" && echo "apiUrl=publica" > cfg.local && echo base > au.txt && G add cfg.local au.txt && G commit -qm cfg && git update-index --skip-worktree cfg.local && git update-index --assume-unchanged au.txt && echo "senha_local=hunter2" >> cfg.local && echo mexido >> au.txt && echo "tok=$TOKEN" > leak.txt); roda; rc1=$RC; rm -f "$R/leak.txt"; roda
check "[rev2 #1] bloqueio preserva skip-worktree/assume-unchanged: config local NUNCA sobe" '[ $rc1 -eq 75 ] && git -C "$R" ls-files -v cfg.local | grep -q "^S" && git -C "$R" ls-files -v au.txt | grep -q "^h" && ! git --git-dir="$O" show computador_local:cfg.local 2>/dev/null | grep -q hunter2'
novo r2; (cd "$R" && G checkout -q -b side && echo s > s.txt && G add s.txt && G commit -qm s && G checkout -q computador_local && G merge -q --no-ff --no-commit side && echo "tok=$TOKEN" > evil.txt && G add evil.txt && G commit -qm merge); roda
check "[rev2 #2] segredo introduzido na RESOLUÇÃO de um merge: não envia" '[ $RC -eq 75 ] && ! git --git-dir="$O" show computador_local:evil.txt >/dev/null 2>&1'
novo r4; (cd "$R" && echo local >> a && G stash -q && echo remoto >> a && G commit -qam c && G stash pop -q 2>/dev/null); roda
check "[rev2 #4] conflito de stash pop (sem MERGE_HEAD): 75 e nada sobe com marcadores" '[ $RC -eq 75 ] && ! git --git-dir="$O" show computador_local:a 2>/dev/null | grep -q "<<<<<<<"'
novo r3; echo "DB_PASSWORD=x" > "$R/.env-prod"; echo "K=1" > "$R/.env.example.local"; mkdir -p "$R/.github/workflows"; echo "name: secrets-scan" > "$R/.github/workflows/secrets-scan.yml"; echo "A=1" > "$R/.env.example"; roda
check "[rev2 #3] .env-prod e .env.example.local não sobem; workflow secrets-scan.yml sobe" '[ $RC -eq 0 ] && ! noremoto .env-prod && ! noremoto .env.example.local && noremoto .github/workflows/secrets-scan.yml'
novo c1; mkdir -p "$R/.github"; echo "//registry.npmjs.org/:_authToken=x" > "$R/.github/.npmrc"; echo "https://u:p@github.com" > "$R/.github/.git-credentials"; echo '{"k":1}' > "$R/.github/credentials.json"; echo limpo > "$R/b"; roda
check "[Codex #549] .github/.npmrc, .github/.git-credentials e .github/credentials.json NÃO sobem" '[ $RC -eq 0 ] && noremoto b && ! noremoto .github/.npmrc && ! noremoto .github/.git-credentials && ! noremoto .github/credentials.json'
novo c2; echo novo >> "$R/a"; mkdir -p "$HOME/.local/bin"; printf '#!/bin/sh\ncase "$*" in *index-usuario*) exit 1;; esac\nexec /bin/cp "$@"\n' > "$HOME/.local/bin/cp"; chmod +x "$HOME/.local/bin/cp"; PATH="$HOME/.local/bin:$PATH" roda; rm -f "$HOME/.local/bin/cp"
check "[Codex #549] backup do índice falha: para com 75 sem mexer em nada" '[ $RC -eq 75 ] && ! remoto_tem'

# --- (13/11) revisão adversarial D1..D9
nomaster() { N=$1; O=$T/$N.git; R=$T/$N
  git -c init.defaultBranch=master init -q --bare "$O"; G clone -q "$O" "$R" 2>/dev/null
  (cd "$R" && G checkout -q -b master 2>/dev/null; printf 'base\n' > a && printf 'node_modules/\n' > .gitignore && G add -A && G commit -qm base && G push -q origin master && G checkout -q -b computador_local)
  G -C "$R" config user.name Dev; G -C "$R" config user.email dev@exemplo.invalid; }
nomaster d1; (cd "$R" && echo "tok=$TOKEN" > cfg.txt && G add cfg.txt && G commit -qm manual); echo limpo > "$R/b"; roda
check "[D1] remoto sem origin/main: segredo em commit ANTERIOR também é varrido (não envia)" '[ $RC -eq 75 ] && ! remoto_tem'
novo d2; printf 'db:5432:prod:app:Sup3rS3cretPw\n' > "$R/.pgpass"; printf 'https://joao:somepassword@github.com\n' > "$R/.git-credentials"; echo '{"k":1}' > "$R/gcp-credentials.json"; echo '{}' > "$R/service-account-x.json"; echo x > "$R/secrets.example.yaml"; echo limpo > "$R/b"; roda
check "[D2] .pgpass, .git-credentials, *credentials*.json e service-account*.json não sobem; modelo .example sobe" '[ $RC -eq 0 ] && noremoto b && ! noremoto .pgpass && ! noremoto .git-credentials && ! noremoto gcp-credentials.json && ! noremoto service-account-x.json && noremoto secrets.example.yaml && [ -f "$R/.pgpass" ]'
novo d3; printf '#!/bin/sh\nexit 1\n' > "$HOME/.local/bin/python3"; chmod +x "$HOME/.local/bin/python3"; echo "cliente $CPF_FMT" > "$R/clientes.txt"; PATH="$HOME/.local/bin:$PATH" roda; rm -f "$HOME/.local/bin/python3"
check "[D3] python3 falhando: trava de dado pessoal FECHA (75, nada sobe)" '[ $RC -eq 75 ] && ! remoto_tem'
novo d4; echo work > "$R/new.txt"; echo lixo > "$(git -C "$R" rev-parse --absolute-git-dir)/index"; roda
check "[D4] índice corrompido: 75 (antes 0 com 'nada novo')" '[ $RC -eq 75 ]'
novo d7; echo conteudo > "$R/é$CPF_NU.txt"; echo limpo > "$R/b"; roda
check "[D7] nome não-ASCII com CPF: só ele sai, o resto sobe" '[ $RC -eq 0 ] && noremoto b && ! git --git-dir="$O" ls-tree -r --name-only computador_local | grep -q "$CPF_NU"'
if [ "$(id -u)" -ne 0 ]; then
novo d8; for i in 1 2 3 4 5 6 7; do echo s > "$R/f$i"; chmod 000 "$R/f$i"; done; echo limpo > "$R/b"; roda
check "[D8] 7 arquivos ilegíveis: todos saem e o resto sobe (antes parava em 4)" '[ $RC -eq 0 ] && noremoto b && ! noremoto f7'
chmod 644 "$R"/f* 2>/dev/null
fi
novo d9; (cd "$R" && echo v1-staged > x && git add x && echo v2-disk > x && echo "tok=$TOKEN" > leak.txt); roda
check "[D9] bloqueio devolve o índice do usuário (v1 continua em stage)" '[ $RC -eq 75 ] && [ "$(git -C "$R" show :x 2>/dev/null)" = v1-staged ] && ! git -C "$R" ls-files --error-unmatch leak.txt >/dev/null 2>&1'

# --- (14/11) rev3: cada cenário falha na versão anterior ao rev3
novo r3a; (cd "$R" && echo "tok=$TOKEN" > velho.txt && G add velho.txt && G commit -qm vazou && G push -q origin computador_local:main && G push -q origin computador_local && : > velho.txt); roda
check "[R3a] REMOVER segredo que já é público não bloqueia (só linhas adicionadas vão ao gitleaks)" '[ $RC -eq 0 ] && ! git --git-dir="$O" show computador_local:velho.txt | grep -q tok'
novo r3b; (cd "$R" && echo v1 > x && git add x); K=$(printf '%s' "$(cd "$R" && pwd -P)" | sha1sum | cut -c1-10); mkdir -p "$XDG_CACHE_HOME/dp-sync"
cp -p "$(git -C "$R" rev-parse --absolute-git-dir)/index" "$XDG_CACHE_HOME/dp-sync/ac-$K.index-usuario"; (cd "$R" && echo y > y && git add y && echo "tok=$TOKEN" > leak.txt); roda
check "[R3b] backup do índice deixado por execução interrompida é DEVOLVIDO (não apagado)" '[ $RC -eq 75 ] && [ "$(git -C "$R" show :x 2>/dev/null)" = v1 ] && ! noindice y && grep -q RECUPEREI "$XDG_CACHE_HOME/dp-sync/sync.log"'
novo r3c; rm -f "$HOME/.local/bin/gitleaks"; printf '#!/bin/bash\nif grep -q MATA-AQUI; then kill -TERM $PPID; sleep 1; fi; exit 0\n' > "$HOME/.local/bin/gitleaks"; chmod +x "$HOME/.local/bin/gitleaks"
(cd "$R" && echo v1 > x && git add x && echo v2 > x && echo MATA-AQUI > sinal.txt); roda; rm -f "$HOME/.local/bin/gitleaks"; ln -s "$GL" "$HOME/.local/bin/gitleaks"
check "[R3c] SIGTERM no meio: 75, índice do usuário devolvido e nada sobe" '[ $RC -eq 75 ] && [ "$(git -C "$R" show :x 2>/dev/null)" = v1 ] && ! noindice sinal.txt && ! remoto_tem && ! ls "$XDG_CACHE_HOME/dp-sync/" | grep -q index-usuario'
novo r3d; echo '{"k":1}' > "$R/credentials.json.orig"; echo 'k: 1' > "$R/secrets.yaml.old"; echo 'https://u:p@h' > "$R/.git-credentials~"; echo limpo > "$R/b"; roda
check "[R3d] nome de segredo com sufixo de cópia (.orig/.old/~) não sobe" '[ $RC -eq 0 ] && noremoto b && ! noremoto credentials.json.orig && ! noremoto secrets.yaml.old && ! noremoto ".git-credentials~"'
novo r3e; (cd "$R" && ln -s a db-credentials.json && G add db-credentials.json && G commit -qm link && G push -q origin computador_local && rm db-credentials.json && echo '{"pw":"x"}' > db-credentials.json && echo limpo > b); roda
check "[R3e] link trocado por arquivo real com nome de segredo (tipo T): não sobe" '[ $RC -eq 0 ] && noremoto b && git --git-dir="$O" ls-tree computador_local db-credentials.json | grep -q "^120000"'

echo "autocommit-local: $PASS ok, $FAIL falha(s)"; [ "$FAIL" -eq 0 ]
