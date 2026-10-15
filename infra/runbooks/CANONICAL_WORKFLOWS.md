# Canonical Workflows — Runbook

> Última revisão: 15/10/2026

## Visão Geral

5 workflows operam diretamente contra o banco de dados canônico de produção
(`frjbfeamybqsejlvmqbl`). Os três workflows com acesso direto ao PostgreSQL
compartilham o grupo de concorrência `canonical-database`
(cancel-in-progress: false) — só um roda por vez, evitando colisões de DDL
e probes simultâneas contra o mesmo banco.

| Workflow                       | Trigger           | Acesso                | Concorrência               |
| ------------------------------ | ----------------- | --------------------- | -------------------------- |
| `canonical-migrations.yml`     | workflow_dispatch | postgres (migrations) | `canonical-database`       |
| `canonical-probes.yml`         | workflow_dispatch | postgres (read-only)  | `canonical-database`       |
| `canonical-sql-diag.yml`       | workflow_dispatch | postgres (read-only)  | `canonical-database`       |
| `canonical-edge-functions.yml` | workflow_dispatch | Supabase Edge Runtime | `canonical-edge-functions` |

---

## Pré-requisitos

- Secret `SUPABASE_DB_URL` configurado no environment `production`
  (URL administrativa do Postgres canônico, role `postgres`).
- Secret `SUPABASE_ACCESS_TOKEN` configurado no environment `production`
  (usado pelo `canonical-edge-functions.yml`).
- Reviewer obrigatório no environment `production`
  (W26 — a configurar via API; ver `infra/github/`).
- `confirm_project_ref = frjbfeamybqsejlvmqbl` obrigatório em todas as execuções
  como defesa contra alvo acidental.

---

## canonical-migrations.yml

Aplica migrações no banco canônico. **NUNCA rodar sem validação prévia.**

**Modos:**

- `validate` (default): simula o SQL em transação com ROLLBACK — sem efeito real.
- `apply`: aplica migrações e registra no ledger `supabase_migrations.schema_migrations`
  — **irreversível**. Só pode ser disparado a partir da branch `main`.

**Uso:**

1. Actions → "Canonical database — scoped migrations" → Run workflow
2. Preencher `confirm_project_ref` = `frjbfeamybqsejlvmqbl`
3. Escolher modo: `validate` primeiro, `apply` depois
4. Verificar logs — qualquer erro aborta com `ON_ERROR_STOP=1`

**Critério de sucesso (apply):** log termina com `CANONICAL_SCOPED_MIGRATIONS_OK`.

```bash
# Dry-run via CLI
gh workflow run canonical-migrations.yml \
  -f mode=validate \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl

# Apply (requer aprovação no environment production)
gh workflow run canonical-migrations.yml \
  -f mode=apply \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

**Atualizar a lista de migrações:** edite o loop no step "Preparar somente as
migrações aprovadas". Cada dispatch cobre **somente** as migrações novas do lote —
não re-liste versões já registradas no ledger, pois `CREATE POLICY` não é
idempotente e causará `policy already exists`.

---

## canonical-probes.yml

Roda probes de segurança RV-01/02/03/04 em transações READ ONLY com ROLLBACK.
Nenhuma escrita é possível.

**O que verifica:**

| Probe    | Invariante                                                    | Saída esperada   |
| -------- | ------------------------------------------------------------- | ---------------- |
| `rv01`   | `user_empresa_id()` ignora `user_metadata` forjado            | `NULL`           |
| `rv02`   | `medidas_ciencia_tokens` sem ACL/policy exposta               | `t`              |
| `rv03`   | Zero policies permissivas (`USING true`) nas tabelas críticas | `0`              |
| `rv04`   | RPCs de vínculo/autorização existem                           | `t`              |
| `views`  | Views de PII ilegíveis para `anon`                            | `t`              |
| `ledger` | Contagem de migrações no ledger (informativo)                 | qualquer inteiro |

**Critério de sucesso:** log termina com `CANONICAL_PROBES_OK`.

```bash
gh workflow run canonical-probes.yml \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

