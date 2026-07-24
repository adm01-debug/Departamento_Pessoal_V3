# Contribuindo

## Stack
React 19 · TypeScript 6 · Vite 8 · Bun · Tailwind 4 · Supabase 2.x

## Setup

```bash
git clone https://github.com/adm01-debug/departamento-pessoal-v2.git
cd departamento-pessoal-v2
bun install
cp .env.example .env.local
bun run dev
```

## Comandos

| Comando | Descrição |
|---------|-----------|
| `bun run dev` | Dev server (8080) |
| `bun run build` | Produção |
| `bun run lint` | ESLint |
| `bun run typecheck` | tsc --noEmit |
| `bun run test` | Vitest |
| `bun run test:e2e` | Playwright |
| `bun run ci:verify` | typecheck + lint + format |

## DB Bridge
NUNCA use Supabase client direto. Importe de `@/integrations/supabase/client`. O proxy roteia para `external-db-bridge`.

## Commits
Conventional Commits: `feat:` · `fix:` · `chore:` · `docs:` · `test:` · `refactor:`

## PRs
- Branch: `fix/desc`, `feat/desc`, `chore/desc`
- CI precisa passar (typecheck + lint + test)
- 1 reviewer mínimo