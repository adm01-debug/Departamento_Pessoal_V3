# autofix — correção automática sem IA

Corrige o código com ferramentas determinísticas (tsc, eslint, prettier, git). Custo de IA: zero.

```bash
node scripts/autofix/run.mjs --dry-run      # roda tudo num worktree descartável e mostra o resultado
node scripts/autofix/run.mjs                # aplica no worktree isolado e commita em autofix/<data>
node scripts/autofix/run.mjs --here         # limpa só os arquivos que a sua branch já alterou (não commita)
node scripts/autofix/run.mjs --here --commit
bash scripts/autofix/install-timer.sh       # agenda diariamente às 03:40 (opcional)
```

Opções: `--steps eslint,any,format,ratchet` · `--max-runs 80` (orçamento de rodadas do tsc) ·
`--include-as` (também tenta `x as any`) · `--format-all` (prettier em todo o escopo: diff enorme) ·
`--base origin/main` · `--worktree <caminho>` · `--report-dir <pasta>`.

## O que faz

| Etapa | O quê |
| --- | --- |
| `eslint` | `eslint --fix` com regras seguras que o projeto ainda não liga: `consistent-type-imports`, `no-inferrable-types`, `object-shorthand`, `no-else-return`, `prefer-const`, `no-var`, `no-extra-boolean-cast`, `no-useless-rename`. Se o conjunto regredir o `tsc`, reaplica regra a regra e descarta só a culpada. |
| `any` | Para cada `no-explicit-any`: `(h: any) =>` em callback vira `(h) =>`; `catch (e: any)` vira `catch (e)`; `x: any` / `any[]` / `Record<string, any>` viram `unknown`. Só mantém o que o `tsc` aceita sem erro novo. Falhas são isoladas por arquivo/linha do erro e, se preciso, por bisseção. |
| `format` | Prettier nos arquivos tocados (o CI `format:check:changed` exige isso em tudo que o PR altera). |
| `ratchet` | `scripts/ratchet-any.mjs --write`, para o orçamento de `any` só descer. |

## Garantias

- Edições são só de tipo/estilo; nenhuma muda comportamento em runtime.
- Gate final: `tsc` sem erro novo, eslint sem aviso/erro a mais, arquivos tocados no padrão do Prettier,
  `ratchet-any` passando. Se qualquer um falha, **tudo é desfeito**.
- O modo padrão nunca toca no seu checkout e nunca faz push. Cada etapa vira um commit na branch `autofix/<data>`.
- Uma execução por vez (trava em `/tmp/dp-autofix.lock`) e prioridade baixa (`nice 10`).
- Relatório em `~/.autofix-reports/Departamento_Pessoal_V3/<data>.{md,json}`.

## Fora do escopo (de propósito)

- `x as any` (194 casos): quase sempre esconde um tipo errado que exige decisão humana. Use `--include-as` para tentar.
- Regras que mudam comportamento (`eqeqeq`, `no-unused-vars` com remoção) não entram.
- Não abre PR nem faz push; revise a branch `autofix/*` e abra o PR quando quiser.
