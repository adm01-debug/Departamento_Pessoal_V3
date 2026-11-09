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
- Antes de descartar qualquer diferença local, o mirror grava tudo em `refs/mirror-backup/<data>`: alterações, arquivos não rastreados e o commit local de partida. Só local, apagado após 30 dias. Recuperar um arquivo: `git checkout refs/mirror-backup/<data> -- <arquivo>`; listar: `git for-each-ref refs/mirror-backup`.
- Arquivos **ignorados** pelo git (`.env`, `node_modules`, `dist`) nunca são tocados.
- A branch local em que você estava continua existindo (só o checkout troca para `main`).
- Adia se algum arquivo foi alterado nos últimos 10 min; não age com rebase/merge/cherry-pick/bisect em andamento, com `main` em outro worktree, ou se o fetch falhar.
- Nunca faz push. Log: `~/.cache/dp-sync/sync.log`.

> Este checkout vira um espelho: trabalho de desenvolvimento deve ser feito numa **branch em outro worktree**
> (`git worktree add ../meu-trabalho -b minha-branch origin/main`); o que for deixado aqui sem commit/push é guardado no backup, mas sai do checkout.

## sync-github.sh
`fetch --all --prune` + fast-forward só de branches atrás do upstream. Branch com alterações locais, divergente ou com upstream apagado: só avisa, uma vez.
