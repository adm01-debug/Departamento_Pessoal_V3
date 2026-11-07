---
name: departamento-pessoal-v2
description: Use ao programar, revisar ou depurar código neste repositório (Departamento_Pessoal_V3 — React/TS + Supabase Edge Functions) para seguir as convenções de arquivos, testes, lint e commits do projeto. Não cobre regras de negócio de RH; para isso leia o contexto gerado em docs/contexto.
---

# Convenções do repositório Departamento_Pessoal_V3

Regras de trabalho, fluxo Git e específicos do repo: `AGENTS.md` (vence qualquer doc em `docs/`).
Referência longa: `docs/agentes/`. Contexto gerado (rotas, banco, regras): `docs/contexto/00-INDEX.md`
na branch `contexto` e `inventario/estado/*.json`.

## Comandos

| Objetivo              | Comando                                              |
| --------------------- | ---------------------------------------------------- |
| Dev local             | `npm run dev`                                        |
| Typecheck             | `npm run typecheck` · `typecheck:tests` · `typecheck:edge` |
| Lint                  | `npm run lint:ci` (src) · `npm run lint:edge` (Deno) |
| Testes unitários      | `npm run test` (Vitest)                              |
| E2E                   | `npm run test:e2e` (Playwright)                      |
| Gate completo local   | `npm run ci:verify`                                  |
| Formatação            | `npm run format:check` / `format:write` (Prettier)   |

Gerenciador de pacotes: **npm** (`npm ci`). Nunca Bun/yarn/pnpm.

## Estrutura

- `src/` — React 19 + TypeScript strict: `pages/`, `components/`, `hooks/`, `services/`, `types/`, `lib/`.
- `supabase/functions/` — Edge Functions (Deno); código comum em `_shared/`; gateway `external-db-bridge/`.
- `supabase/migrations/` — SQL; aplicação em produção só via `canonical-migrations.yml`.
- `e2e/` — Playwright. `scripts/` — audits, inventário, contexto. `infra/runbooks/` — operação.

## Testes

- Nome `*.test.ts(x)` (ou `*.spec.*`), ao lado do módulo ou em `__tests__/`; Edge Functions têm
  `*.test.ts` dentro de `supabase/functions/_shared/`.
- `lint-staged` roda `vitest related --run` nos testes tocados no pre-commit.

## Commits e PR

- Conventional Commits em PT-BR, validados pelo `commitlint`: tipos `feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert`,
  assunto em minúsculas, ≤ 72 caracteres. Ex.: `fix: corrige cálculo de horas extras na folha`.
- Branch `claude/<tipo>-<slug>-<AAMMDD-HHMM>` a partir de `main`; uma tarefa = uma branch = uma PR.
- Pre-commit (`husky` + `lint-staged`): eslint --fix + prettier em `*.ts/tsx`, prettier em `*.json/md/css`,
  actionlint em `.github/workflows/*.yml`.
