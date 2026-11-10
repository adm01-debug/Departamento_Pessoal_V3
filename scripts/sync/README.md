# sync — repositório local sempre igual ao GitHub (sem humano, sem IA)

Um timer systemd de usuário roda de hora em hora (`install-timer.sh`), nesta ordem:

1. **`mirror-github.sh`**: deixa o checkout **exatamente igual** ao GitHub: na branch `main`, no mesmo commit de `origin/main`, com `git status` limpo.
2. **`sync-github.sh`**: avança por fast-forward os demais branches locais que estão atrás do upstream.

```bash
bash scripts/sync/install-timer.sh [--repo <caminho>] [--no-mirror]   # instala (copia os scripts para ~/.local/share/dp-sync)
bash scripts/sync/install-timer.sh --remove                            # remove
bash scripts/sync/mirror-github.sh --repo <caminho> --dry-run          # mostra o que faria
```

## Nada se perde

- Antes de descartar qualquer diferença local, o mirror grava tudo em `refs/mirror-backup/<data>`: alterações, arquivos não rastreados e o commit local de partida. Só local, apagado após 30 dias. Recuperar um arquivo: `git checkout refs/mirror-backup/<data> -- <arquivo>`; listar: `git for-each-ref refs/mirror-backup`. Commits locais da `main` não enviados e a versão que estava em `git add` (quando diferente do disco) entram como pais extras do backup (`git log --graph refs/mirror-backup/<data>`).
- Arquivos **ignorados** pelo git (`.env`, `node_modules`, `dist`) nunca são tocados. Única exceção: o ignorado que estiver no lugar de um caminho que o GitHub passou a rastrear (ou já no índice via `git add -f`) vai para o backup antes de ser substituído ou removido — exceto se o nome parecer segredo (`.env*`, chaves, credenciais): aí o espelhamento para com erro e nada é descartado; repositório git aninhado nesse lugar = erro, nada é apagado.
- A branch local em que você estava continua existindo (só o checkout troca para `main`).
- Adia se algum arquivo foi alterado nos últimos 10 min; não age com rebase/merge/cherry-pick/bisect em andamento, com `main` em outro worktree, ou se o fetch falhar.
- Nunca faz push. Log: `~/.cache/dp-sync/sync.log`.

> Este checkout vira um espelho: trabalho de desenvolvimento deve ser feito numa **branch em outro worktree**
> (`git worktree add ../meu-trabalho -b minha-branch origin/main`); o que for deixado aqui sem commit/push é guardado no backup, mas sai do checkout.

## sync-github.sh

`fetch --all --prune` + fast-forward só de branches atrás do upstream. Branch com alterações locais, divergente ou com upstream apagado: só avisa, uma vez.

---

## autocommit-local.sh — o trabalho local sempre no GitHub, numa branch visível

Timer `dp-autocommit` (hh:30, instalado com `install-autocommit-timer.sh --worktree <pasta>`): faz **um commit com tudo** que mudou no worktree de
desenvolvimento (branch `computador_local`) e dá push, sem humano e sem IA. Complementa o `git-autosave` (fotos a cada 2 min em `refs/autosave/*`).

**O repositório é PÚBLICO**, então o script falha fechado:

- `gitleaks` no que seria commitado: achou segredo => nada é commitado na rodada;
- **excluídos do commit** (ficam só no disco/autosave, com aviso no log): arquivos **novos** de dados (`.csv .xlsx .xls .xlsm .ods .dump .bak .sqlite .db .zip .tar .gz .7z .pdf`), qualquer arquivo > 5 MB e qualquer arquivo com **CPF formatado** nas linhas adicionadas;
- `.env*`, `*.pem`, `*.key`, `*.p12`, `id_rsa*` nunca entram.

Nunca troca de branch, nunca usa `--force` (push rejeitado = só avisa, o commit fica local), não age com rebase/merge/cherry-pick/bisect ou `index.lock`, e adia se algo foi editado nos últimos 2 min. Commits usam `--no-verify`. Não dispara CI (o CI só roda em push na `main` e em PR para a `main`). Como a `main` só aceita squash, os commits "autosave" somem do histórico ao mergear o PR.

---

## Vários repositórios: `run-all.sh` + `repos.conf`

A mesma arquitetura (espelho exato da main + worktree `computador_local` com commit automático) vale para todos os repositórios de `~/.config/dp-sync/repos.conf`
(`repos.conf.example`): `repo|worktree_dev|branch_padrao|mirror|pii`, onde `mirror` é `1` (espelha), `ext` (o repositório já tem espelho próprio) ou `0`.

```bash
bash scripts/sync/install-all-timers.sh     # 2 timers: dp-sync-all (hh:00, espelho + sync) e dp-autocommit-all (hh:30)
run-all.sh mirror|autocommit [--only <nome>] [--dry-run] [--quiet-min N]
```

Um repositório com problema não impede os demais. `--pii cpf,cnpj` (por repositório) barra do commit automático arquivos com CPF/CNPJ formatados
(o aviso de exclusão aparece uma vez por arquivo). O instalador migra os timers antigos de um repositório só (`dp-sync-github`, `dp-autocommit`).
