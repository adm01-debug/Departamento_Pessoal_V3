# Banco de dados — referência para agentes

Ler quando for rodar SQL, criar/aplicar migration, mexer em RLS, testar tela que escreve ou auditar o ledger.
Resumo das regras na seção 5 do `AGENTS.md`; aqui está o detalhe. Errar o banco já causou retrabalho real
(lote de julho/2026: 30 versões no ledger sem o DDL ter rodado — `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md`).

## Onde se trabalha

| Situação | Banco | Como |
|---|---|---|
| Diagnóstico | **produção, só leitura** | `canonical-sql-diag.yml` (`workflow_dispatch`, read-only); nunca escrita para "testar" |
| Migration nova | arquivo em `supabase/migrations/` | PR → `validate` → merge na `main` → `apply` → `verify` (abaixo) |
| Teste de comportamento de banco | **Postgres descartável** | `npm run test:migrations*` (`scripts/tests/migrations-*.sh`, contêiner efêmero); nunca no canônico |
| Migration destrutiva, segredos, rotação de chaves | **só com o dono** | `infra/runbooks/ROTACAO_SEGREDOS.md`, `BREAK_GLASS.md` |

**Não existe desvio para banco local.** `src/integrations/supabase/client.ts:11-12` exige
`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` e usa exatamente o que estiver no `.env`; o
`VITE_SUPABASE_FUNCTIONS_BASE=/functions/v1` só faz as chamadas de edge passarem pelo proxy do Vite. Se o `.env`
aponta para o projeto canônico, **o `npm run dev` e o E2E escrevem em produção** — confira antes de testar tela
que grava.

## Banco CANÔNICO

`frjbfeamybqsejlvmqbl` — `project_id` em `supabase/config.toml:3` (corrigido em 30/08/2026; antes apontava para
o projeto errado). É o alvo de `canonical-migrations.yml` (`CANONICAL_REF`), `canonical-edge-functions.yml`,
`canonical-probes.yml` e `canonical-sql-diag.yml`.

### Bancos que NÃO são deste projeto (não escrever neles)

A sessão costuma carregar MCPs de Supabase de outros produtos do dono (Zapp Web V2, Gestão de Clientes, Gestão de
Produtos). Nome parecido, banco diferente: antes de qualquer escrita confira o ref do projeto contra
`supabase/config.toml`. Para este repo, escrita em banco **só** pelos workflows canônicos.

## Regras de migration

1. **Ledger não prova DDL aplicado.** `supabase_migrations.schema_migrations` registra que a versão foi
   *marcada* como aplicada, não que o efeito existe no schema vivo. Toda aplicação exige **duas provas**: entrada
   no ledger **e** verificação do efeito (policy existe/sumiu, grant revogado, `search_path` setado).
2. **Canal único:** `canonical-migrations.yml` por `workflow_dispatch`, environment `production`. Nunca `psql`
   nem MCP direto contra produção fora desse workflow.
3. **Prova de intenção:** o input `confirm_project_ref` exige digitar `frjbfeamybqsejlvmqbl` por extenso.
4. **`apply` e `verify` só da `main`** (gate de branch no workflow): DDL em produção só parte de código mergeado —
   sidecar de branch aberta poderia desligar `default_transaction_read_only` e escrever no canônico.
5. **Escopo fechado:** editar o step "Preparar somente as migrações aprovadas" **substituindo** a lista pelo lote
   atual. Acumular reaplica `CREATE POLICY` não-idempotente e quebra com "policy already exists".
6. **`mode: validate` primeiro, sempre:** roda o lote dentro de `BEGIN … ROLLBACK` contra o banco real; corrigir e
   revalidar até `CANONICAL_MIGRATION_DRY_RUN_OK`.
7. **`mode: apply`:** mesma lista validada em `BEGIN … COMMIT`, com `INSERT … ON CONFLICT DO NOTHING` no ledger.
8. **Verificação é parte do workflow:** o step "Verificar objetos e ledger" consulta o catálogo (`pg_policies`,
   `has_function_privilege`…) e falha o job se o efeito não bater, mesmo com o `COMMIT` feito. Cada lote novo edita
   essa query; padrão em `20260924192541_p1_registros_ponto_role_policy.sql`.
9. **Sidecar `.verify.sql`:** toda migration que promete efeito verificável ganha
   `<versao>_<nome>.verify.sql` ao lado; `mode: verify` roda os sidecars da lista passada em `migration_files`.
10. **Falhou depois do `COMMIT`:** não "consertar" com outra migration no impulso — seguir
    `infra/runbooks/MIGRATIONS.md` ("O que fazer quando a verificação falhar depois do `COMMIT`") e
    `ROLLBACK_SCHEMA.md`.

Checklist de PR que toca `supabase/migrations/`: `infra/runbooks/MIGRATIONS.md`.

## RLS e isolamento por empresa

Tabela ou coluna nova: RLS **ligada** e policies por `empresa_id` — o isolamento multiempresa é feito na policy, não
no front. O gateway `external-db-bridge` também escopa por `empresa_id`, mas não substitui a policy.

Quem cobra isso no CI (`ci.yml`, job "Integridade do banco canônico (live)"): `scripts/audit-rls-pii.mjs`
(regressão de RLS sobre PII), `audit-rls-least-privilege.mjs` (papel no caminho de escrita) e
`audit-rls-tenant-open.mjs` (política permissiva irrestrita em tabela multi-tenant). Mais: "P0 database migration
simulations" (3 shards) e "RLS live (pós-merge, não bloqueante)".

## Edge Functions

- Deploy só por `canonical-edge-functions.yml`: push na `main` quando `supabase/functions/**` ou `config.toml`
  mudam, PR roda apenas dry-run (`deno check` + diff, sem segredos), `workflow_dispatch` exige
  `confirm_project_ref`. Nunca `supabase functions deploy` na mão.
- `verify_jwt` é **deny-by-default**: função não listada em `supabase/config.toml` exige JWT. `verify_jwt = false`
  só para endpoint deliberadamente público e com justificativa escrita no próprio `config.toml` (hoje 8 funções) —
  cada uma com controle próprio (CORS allowlist, rate limit, CSRF).
- Gateway `external-db-bridge`: POST-only, JWT nos writes, CSRF fail-closed, rate limit, denylist de tabelas e
  allowlist de RPC. Detalhe e runbook de desempenho em `docs/agentes/arquitetura.md` e
  `infra/runbooks/BRIDGE_PERFORMANCE.md`.

## Runbooks de banco (`infra/runbooks/`)

`MIGRATIONS.md` (processo auditável) · `RECONCILIACAO_DRIFT_MIGRATIONS.md` (drift de julho/2026) ·
`PROMOCAO_BANCO_PRODUCAO.md` · `ROLLBACK_SCHEMA.md` · `GRANTS_REVOGADOS.md` · `READ_REPLICA.md` ·
`PGBOUNCER_CONFIG.md` · `ROTACAO_SEGREDOS.md` · `BREAK_GLASS.md` · `RESPOSTA_INCIDENTES.md`.
Estado real do schema (tabelas, policies, edges): `inventario/estado/banco.json` e `docs/contexto/` na branch
`contexto` — gerados; se divergirem do código, o gerado vence e o divergente se regenera.
