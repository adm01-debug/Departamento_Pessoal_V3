# Runbook E-026 — Promoção de migrations para produção

> **Contexto:** a auditoria (16/08/2026, `ESTADO_ATUAL.md`) comprovou drift total:
> ~641 arquivos em `supabase/migrations/`, mas apenas 30 versões registradas em
> `supabase_migrations.schema_migrations` — **interseção zero** com o repo.
> Correções P0 (revoke de `anon` nas 42 views, `security_invoker`, policies
> tenant-scoped, `search_path` em SECURITY DEFINER) **existem no repo e nunca
> foram aplicadas**. Este runbook é o caminho seguro para promovê-las.

## 0. Princípios

1. **Preview primeiro**: toda migration roda antes em projeto staging/preview.
2. **Expand-contract**: nenhuma mudança destrutiva direta; renomear/remover só
   após janela de compatibilidade.
3. **Fail-loud, não fail-open**: se uma migration falha, parar. Nunca "forçar".
4. **Uma janela, um responsável**: promoção é operação assistida, com log.

## 1. Pré-requisitos

- [ ] Backup/snapshot do banco confirmado (ver E-067 — PITR) **antes** de começar.
- [ ] Acesso `service_role` ou `postgres` ao projeto **frjbfeamybqsejlvmqbl**
      (verificar: `supabase/config.toml` → `project_id`; corrigido em 30/08/2026).
- [ ] `supabase` CLI ≥ 2.x instalada e autenticada (`supabase login`).
- [ ] Janela de manutenção comunicada (mudanças de policy/grant podem cortar
      acessos indevidos que hoje "funcionam" por acidente).

## 2. Baseline — reconciliar o ledger (uma vez só)

O ledger vivo (`schema_migrations`) não corresponde ao repo. Decisão tomada:
**adotar o repo como fonte da verdade, marcando o estado vivo como baseline.**

```bash
# 1. Gerar dump do schema vivo (segurança + referência)
supabase db dump --db-url "$SUPABASE_DB_URL" -f backups/pre_baseline_$(date +%F).sql

# 2. Marcar como aplicadas (sem executar) todas as migrations até o ponto de
#    corte validado em staging:
supabase migration repair --status applied <versão>   # por versão, ou:
supabase migration repair --status reverted <versão>  # para as que quebram replay
```

> ⚠️ Migrations conhecidas por quebrar em replay (ver `docs/auditoria/estado/09`):
> `20260818000000_p2_037_deprecate_legacy_tables.sql` (renomeia tabelas que
> nunca existiram em prod). Marcar como `reverted` para tirá-la do caminho.

## 3. Ordem de aplicação (lotes, com verificação entre eles)

| Lote | Migrations | Verificação obrigatória |
|---|---|---|
| **B1 — Views P0** | revoke `anon` + `security_invoker` nas 42 views | query §5.1 → 0 indevidas |
| **B2 — Policies P0** | batches `p0_001_rls_*` (core RH, ponto/férias, fiscal, final) | `audit-rls-tenant-open` e `audit-rls-pii` verdes |
| **B3 — Funções P0** | `p0_006_search_path_public`, revokes de EXECUTE de definer | `audit-secdef-authz` verde |
| **B4 — Storage** | `20260830000001_plano100_e028_*` (buckets privados + policies) | §5.4 |
| **B5 — Observab./LGPD** | `20260830000002_plano100_e036_*` (pii_access_logs) | §5.5 |
| **B6 — Helpers** | `20260830000003_plano100_e012_*` (get_my_permissions/tenants) | §5.6 |
| **B7 — Crons** | jobs `lgpd-*`, `purge-*`, `refresh-*` | `cron.job` contém os nomes |

```bash
supabase db push --db-url "$SUPABASE_DB_URL"   # aplica o que falta, em ordem
```

## 4. Critérios de rollback

Rollback = **restaurar snapshot** (nunca "desfazer na mão" sob pressão):
- qualquer verificação do §5 falha e não é explicada em 15 min;
- erro 500/403 em massa no frontend logo após o lote;
- perda de acesso legítimo reportada por ≥1 tenant.

## 5. Verificações pós-promoção

### 5.1 Views expostas a anon (alvo: 0, exceto allowlist documentada)
```sql
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
  AND has_table_privilege('anon', c.oid, 'SELECT')
  AND c.relname <> 'v_system_health';
```

### 5.2 Views sem security_invoker (alvo: 0)
```sql
SELECT c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
  AND NOT COALESCE((c.reloptions)::text ILIKE '%security_invoker=true%', false);
```

### 5.3 Policies `USING (true)` fora da allowlist de referência (alvo: 0)
```sql
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND qual = 'true'
  AND tablename NOT IN ('cid10','paises','generos'); -- catálogos públicos
```

### 5.4 Buckets (alvo: 13 privados + avatars público)
```sql
SELECT id, public FROM storage.buckets ORDER BY id;
-- documentos-admissao e ponto-biometria DEVEM estar public = false
```

### 5.5 Trilha PII
```sql
SELECT to_regclass('public.pii_access_logs');  -- not null
SELECT has_table_privilege('anon','public.pii_access_logs','SELECT'); -- false
```

### 5.6 Helpers E-012
```sql
SELECT prosecdef, proconfig FROM pg_proc
WHERE proname IN ('get_my_permissions','get_user_tenants');
-- prosecdef = true e search_path fixado
```

### 5.7 Smoke funcional
- [ ] Login + MFA em produção
- [ ] Listagem de colaboradores (tenant A não vê tenant B)
- [ ] Registro de ponto (PontoPage)
- [ ] Bridge: write sem JWT retorna 401; RPC fora do allowlist retorna 403

## 6. Registro

Anexar ao PR de promoção: saída das queries §5 (antes/depois), duração,
responsável, e link para o snapshot usado como ponto de rollback.
