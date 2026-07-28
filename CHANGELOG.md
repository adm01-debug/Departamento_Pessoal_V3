# Changelog - Sistema Departamento Pessoal

## [22.0.0] - 2026-07-27

### Contexto da versão

Esta versão consolida o trabalho de **migração do banco Lovable → Supabase**
do sistema **Departamento Pessoal v2** (projeto Supabase
`frjbfeamybqsejlvmqbl`), além do ciclo de testes módulo-a-módulo iniciado
em **2026-07-26** e finalizado nesta data.

A migração não foi apenas troca de provedor: envolveu recriar schema, RLS,
triggers, helpers (`get_user_empresas`, `enforce_desligamento_hash`,
`fn_workflow_admissao_auto`) e todos os hooks de acesso a dados no
front-end. Cada módulo foi testado individualmente para confirmar:

- tabelas corretamente mapeadas para os services TypeScript
  (admissões, onboarding, desligamentos, ciclos de avaliação, benefícios,
  afastamentos, folha, webhooks, etc.);
- políticas RLS deixando passar os registros esperados para o usuário
  autenticado `ti@promobrindes.com.br`;
- triggers de negócio disparando (criação automática de workflow por
  admissão, hash de integridade em desligamentos homologados, propagação
  de tarefas de onboarding a partir do template);
- UI consumindo os dados sem listar vazio indevidamente.

### Bug fix — `useGenericCrud.enabled` quebrado em hooks tenant-scoped

Sintoma: páginas de listagem mostravam "Nenhum registro encontrado" e a aba
Network do DevTools (filtro `external-db-bridge`) tinha zero requests —
o React Query não disparava.

Causa raiz: `useGenericCrud.enabled` avalia
`alwaysEnabled || hasMeaningfulFilters(filters) || !!empresaId`,
mas `hasMeaningfulFilters()` ignora chaves `empresa_id`/`empresaId` dentro de
`filters`. Hooks que passavam só `filters: { empresa_id: empresaId }` (sem o
parâmetro dedicado `empresaId`) ficavam com `enabled: false`.

Hooks corrigidos:
- `src/hooks/useDesligamentos.ts`
- `src/hooks/useBeneficios.ts`
- `src/hooks/useWebhooksAvancados.ts`

Padrão aplicado em todos:
```ts
filters: empresaId ? { empresa_id: empresaId } : {},
empresaId: empresaId ?? undefined,
```

Cada arquivo recebeu comentário `// IMPORTANTE:` acima da chamada explicando
o porquê do duplo parâmetro.

Validação no browser:
- `/desligamentos` → 2 desligamentos listados (Bruno + Felipe)
- `/beneficios` → 8 benefícios ativos com adesões e custos

### Banco — migrations SQL

Novas migrations em `supabase/migrations/`:

- `20260730000000_seed_admissao_onboarding_desligamento_avaliacao.sql` — seed
  de dados placeholder explícito (8 admissões, 2 desligamentos, 2 ciclos,
  4 templates de onboarding, 6 colaboradores em onboarding, 27 tarefas, 1 workflow).
  Empresa alvo: `66104399-aba8-4105-bbd3-9bf67820c1d0` (TIME | PROMO BRINDES).
  Flag `metadata.placeholder: true` em todos os registros.
- `_wf_fix.sql` — adiciona colunas faltantes em `workflows_execucoes`
  (`workflow_id`, `entidade_id`, `entidade_tipo`, `status`, `etapa_atual`,
  `metadata`, `log_execucao`). Resolve FK violation ao inserir admissões.
- `_fix_digest.sql` — recria `enforce_desligamento_hash()` com cast explícito
  `digest(..., 'sha256'::text)`. Resolve `function digest(unknown, unknown)
  does not exist` no trigger de hash de integridade.

### Não-objetivos

- Não foi inicializado repositório git (o projeto não tinha `.git/`).
- Não foram criados testes para os hooks corrigidos.
- Não foram alteradas políticas RLS.

## [18.0.1] - 2026-07-23

### Infrastructure
- Dockerfile: Node 18 → 22 LTS
- nginx.conf: fix try_files + proxy vars
- Branch protection workflow
- CODEOWNERS atualizado
- .gitignore aprimorado
- .nvmrc: 20 → 22
- .env.example sanitizado (removeu keys reais)
- LICENSE: 2026 + AtomicaBR

### Security
- CodeQL scanning ativado (security.yml)
- Dependabot alerts configurado com grupos
- **Bridge ORDER BY validation**: `isSafeOrderColumn()` previne SQL injection
- **Bridge `.single()` support**: implementado no SELECT handler

### Dependencies (18 bumps)
- @playwright/test: 1.60.0 → 1.61.1
- vite: ^8.0.14 → ^8.1.4
- recharts: ^2.10.4 → ^3.9.2
- react-day-picker: ^9.6.0 → ^10.0.1
- @radix-ui/react-tabs: ^1.0.4 → ^1.1.14
- @radix-ui/react-avatar: 1.1.12
- react-hook-form: ^7.79.0
- dompurify: 3.4.7 → 3.4.12
- @types/node: ^26.1.1
- @sentry/react: 10.53.1 → 10.67.0
- framer-motion: 12.36.0 → 12.42.2
- tailwind-merge: ^2.2.1 → ^3.6.0
- uuid: 14.0.0 → 14.0.1
- globals: 17.6.0 → 17.7.0
- lovable-tagger: 1.3.0 → 1.3.3
- vite-imagetools: 10.0.0 → 10.0.1
- react/react-dom: 19.2.4 → 19.2.8
- vitest: ^1.2.2 → ^4.1.10

### Types
- **19 `any` removidos** (PR #49):
  - FinancialSummaryCards.tsx: 7 any → interfaces
  - PontoAdjustmentRequests.tsx: 12 any → interfaces

### CI/CD
- All Dependabot PRs resolved
- Stale PRs closed
- 0 open issues/PRs

## [21.0.0] - 2026-01-20
...(rest unchanged)