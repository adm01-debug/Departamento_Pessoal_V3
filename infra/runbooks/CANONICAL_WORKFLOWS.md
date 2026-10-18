# Canonical Workflows — Runbook

> Última revisão: 18/10/2026

## Visão Geral

5 workflows operam diretamente contra o banco de dados canônico de produção
(`frjbfeamybqsejlvmqbl`). Os três workflows com acesso direto ao PostgreSQL
compartilham o grupo de concorrência `canonical-database`
(cancel-in-progress: false) — só um roda por vez, evitando colisões de DDL
e probes simultâneas contra o mesmo banco.

| Workflow                       | Trigger              | Acesso                | Concorrência               |
| ------------------------------ | -------------------- | --------------------- | -------------------------- |
| `canonical-migrations.yml`     | workflow_dispatch    | postgres (migrations) | `canonical-database`       |
| `canonical-probes.yml`         | schedule/dispatch    | postgres (read-only)  | `canonical-database`       |
| `canonical-sql-diag.yml`       | workflow_dispatch    | postgres (read-only)  | `canonical-database`       |
| `canonical-edge-functions.yml` | push main / dispatch | Supabase Edge Runtime | `canonical-edge-functions` |
| `ruleset-sync.yml`             | schedule/dispatch    | GitHub API (read)     | —                          |

> **Regra de ouro:** o YAML dos workflows canônicos **NUNCA** muda em lotes de migrations. Qualquer alteração nesses workflows requer PR aprovado por humano, separado do lote de SQL.
>
> **Reviewer obrigatório:** o environment `production` ainda não tem reviewer obrigatório (W26 — pendente de configuração via API). Até W26 ser aplicado, o gate é o PR + required checks.

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

### Modos (W67–W70)

- `validate` (default): simula o SQL em transação com ROLLBACK — sem efeito real. Gera hash `validated_hash` no output do step.
- `apply`: aplica as migrações listadas em `migration_files` e registra no ledger `supabase_migrations.schema_migrations` — **irreversível**. Requer `validated_hash` do validate anterior. Só pode ser disparado a partir da branch `main`.
- `verify`: executa os sidecars `.verify.sql` correspondentes — valida invariantes pós-apply. Só pode ser disparado a partir da branch `main`.

### Ledger dinâmico (W67/W69)

O workflow deriva a lista de migrações automaticamente do diretório `supabase/migrations/`:

- Não existe mais uma lista hardcoded no YAML.
- Use o input `migration_files` para restringir a um subconjunto (um por linha, sem path).
- O step verifica que todas as versões listadas estão no ledger antes de executar sidecars.

### Sidecars `.verify.sql` (W69)

Para cada migração `20XXXXXX_nome.sql`, pode existir um `20XXXXXX_nome.verify.sql`.
Se presente, o workflow o executa via `psql` após o apply e exige literalmente `ok` na saída (não só exit 0). Sidecars com saída vazia são rejeitados.

### Uso

```bash
# 1. Validar (obtenha validated_hash no log)
gh workflow run canonical-migrations.yml \
  -f mode=validate \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl \
  -f migration_files="20261013152000_nome.sql"

# 2. Apply (requer validated_hash do step anterior)
gh workflow run canonical-migrations.yml \
  -f mode=apply \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl \
  -f migration_files="20261013152000_nome.sql" \
  -f validated_hash="<hash do validate>"

# 3. Verify (pós-apply, valida sidecars)
gh workflow run canonical-migrations.yml \
  -f mode=verify \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl \
  -f migration_files="20261013152000_nome.sql"
```

**Critérios de sucesso:** `CANONICAL_LEDGER_OK`, `CANONICAL_SCHEMA_INVARIANTS_OK`, `CANONICAL_SCOPED_MIGRATIONS_OK`.

> Cada dispatch cobre **somente** as migrações novas do lote. Não re-liste versões já registradas no ledger — `CREATE POLICY` não é idempotente.

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

Deploy de Edge Functions (Deno) no projeto canônico. Ativado por push em `main`
quando `supabase/functions/**` ou `supabase/config.toml` mudam, ou por dispatch manual.

### Fluxo (W75–W76)

1. **Gate de tipo**: `deno check` bloqueante em todos os `index.ts` alterados (diff incremental em PR, todos em push/dispatch).
2. **Dry-run em PR**: apenas `deno check` + diff de inventário (sem deploy real).
3. **Deploy incremental em push/dispatch**: só as funções cujo `index.ts` mudou (intersecção FN_DIFF × ALL_SLUGS). Slugs removidos/renomeados não abortam o deploy.
4. **Smoke pós-deploy**: `curl` básico em cada slug deployado; falha ativa rollback.
5. **Inventário**: verifica que todos os slugs locais aparecem no inventário remoto.

```bash
gh workflow run canonical-edge-functions.yml \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

**Critério de sucesso:** log termina com `CANONICAL_EDGE_DEPLOY_OK local=N remote=M` (N ≤ M).

---

## ruleset-sync.yml

Compara o ruleset vivo (`21934736`) com o baseline `infra/github/ruleset-main.json`.
Roda semanalmente e por dispatch. Falha se houver divergência (check só no baseline ou só no live).

```bash
gh workflow run ruleset-sync.yml
```

**Critério de sucesso:** sem diff entre baseline e live; `audit-required-checks.mjs` imprime `RULESET_BASELINE_MATCH`.

---

## Segurança

> **Regra de ouro:** o YAML dos workflows canônicos **NUNCA** muda em lotes de migrations. Alterações nesses workflows requerem PR aprovado por humano, separado do SQL.
>
> **Reviewer obrigatório:** W26 está pendente. Até sua configuração, o gate é PR + required checks no ruleset.

- `SUPABASE_DB_URL` (admin): migrar para environment `production` exclusivo (W25 — pendente; owner deve fazer manualmente).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`: migrados de secrets para vars em ci.yml/e2e.yml/healthcheck.yml (W29 — 18/10/2026). Owner deve apagar os secrets homônimos.
- O gate `scripts/tests/workflows-contract.test.mjs` valida invariantes de todos os workflows (SHA pins, timeout-minutes, permissions, concurrency) e roda em `security-config` a cada PR.

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

_Última atualização: 18/10/2026 — W79 revisado (Claude Code): ledger dinâmico W67-W70, sidecars W69, deploy incremental W75-W76, ruleset-sync, regras de segurança atualizadas._
