# autofix — correção automática sem IA

Corrige o código com ferramentas determinísticas (tsc, eslint, prettier, git). Custo de IA: zero.

```bash
node scripts/autofix/run.mjs --dry-run      # roda tudo num worktree descartável e mostra o resultado
node scripts/autofix/run.mjs                # aplica no worktree isolado e commita em autofix/<data>
node scripts/autofix/run.mjs --here         # limpa só os arquivos que a sua branch já alterou (não commita)
node scripts/autofix/run.mjs --here --commit
bash scripts/autofix/install-timer.sh       # agenda diariamente às 03:40 (opcional)
```

Opções: `--steps eslint,any,format,ratchet` · `--max-runs 150` (orçamento de rodadas do tsc) ·
`--include-as` (também tenta `x as any`) · `--format-all` (prettier em todo o escopo: diff enorme) ·
`--base origin/main` · `--worktree <caminho>` · `--report-dir <pasta>`.

## O que faz

| Etapa     | O quê                                                                                                                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint`  | `eslint --fix` com regras seguras que o projeto ainda não liga: `consistent-type-imports`, `no-inferrable-types`, `object-shorthand`, `no-else-return`, `prefer-const`, `no-var`, `no-extra-boolean-cast`, `no-useless-rename`. Se o conjunto regredir o `tsc`, reaplica regra a regra e descarta só a culpada. |
| `any`     | Para cada `no-explicit-any`: `(h: any) =>` em callback vira `(h) =>`; `catch (e: any)` vira `catch (e)`; `x: any` / `any[]` / `Record<string, any>` viram `unknown`. Só mantém o que o `tsc` aceita sem erro novo. Falhas são isoladas por arquivo/linha do erro e, se preciso, por bisseção.                   |
| `format`  | Prettier nos arquivos tocados (o CI `format:check:changed` exige isso em tudo que o PR altera).                                                                                                                                                                                                                 |
| `ratchet` | `scripts/ratchet-any.mjs --write`, para o orçamento de `any` só descer.                                                                                                                                                                                                                                         |

## Garantias

- Edições são só de tipo/estilo; nenhuma muda comportamento em runtime.
- Gate final: `tsc` sem erro novo, eslint sem aviso/erro a mais, arquivos tocados no padrão do Prettier,
  `ratchet-any` passando. Se qualquer um falha, **tudo é desfeito**.
- O modo padrão nunca toca no seu checkout e nunca faz push. Cada etapa vira um commit na branch `autofix/<data>`.
- Idempotente: se existe uma branch `autofix/*` com conteúdo ainda não integrado na base, a execução é pulada (não empilha PRs). Como os PRs entram por squash, a branch é considerada integrada quando simular o merge na base não altera a árvore (`git merge-tree --write-tree`); nesse caso ela é removida sozinha. Conflito ou erro conta como pendente.
- Uma execução por vez (trava em `~/.cache/dp-autofix/run.lock`) e prioridade baixa (`nice 10`).
- Relatório em `~/.autofix-reports/Departamento_Pessoal_V3/<data>.{md,json}`.

## Fora do escopo (de propósito)

- `x as any` (194 casos): quase sempre esconde um tipo errado que exige decisão humana. Use `--include-as` para tentar.
- Regras que mudam comportamento (`eqeqeq`, `no-unused-vars` com remoção) não entram.
- Não abre PR nem faz push; revise a branch `autofix/*` e abra o PR quando quiser.

---

# regras/ — gaps de regras de negócio sem IA

```bash
node scripts/autofix/regras/verificar.mjs --ref origin/main      # confere o main atual; relatório em ~/.autofix-reports/Departamento_Pessoal_V3/regras/ULTIMO.md
node scripts/autofix/regras/verificar.mjs --cwd <pasta> --strict # sai 1 se houver divergência crítica/alta
```

Não altera o projeto: só lê e relata. Dois grupos de regras:

**Cálculo** (`catalogo.mjs` + `referencia.mjs`): executa os motores reais (`calculators/`, `utils/*Calc`) e compara com um gabarito independente
escrito a partir da norma (INSS 2026, IRRF + redutor da Lei 15.270/2025, FGTS, aviso prévio, multa 40%/20%, férias, 13º, horas extras) e dos dois motores de
rescisão entre si. As tabelas do gabarito ficam em `referencia.mjs` com **fonte e confiança**; atualizar a tabela do ano = editar esse arquivo.

**Dados** (`dados.mjs`): reconstrói o schema final a partir das migrations (replay estático, incluindo SQL dinâmico em blocos `DO` e o helper
`_ensure_search_path`) e confere: RLS/ACL em toda tabela, policies irrestritas em tabela com PII, `SECURITY DEFINER` sem `search_path`, colunas monetárias em
float, PK ausente, FKs sem índice, gate estático de segurança das edge functions, e se os gates de banco do projeto realmente executam.

Limites assumidos: o replay é por regex (candidatos a conferir, com a migration de origem citada); tabelas sem fonte no catálogo (PLR, salário-família,
seguro-desemprego, encargos) aparecem como "não verificadas" até alguém registrar a fonte oficial; a decisão de **corrigir** regra de cálculo é sempre humana.
