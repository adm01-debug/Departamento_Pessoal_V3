# Registro E-057 — Grants revogados e justificativas

> Documento vivo. Toda revogação de privilégio (tabela, view, função, bucket)
> entra aqui com justificativa e migration correspondente. Restaurar um grant
> exige PR citando este registro + prova de ausência de PII.

## 1. Views — `SELECT` de `anon` revogado (P0, A-002)

**Justificativa:** 42 views com owner `postgres` (que tem `BYPASSRLS`) eram
legíveis pela role `anon` — exposição de CPF, e-mail, trilhas de auditoria e
dados bancários sem autenticação.

**Migrations:** batch de revoke + `security_invoker = true` (repo, 23–28/07 e
19/07 — ver `supabase/migrations/*rls*` e `*security*`) — aplicação em prod
governada pelo runbook `PROMOCAO_BANCO_PRODUCAO.md` §3 lote B1.

**Exceção documentada:** `v_system_health` — probe público de saúde, sem PII
(verificar conteúdo a cada mudança da view).

## 2. Funções SECURITY DEFINER — `EXECUTE` de `anon`/`PUBLIC` revogado

**Justificativa:** definer atravessa RLS; função executável por anon com
parâmetro de identificador é IDOR direto (A-003).

| Função | Grant final | Migration |
|---|---|---|
| `log_audit_event`, `process_audit_log`, triggers de auditoria | `service_role` | 20260619150614 / 20260716175930 / 20260712213908 |
| `grant_admin_by_cpf` | revogado de anon/authenticated | batch RLS 28/07 |
| `export_user_data`, `handle_privacy_request` | `service_role` (+ advisory lock, E-015) | batch RLS 28/07 |
| `check_tenant_isolation`, `calcular_hash_etapa`, `get_client_ip`, `set_updated_at` | `service_role` ou authenticated conforme uso | `20260807000000_p0_006_search_path_public` |
| `get_my_permissions`, `get_user_tenants` | `authenticated` apenas, definer com search_path fixo | `20260830000003_plano100_e012_*` |
| `fn_alert_pii_access_anomaly`, `purge_pii_access_logs` | `service_role` apenas | `20260830000002_plano100_e036_*` |
| `storage_path_empresa_id` | `authenticated` | `20260830000001_plano100_e028_*` |

## 3. Policies `USING (true)` substituídas (P0, A-004)

**Justificativa:** 55 policies com `qual = 'true'` liam/escreviam sem predicado.
Substituídas por tenant-scoped (`empresa_id IN get_user_empresas(auth.uid())`)
+ papel no caminho de escrita em tabelas sensíveis.

**Migrations:** `20260809000000_p0_001_rls_batch1_core_rh`,
`20260810000000_p0_001_rls_batch2_ponto_ferias`, `…batch3/4`,
`20260813000000_p0_001_rls_batch5_final`, `20260804000000_p0_010_write_policies_provisoes`.

**Exceções documentadas (catálogos públicos de referência):** `cid10`,
`paises`, `generos` — sem PII, leitura pública intencional.

## 4. Buckets de Storage

| Bucket | Estado final | Justificativa |
|---|---|---|
| `documentos-admissao` | **privado** (era público) | contém RG/CPF digitalizados |
| `ponto-biometria` | **privado** (era público) | biometria = dado sensível (LGPD art. 11) |
| `comprovantes-despesas`, `contabilidade-anexos`, `relatorios-privados`, `sst-programas` | **privados, criados** | E-028; policies tenant por pasta `<empresa_id>/` |
| `avatars` | público (exceção) | fotos de perfil exibidas sem URL assinada; sem documento/PII além da foto |

## 5. Regra permanente

- `anon` não lê nada fora da allowlist explícita deste documento.
- Toda função `SECURITY DEFINER` nasce com `REVOKE … FROM PUBLIC/anon` na
  mesma migration (gate `audit-secdef-authz` no CI reprova quem esquecer).
