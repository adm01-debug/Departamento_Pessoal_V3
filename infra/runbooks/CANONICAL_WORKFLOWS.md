# Runbook — Workflows Canônicos

> Audiência: engenheiro de plantão, arquiteto de segurança  
> Escopo: workflows `canonical-*` e `db-tests.yml` que tocam o projeto Supabase canônico (`frjbfeamybqsejlvmqbl`)

---

## 1. Mapa dos workflows

| Workflow | Gatilho | Alvo | Impacto em produção |
|----------|---------|------|---------------------|
| `canonical-edge-functions.yml` | `workflow_dispatch` (confirm ref) | Supabase Cloud — deploy de Edge Functions | **SIM** — substitui código em produção |
| `canonical-migrations.yml` | `workflow_dispatch` (mode: validate\|apply) | Supabase Cloud — DDL direto no banco canônico | **SIM (apply)** / não (validate) |
| `canonical-probes.yml` | `workflow_dispatch` | Supabase Cloud — probes de segurança read-only | não |
| `db-tests.yml` | push/PR em paths `supabase/migrations/2026*_plano100_*.sql` | PostgreSQL descartável (Docker) | não |

---

## 2. Pré-condições para dispatch manual

### Ambos os workflows canônicos exigem:
1. **`SUPABASE_ACCESS_TOKEN`** — secret no environment `production` (não em repository secrets).  
2. **`confirm_project_ref`** — o operador digita `frjbfeamybqsejlvmqbl` no campo do `workflow_dispatch` para evitar alvo acidental.  
3. Execução no environment **`production`** — requer aprovação de um reviewer configurado em Settings → Environments → production.

### `canonical-migrations.yml` também exige:
- **`SUPABASE_DB_URL`** — secret de repository (URL administrativa do Postgres canônico, com role `postgres`).
- `mode = validate` para dry-run (ROLLBACK automático); `mode = apply` para efetivar.

---

## 3. Como disparar `canonical-edge-functions.yml`

```bash
# Via GitHub CLI
gh workflow run canonical-edge-functions.yml \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

O workflow:
1. Faz `deno check` em todos os `index.ts` (gate bloqueante).  
2. Executa `supabase functions deploy --use-api --jobs 4` (sem `--prune`).  
3. Confirma que todos os slugs locais aparecem no inventário remoto.

**Critério de sucesso:** log termina com `CANONICAL_EDGE_DEPLOY_OK local=N remote=M` onde `N ≤ M`.

---

## 4. Como disparar `canonical-migrations.yml`

### Dry-run (sempre antes do apply):
```bash
gh workflow run canonical-migrations.yml \
  -f mode=validate \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

### Apply (requer APROVADO explícito do responsável):
```bash
gh workflow run canonical-migrations.yml \
  -f mode=apply \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

**Critério de sucesso (apply):** log termina com `CANONICAL_SCOPED_MIGRATIONS_OK`.

> ⚠️ **Nunca** pule o `validate` antes do `apply`. O workflow não impede, mas o dry-run revelará conflitos sem custo de rollback manual.

---

## 5. Atualizar a lista de migrações em `canonical-migrations.yml`

A lista de migrações está no step **"Preparar somente as migrações aprovadas"** (`stage_dir` loop). Regra:

- Cada dispatch cobre **somente** as migrações novas daquele lote.  
- Migrações já registradas no ledger (`supabase_migrations.schema_migrations`) **não** devem ser re-listadas — `CREATE POLICY` não é idempotente e causará falha.  
- Após merge do PR com as migrações, atualize a lista fechada e execute o validate/apply em sequência.

---

## 6. Rotação de segredos

| Secret | Onde fica | Rotacionar em |
|--------|-----------|---------------|
| `SUPABASE_ACCESS_TOKEN` | Environment `production` | Comprometimento confirmado ou saída de acesso do operador |
| `SUPABASE_DB_URL` | Repository secret | Comprometimento confirmado; ver `ROTACAO_SEGREDOS.md` |

Ao rotacionar o `SUPABASE_DB_URL`, verifique também os workflows que o consomem:  
`canonical-migrations.yml`, `ci.yml` (job `db-integrity`).

---

## 7. Diagnóstico de falhas comuns

| Sintoma | Causa provável | Ação |
|---------|---------------|------|
| `Project ref de confirmação não corresponde ao canônico` | Digitou o ref errado no input | Re-dispatch com `frjbfeamybqsejlvmqbl` |
| `SUPABASE_ACCESS_TOKEN ausente` | Secret não configurado no environment `production` | Settings → Environments → production → Add secret |
| `Edge Function $slug falhou no deno check` | Erro de tipo em `index.ts` | Corrigir localmente, push, re-dispatch |
| `canonical migration prerequisites missing (N/16)` | Schema do canônico divergiu do esperado | Auditar via `canonical-probes.yml`; ver `BREAK_GLASS.md` |
| `policy already exists` no apply | Migração já registrada foi re-listada | Remover da lista fechada do step "Preparar" |
| `SUPABASE_DB_URL ausente` (db-integrity em PR) | PR de fork ou Dependabot | Normal — job tem guard `if:` para isso |

---

## 8. Contratos e gates

O workflow `db-tests.yml` (PostgreSQL descartável) valida as migrações do PLANO_100 via `scripts/tests/migrations-plano100.sh`. Ele **não** toca o banco canônico — é seguro rodar a qualquer momento.

O gate de contrato `scripts/tests/workflows-contract.test.mjs` valida invariantes de todos os workflows (SHA pins, timeout-minutes, permissions, concurrency) e roda no job `security-config` do `ci.yml` em cada PR.

---

*Criado por Claude Code — 27/09/2026*