**Teste local:**

```bash
SUPABASE_DB_URL="postgresql://..." node scripts/probes/run-probes.mjs
```

---

## canonical-sql-diag.yml

Diagnóstico SQL: roda UMA instrução `SELECT`/`WITH`/`EXPLAIN`/`SHOW` em transação
READ ONLY com ROLLBACK. Sem escrita possível — o runner valida a instrução antes de
enviá-la e o banco rejeita qualquer DML/DDL dentro da transação somente-leitura.

**Uso:**

1. Actions → "Canonical database — read-only SQL diagnostic" → Run workflow
2. Preencher `confirm_project_ref` = `frjbfeamybqsejlvmqbl`
3. Preencher `query` com a instrução (apenas `SELECT`, `WITH`, `EXPLAIN`, `SHOW`)

```bash
gh workflow run canonical-sql-diag.yml \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl \
  -f query="SELECT count(*) FROM public.colaboradores"
```

---

## canonical-edge-functions.yml

Deploy de Edge Functions (Deno) no projeto canônico.
Requer `SUPABASE_ACCESS_TOKEN` no environment `production`.

**Fluxo:**

1. `deno check` bloqueante em todos os `index.ts` (gate de tipo).
2. `supabase functions deploy --use-api --jobs 4` (sem `--prune` — não remove funções remotas não classificadas).
3. Verifica que todos os slugs locais aparecem no inventário remoto.

**Critério de sucesso:** log termina com `CANONICAL_EDGE_DEPLOY_OK local=N remote=M` (N ≤ M).

```bash
gh workflow run canonical-edge-functions.yml \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

---

## Segurança

- Os YAML dos workflows canônicos **NUNCA** mudam em lotes de migrations.
  Qualquer alteração nos workflows canônicos requer PR aprovado por humano.
- Reviewer obrigatório no environment `production` (W26 — a configurar via API).
- `SUPABASE_DB_URL` (admin): migrar para environment `production` exclusivo (W25 — pendente).
- O gate `scripts/tests/workflows-contract.test.mjs` valida invariantes de todos
  os workflows (SHA pins, timeout-minutes, permissions, concurrency) e roda no
  job `security-config` do `ci.yml` em cada PR.

---

## Diagnóstico de falhas comuns

| Sintoma                                                    | Causa provável                         | Ação                                                     |
| ---------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `Project ref de confirmação não corresponde ao canônico`   | Input digitado errado                  | Re-dispatch com `frjbfeamybqsejlvmqbl`                   |
| `SUPABASE_DB_URL ausente`                                  | Secret não configurado em `production` | Settings → Environments → production → Add secret        |
| `SUPABASE_ACCESS_TOKEN ausente`                            | Idem                                   | Idem                                                     |
| `policy already exists` no apply                           | Migração já registrada re-listada      | Remover da lista fechada do step "Preparar"              |
| `canonical migration prerequisites missing (N/16)`         | Schema divergiu do esperado            | Auditar via `canonical-probes.yml`; ver `BREAK_GLASS.md` |
| `mode=apply só pode ser disparado a partir da branch main` | Dispatch de branch de feature          | Mergear para main e re-disparar                          |
| `Edge Function $slug falhou no deno check`                 | Erro de tipo em `index.ts`             | Corrigir localmente, push, re-dispatch                   |
| `SUPABASE_DB_URL ausente` (db-integrity em PR de fork)     | PR externo sem acesso a secrets        | Normal — job tem guard `if:` para isso                   |

---

## Rotação de segredos

| Secret                  | Onde fica                | Rotacionar em                                             |
| ----------------------- | ------------------------ | --------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Environment `production` | Comprometimento confirmado ou saída de acesso do operador |
| `SUPABASE_DB_URL`       | Repository secret        | Comprometimento confirmado; ver `ROTACAO_SEGREDOS.md`     |

Ao rotacionar `SUPABASE_DB_URL`, verificar também: `canonical-migrations.yml`,
`ci.yml` (job `db-integrity`).

---

_Última atualização: 15/10/2026 — W79 (Claude Code)_
