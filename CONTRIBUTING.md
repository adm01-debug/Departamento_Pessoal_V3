# Contribuindo

## Stack

React 19 · TypeScript 6 · Vite 8 · npm · Tailwind 4 · Supabase 2.x

## Setup

```bash
git clone https://github.com/adm01-debug/departamento-pessoal-v2.git
cd departamento-pessoal-v2
npm ci
cp .env.example .env.local
npm run dev
```

## Comandos

| Comando             | Descrição                 |
| ------------------- | ------------------------- |
| `npm run dev`       | Dev server (8080)         |
| `npm run build`     | Produção                  |
| `npm run lint`      | ESLint                    |
| `npm run typecheck` | tsc --noEmit              |
| `npm run test`      | Vitest                    |
| `npm run test:e2e`  | Playwright                |
| `npm run ci:verify` | typecheck + lint + format |

## DB Bridge

NUNCA use Supabase client direto. Importe de `@/integrations/supabase/client`. O proxy roteia para `external-db-bridge`.

## Commits

Conventional Commits: `feat:` · `fix:` · `chore:` · `docs:` · `test:` · `refactor:`

## PRs

- Branch: `fix/desc`, `feat/desc`, `chore/desc`
- CI precisa passar (typecheck + lint + test)
- 1 reviewer mínimo
