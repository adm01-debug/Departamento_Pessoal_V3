# Dados — Schema, Migrations e Drift

## 1. Cobertura

| Artefato | Volume | Como foi tratado |
|---|---|---|
| `supabase/migrations/` | 641 arquivos / 49.546 linhas | **Inventário por objeto** (extração automatizada de `CREATE TABLE/VIEW/MATERIALIZED VIEW/FUNCTION/TRIGGER/POLICY/INDEX/TYPE`, `DROP`, `ALTER`, `RENAME TO`, `cron.schedule`, `security_invoker`, `REVOKE ... FROM anon`) sobre 100% dos arquivos. Leitura integral apenas de 3 arquivos: `20260818000000_p2_037_deprecate_legacy_tables.sql`, `20260726110000_p2_037_consolidate_duplicates.sql` (parcial), `003_folha_ferias_ponto.sql` (trecho `ferias`) |
| `supabase/seeds/` | 10 arquivos / 8 linhas cada | **Lidos integralmente** |
| `supabase/config.toml` | 5 linhas | **Lido integralmente** |
| `supabase/tests/` | 2 arquivos | `migration_consistency.test.ts` lido no cabeçalho (60 linhas) |
| `src/integrations/supabase/types.ts` | 24.150 linhas (gerado) | **Declaração de objetos apenas** — extraídas as chaves de `Tables`/`Views`/`Functions`; nenhuma leitura linha a linha |
| Banco de produção | ref `frjbfeamybqsejlvmqbl` | **17 queries SELECT** ao catálogo (`pg_class`, `pg_proc`, `pg_policies`, `pg_indexes`, `pg_trigger`, `pg_depend`, `cron.job`, `supabase_migrations.schema_migrations`, `information_schema`). **Zero DDL/DML** |

Ferramenta usada: `mcp__SUPABASE_-_DEPARTAMENTO_PESSOAL_-_MCP__supabase_db_query`, somente `SELECT`.

---

## 2. Inventário medido — repo vs. banco

| Objeto | Declarado no repo (migrations) | Vivo em `public` | Δ |
|---|---|---|---|
| Tabelas (nomes distintos) | **399** (524 statements `CREATE TABLE`) | **359** (`relkind='r'`) + 1 particionada (`relkind='p'`) | 56 no repo/ausentes + 16 vivas/não criadas |
| Views | 55 (83 statements) | 43 | 17 ausentes + 5 vivas/não declaradas |
| **Materialized views** | **13** | **0** | **13 ausentes (100%)** |
| Funções (nomes distintos) | 362 (469 statements) | 290 próprias (+2 de extensão) | 109 ausentes + 37 vivas/não declaradas |
| Triggers | 301 statements | 398 | — |
| Policies | 1.568 `CREATE` / 1.954 `DROP` | 597 | — |
| Índices | 629 statements | 1.205 | — |
| Enums (`CREATE TYPE`) | 8 | 17 | — |
| Cron jobs (`cron.schedule`) | **17** (23 arquivos) | **6** | **interseção = 0** |
| Migrations registradas | 641 arquivos | **30** versões | **interseção = 0 arquivos** |

---

## 3. Tabela de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha / objeto) | O que falta |
|---|---|---|---|
| Controle de versão de schema (ledger de migrations) | `MORTO_OU_ABANDONADO` | `supabase_migrations.schema_migrations` = 30 versões (`20260721220000`, `20260723000001..000030`, falta `...000008`). Nenhum dos 30 prefixos existe como arquivo em `supabase/migrations/` (verificado 30/30) | O ledger não descreve o repo. 641/641 arquivos não rastreados |
| Vínculo repo → projeto Supabase | `MORTO_OU_ABANDONADO` | `supabase/config.toml:1` → `project_id = "ciziytrrjjotlsjzshnm"`; produção auditada é `frjbfeamybqsejlvmqbl` | O repo aponta para OUTRO projeto. `supabase link`/`db push` nunca operou sobre a prod auditada |
| Seeds de dados de referência | `SUGERIDO_OU_INICIADO` | `supabase/seeds/bancos_seed.sql:4-8` — `INSERT INTO bancos (id, created_at) VALUES (gen_random_uuid(), NOW()), …` (3 linhas vazias). Padrão idêntico nos 10 arquivos | Conteúdo é 100% placeholder (só PK + timestamp). 6/10 alvos (`bancos`, `cbos`, `cidades`, `cnaes`, `tabelas_inss`, `rubricas`) **não existem** no banco (`to_regclass` = null) |
| Subsistema `dp_*` (auditoria particionada, retenção, catálogo PII, MCP config) | `IMPLEMENTADO_TOTAL` (só em prod) | 15 tabelas + 5 views + 25 funções + 5 cron jobs vivos. `dp_audit_log_2026_07`=59 linhas, `dp_mcp_config`=39, `dp_backup_runbook`=24, `dp_data_catalog`=10 | **Zero rastro no repo**: `grep -rl 'dp_audit_log' supabase/migrations` = 0 arquivos; em `src/` = 0; em `supabase/functions/` = 0. Criado fora de banda |
| Módulo PCS (Plano de Cargos e Salários) | `SUGERIDO_OU_INICIADO` | `src/services/pcsService.ts:59` `.from('pcs_fatores')`, `:82` `pcs_avaliacoes_cargo`, `:119` `pcs_grades`, `:165` `pcs_pesquisa_salarial`; tipado em `src/types/pcs.ts:10-23`; criado em `20260728183134_95da6131-….sql` | **As 5 tabelas `pcs_*` não existem em produção.** Toda chamada do serviço retorna erro de relação inexistente |
| Materialized views de dashboard | `SUGERIDO_OU_INICIADO` | `20260724140000_p4_072_mv_dashboards.sql` e `20260817010000_p4_072_materialized_views_dashboards.sql` declaram 13 MVs (`mv_dashboard_headcount`, `mv_folha_summary`, `mv_passivo_trabalhista`, …); função `refresh_dashboard_mvs` existe viva | **0 materialized views em `public`** (`pg_class relkind='m'` = 0). O refresh roda sobre nada |
| Hardening de views (`security_invoker`) | `MORTO_OU_ABANDONADO` | Repo: 91 ocorrências de `security_invoker = true` em 24 arquivos de migration. Banco: **1 de 43 views** tem a opção | Nunca aplicado. Ver Achado #4 |
| Revogação de acesso `anon` | `MORTO_OU_ABANDONADO` | Repo: 37 arquivos com `REVOKE … FROM anon` (ex.: `REVOKE SELECT ON public.audit_log FROM anon`) | Banco: **359/359 tabelas e 43/43 views ainda concedem SELECT a `anon`** |
| Depreciação de tabelas legado (schema 003) | `MORTO_OU_ABANDONADO` | `20260818000000_p2_037_deprecate_legacy_tables.sql:26-79` renomeia `folha_pagamento`/`ponto_registros`/`ferias` → `*_legacy_003` | Nenhuma tabela `*_legacy_003` existe; `folha_pagamento` e `ponto_registros` **nunca existiram** em prod. A migration é código morto **e quebra em replay** (ver Achado #5) |
| Jobs agendados (LGPD, purge, refresh) | `MORTO_OU_ABANDONADO` | Repo declara 17 `cron.schedule` (`lgpd-cleanup-daily`, `purge-idempotency-daily`, `refresh-dashboards`, `purge-security-data-daily`, …) | **Nenhum roda.** `cron.job` vivo = 6 jobs, todos `dp-*` (não declarados no repo) + 1 placeholder (ver Achado #7) |
| RLS habilitado nas tabelas | `IMPLEMENTADO_TOTAL` | `pg_class.relrowsecurity`: **359/359 tabelas com RLS = ON, 0 sem** | Cobertura total no nível de tabela — mas ver Achado #4 (views furam) e #6 (policies `true`) |
| Teste de consistência de migrations | `MORTO_OU_ABANDONADO` | `supabase/tests/migration_consistency.test.ts:24` — "Todos os testes são IGNORADOS quando as envs não estão presentes"; `:34` `const canRun = Boolean(url && anonKey && serviceKey && empresaId)` | Nenhum workflow em `.github/workflows/` executa `deno test` sobre `supabase/tests/` (o único uso de Deno é `deno check` em `ci.yml:77,88`). Teste nunca roda |

---

## 4. Achados graves

### #1 — CRÍTICO: o ledger de migrations e o repositório são **conjuntos disjuntos**
`supabase_migrations.schema_migrations` tem **30** versões, todas com timestamps "redondos" (`20260721220000`, `20260723000001` … `20260723000030`, com `...000008` faltando). Verifiquei os 30 prefixos contra `ls supabase/migrations/`: **0 de 30** têm arquivo correspondente. Os arquivos reais na mesma janela têm timestamps naturais (`20260721204519`, `20260723104000`, `20260723113000`, …).
**Consequência:** não há como saber quais dos 641 arquivos foram aplicados. `supabase db push` num ambiente novo tentaria aplicar os 641 do zero; contra a prod, tentaria aplicar todos os 641 (nenhum consta como aplicado).

### #2 — CRÍTICO: `config.toml` aponta para um projeto Supabase diferente do de produção
`supabase/config.toml:1` → `project_id = "ciziytrrjjotlsjzshnm"`. A produção auditada é `frjbfeamybqsejlvmqbl`. É a causa raiz mais provável do achado #1: o repo nunca esteve linkado ao banco que está no ar.

### #3 — CRÍTICO: existe um subsistema inteiro em produção sem **nenhuma** linha no repositório
Família `dp_*`, criada fora de banda (provavelmente via MCP/console):
- **15 tabelas**: `dp_audit_log` (particionada) + 7 partições (`dp_audit_log_2026_07..12`, `_default`), `dp_audit_config`, `dp_backup_runbook`, `dp_data_catalog`, `dp_environments`, `dp_mcp_config`, `dp_retention_policy`, `dp_user_roles`
- **5 views**: `dp_audit_log_colaborador`, `dp_audit_log_rh`, `dp_data_catalog_public`, `dp_security_advisors`, `dp_slow_queries`
- **25 funções**: `dp_run_retention`, `dp_create_next_partition`, `dp_encrypt_pii`, `dp_decrypt_pii`, `dp_has_role`, `dp_require_role`, `dp_pre_deploy_gate`, `dp_assert_rls`, …
- **5 dos 6 cron jobs vivos**
Prova de ausência: `grep -rl 'dp_audit_log' supabase/migrations/` = **0 arquivos**; o mesmo padrão em `src/` e `supabase/functions/` = **0**. Esse subsistema **contém dado real** (`dp_audit_log_2026_07`=59, `dp_mcp_config`=39, `dp_backup_runbook`=24) e **desapareceria** numa reconstrução a partir do repo.

### #4 — CRÍTICO (segurança): 42 das 43 views furam RLS e são legíveis por `anon`
- `pg_class.reloptions`: **1 view com `security_invoker=true`, 42 sem**.
- Dono das views = `postgres`, e `pg_roles.rolbypassrls = true` para `postgres`.
- `has_table_privilege('anon', view, 'SELECT')` = **true para 43/43**.
Em PG 17 sem `security_invoker`, a view executa com os direitos do dono → **as policies das tabelas base não são avaliadas**. Views afetadas incluem `vw_colaboradores_completo`, `vw_espelho_ponto_mensal`, `vw_folha_compliance`, `v_audit_trail`, `vw_passivo_trabalhista_consolidado`, `dp_audit_log_rh`. O repo **já contém a correção** (91 `security_invoker = true` em 24 migrations + 37 arquivos com `REVOKE … FROM anon`) — e ela **nunca chegou ao banco**. As tabelas (359/359 com RLS ON) estão protegidas; o furo é exclusivamente pelas views.
*Observação de escopo: não executei nenhuma chamada REST com a chave anon — a conclusão vem do catálogo (`reloptions` + `rolbypassrls` + `has_table_privilege`). O caminho de exploração via PostgREST fica `NAO_VERIFICADO`.*

### #5 — ALTO: migrations que **quebram em replay** contra o estado atual
`20260818000000_p2_037_deprecate_legacy_tables.sql`: os `RENAME` estão guardados por `DO $$ IF EXISTS … $$` (linhas 26-79), mas os três `COMMENT ON TABLE public.folha_pagamento_legacy_003 / ponto_registros_legacy_003 / ferias_legacy_003` (linhas 81-91) são **incondicionais**. Como `folha_pagamento` e `ponto_registros` **não existem em produção**, o rename é pulado e o `COMMENT` aborta a transação → a migration falha.
Caso análogo: `20260728205814_184878ad-….sql:2` executa `ALTER TABLE public.medidas_ciencia_tokens` e `20260729161527_f56939e3-….sql:41` faz `FROM public.medidas_ciencia_tokens`, mas **nenhuma migration cria essa tabela** (`grep 'CREATE TABLE.*medidas_ciencia_tokens'` = 0). Idem `medidas_disciplinares_integracao`.

### #6 — ALTO (segurança): 43 policies com predicado `USING (true)`, várias com nome que promete restrição
Consulta a `pg_policies` (`qual = 'true'`, excluindo `service_role`). A maioria é tabela de domínio (`cid10`, `tipos_*`, `paises`) — aceitável. **Não aceitáveis** (nome mente sobre o escopo):

| Tabela | Policy | Predicado real | Linhas |
|---|---|---|---|
| `audit_log` | `view_audit` (SELECT, authenticated) | `true` | 281 |
| `cnab_configuracoes` | "Usuários podem ver configurações de **suas empresas**" | `true` | 1 |
| `integracao_logs` | "**Apenas admin** pode ver logs de integração" | `true` | 0 |
| `notificacoes_admissao` | "**RH** pode ver notificacoes" | `true` | 0 |
| `provisao_auditoria` / `provisao_logs` / `ia_provisoes_alertas` | "**Gestores** podem ver…" | `true` | 0 |
| `sst_exposicao_riscos` | "**Gestores de RH** podem ver Riscos" | `true` | 1 |
| `historico_rescisoes` | "Usuarios autenticados podem ver rescisoes" | `true` | 0 |
| `taxas_cambio` | 2 policies para role `public` (inclui `anon`) | `true` | 0 |
Efeito imediato mensurável: qualquer usuário autenticado lê os 281 registros de `audit_log` de **todos** os tenants. As demais estão vazias hoje — o furo é latente.

### #7 — ALTO: os 6 cron jobs "100% succeeded" não executam o trabalho declarado no repo
Interseção entre os 17 `cron.schedule` do repo e os 6 jobs vivos = **0**. Os 6 vivos são:
`dp-retention-anonymize-90d`, `dp-retention-delete-730d`, `dp-partition-monthly`, `dp-log-rotation-check`, `dp-health-snapshot` (todos do subsistema fantasma do achado #3) e — jobid 6 — `update-despesa-updated-at-daily`:
```
UPDATE public.despesas SET updated_at = NOW()
WHERE id = '0960813f-d333-480e-8d26-6b05c3baf656'
```
Um UPDATE diário num **UUID hardcoded**. É atividade fabricada: infla a métrica "112 execuções, 100% succeeded" sem produzir efeito de negócio. Enquanto isso, `lgpd-cleanup-daily`, `purge-idempotency-daily`, `purge-security-data-daily` e `refresh-dashboards` **não estão agendados**.

### #8 — MÉDIO: `types.ts` diverge do banco nos dois sentidos
`src/integrations/supabase/types.ts` declara 353 tabelas, 38 views, 114 funções.
- **8 tabelas tipadas que não existem em produção**: `pcs_planos`, `pcs_fatores`, `pcs_grades`, `pcs_avaliacoes_cargo`, `pcs_pesquisa_salarial`, `sec_seal_events`, `sec_policy_regressions`, `lgpd_retencao_logs`. As 5 `pcs_*` **são consultadas em runtime** por `src/services/pcsService.ts:59,82,119,165` → falha garantida.
- **14 tabelas vivas ausentes do types.ts** + **5 views vivas ausentes** (toda a família `dp_*`).
- Funções: 114 tipadas vs. 290 vivas.

### #9 — MÉDIO: duplicações e colisões de migration
- **4 pares com timestamp idêntico** (ordem de aplicação indefinida):
  `20260724120000_atomic_rate_limit_rpc` ⨯ `20260724120000_p3_064_query_telemetry_trace_id`;
  `20260724130000_codex_p1_function_overload_and_auth_gap` ⨯ `20260724130000_p3_065_lgpd_retencao_purge`;
  `20260724140000_p4_072_mv_dashboards` ⨯ `20260724140000_t007_backup_logs_rls`;
  `20260818000000_p1_025_encryption_dados_bancarios` ⨯ `20260818000000_p2_037_deprecate_legacy_tables`.
- **6 IDs de tarefa reutilizados** em arquivos distintos: `p1_025`, `p2_037`, `p3_065`, `p4_071`, `p4_072` (2× cada) e `p0_001` (5×).
- **91 nomes de tabela criados por mais de uma migration** (62 nomes ×2, 26 ×3, 3 ×4). Pior caso — `ferias` — é criada por 3 migrations com schemas **incompatíveis**:
  `003_folha_ferias_ponto.sql` (com `periodo_gozo_inicio`, `dias_vendidos`, `valor_1_3`), `20250102000000_dp_production.sql:28` (com `data_inicio`, `dias NOT NULL`, `tipo`, `aprovador_id`) e `20251216170845_…`. Como 518 dos 524 `CREATE TABLE` usam `IF NOT EXISTS`, **a primeira a rodar vence e as demais viram no-op silencioso**. `003_*` ordena antes de `2024*`/`2025*` lexicograficamente → num rebuild, `ferias` nasceria com o schema **errado** (o de 003), e nenhum erro seria emitido. A `ferias` viva em produção não corresponde a nenhuma das três definições (tem `data_inicio` **e** `empresa_id` **e** 60+ colunas adicionadas por `ALTER`, mas **não** tem `dias`, `tipo` nem `aprovador_id` — colunas `NOT NULL` de `20250102`).
- **58 arquivos com prefixo fora do padrão** de 14 dígitos: 7 com 3 dígitos (`001_core_tables.sql` … `007_*`), 26 com 16 dígitos, 25 com 17 dígitos (`2025122813140224_create_cas.sql`). Ordenação lexicográfica coloca `2025122813133907` (16 díg.) **antes** de `20251228131622` (14 díg.) — inversão da intenção cronológica.
- Pares evidentes de duplicata funcional: `2025122813140224_create_cas.sql` ⨯ `20251228131670_create_cas.sql`, `…_create_adicionais`, `…_create_atrasos`, `…_create_avaliacoes`, `…_create_comissoes`, `…_create_darfs`, `…_create_recibos_ferias`. (Conteúdo não é byte-idêntico: `md5sum` de 641 arquivos → 0 duplicatas exatas.)

### #10 — MÉDIO: 7 tabelas com RLS habilitado e **zero policies**
`dp_audit_log_2026_07..12` e `dp_audit_log_default`. RLS ON + 0 policies = negação total para roles não-bypass. Como `anon` tem `SELECT` concedido nelas, o acesso via API falha silenciosamente em vez de retornar dado — mas o mesmo dado é exposto sem restrição pelas views `dp_audit_log_rh`/`dp_audit_log_colaborador` (achado #4).

---

## 5. Drift de tabelas — listas completas (resposta à tarefa 1)

Método: extração de `CREATE TABLE [IF NOT EXISTS] [public.]<nome>` de todos os 641 arquivos (linhas de comentário `--` excluídas), normalizado para minúsculas e sem prefixo de schema → **401 nomes**, dos quais 2 são ruído de prosa (`for`, `to`) → **399 reais**. Comparado com `pg_class relkind='r'` em `public` → **359**.

### (a) Declaradas no repo e **ausentes** do banco — **56**
```
adicionais                atrasos                   auditoria_acesso_bancario
avaliacoes                backup_logs               beneficios_elegibilidade
beneficios_movimentacoes  cache_tabelas             cas
colaboradores_historico   comissoes                 config_retencao
darfs                     documentos_assinaturas    documentos_versoes
entity_versions           esocial_retornos          eventos_rh
exames_medicos            feriados_brasileiros      ferias_abono
folha_calculos            folha_competencias        folha_pagamento
folha_rubricas            folhas                    gratificacoes
grrf                      homologacoes              lgpd_purge_log
lgpd_retencao_logs        migration_naming_audit    mv_refresh_log
notificacoes_templates    pcs_avaliacoes_cargo      pcs_fatores
pcs_grades                pcs_pesquisa_salarial     pcs_planos
ponto_banco_horas         ponto_compensacoes        ponto_escalas
ponto_registros           pontos                    recibos_ferias
recibos_rescisao          rescisao_homologacoes     rescisao_simulacoes
rubricas                  sec_policy_regressions    sec_seal_events
sst_epis                  sst_exames                trct
treinamentos_avaliacoes   treinamentos_certificados
```
Destaques: `pcs_*` (5) são consumidas em runtime por `src/services/pcsService.ts`; `folha_pagamento`/`ponto_registros`/`ferias` são o alvo da migration de depreciação #5; `sst_epis`/`sst_exames`/`ponto_escalas` sugerem um refactor de nomenclatura abandonado (as versões vivas são `epis`, `exames`, `escalas`).

### (b) Vivas no banco e **não criadas** por nenhuma migration — **16** (+1 particionada)
```
dp_audit_config        dp_audit_log_2026_07   dp_audit_log_2026_08
dp_audit_log_2026_09   dp_audit_log_2026_10   dp_audit_log_2026_11
dp_audit_log_2026_12   dp_audit_log_default   dp_backup_runbook
dp_data_catalog        dp_environments        dp_mcp_config
dp_retention_policy    dp_user_roles          medidas_ciencia_tokens
medidas_disciplinares_integracao
(+ dp_audit_log — tabela particionada, relkind='p')
```
- As 14 `dp_*` + `dp_audit_log`: **zero menção** em todo o repo (migrations, `src/`, `supabase/functions/`).
- `medidas_ciencia_tokens` e `medidas_disciplinares_integracao`: são **alteradas e consultadas** por migrations (`20260728205814_…:2`, `20260729161527_…:41`) mas **nunca criadas** → migration quebrada em replay.

### Drift complementar
- **Views no repo e não no banco (17)**: `contas_bancarias_decrypted`, `v_security_dashboard`, `v_login_anomalies`, `v_login_anomalies_ip`, `v_login_anomalies_email`, `v_security_brute_force_targets`, `v_audit_summary_7d`, `v_telemetry_last_hour`, `v_telemetry_slow_queries`, `v_dashboard_refresh_status`, `v_documentos_unificado`, `v_filter_stats`, `v_passivo_summary`, `admin.v_slow_queries`, `admin.v_open_transactions`, `admin.v_long_running_queries`, `admin.v_pgbouncer_stats`.
- **Views no banco e não no repo (5)**: as 5 `dp_*`.
- **Funções no repo e não no banco (109)**, incluindo toda a camada de criptografia (`encrypt_dados_bancarios`, `decrypt_dados_bancarios`, `encrypt_pii`, `decrypt_pii`, `hash_pii`, `encrypt_contas_bancarias_fields`, `encrypt_pix_itens_fields`), o módulo PCS inteiro (`pcs_enquadramento`, `pcs_gerar_grades`, `pcs_simular_impacto`, `pcs_recalc_pontos`, …), o hardening de selos (`sec_verify_seals`, `seal_enforce`, `sec_audit_policies_scan`) e o purge LGPD (`run_lgpd_purge`, `drenar_fila_limpeza_lgpd`).
- **Funções no banco e não no repo (37)**: 25 `dp_*` + `pgaudit_ddl_command_end`/`pgaudit_sql_drop` + o módulo de medidas disciplinares (`aplicar_medida_folha_ponto`, `enfileirar_esocial_medida_disciplinar`, `trg_medida_aplicada_integrar`, `medidas_analytics_reincidencia`, …) + `check_ciencia_rate_limit`, `garantir_rubrica_suspensao`, `fill_*_empresa`, `rls_auto_enable`.

---

## 6. O ambiente é reconstruível a partir do repo? (resposta à tarefa 2)

**NÃO.** Evidência numérica, em ordem de gravidade:

| # | Medição | Valor |
|---|---|---|
| 1 | Arquivos de migration no repo cujo prefixo consta no ledger de produção | **0 / 641** |
| 2 | Versões do ledger de produção com arquivo correspondente no repo | **0 / 30** |
| 3 | `project_id` do `config.toml` = ref do banco auditado | **não** (`ciziytrrjjotlsjzshnm` ≠ `frjbfeamybqsejlvmqbl`) |
| 4 | Tabelas vivas que nenhuma migration cria | **16** (+1 particionada), das quais 14 com **zero** menção no repo |
| 5 | Tabelas vivas com dado real que sumiriam num rebuild | **8** — `dp_audit_log_2026_07`(59), `dp_mcp_config`(39), `dp_backup_runbook`(24), `dp_audit_log_2026_08`(16), `dp_data_catalog`(10), `dp_environments`(4), `dp_audit_config`(3), `dp_retention_policy`(2) |
| 6 | Views vivas que nenhuma migration cria | **5** |
| 7 | Funções vivas que nenhuma migration cria | **37** |
| 8 | Cron jobs vivos declarados no repo | **0 / 6** |
| 9 | Migrations que **abortam** se reaplicadas ao estado atual de prod | **≥3** (achado #5) |
| 10 | Nomes de tabela criados por >1 migration com `IF NOT EXISTS` (divergência silenciosa) | **91** |
| 11 | Seeds cujo alvo não existe no banco | **6 / 10** — e os 10 são placeholders sem dado |
| 12 | Materialized views declaradas vs. vivas | **13 vs. 0** |

Interpretação honesta, sem exagero: um `supabase db reset` sobre o repo **produziria um banco**, mas seria um banco **diferente do de produção** em pelo menos 56 tabelas a mais, 16 tabelas a menos, 5 views a menos, 37 funções a menos, 6 cron jobs a menos — e com `ferias` (12 linhas em prod) nascendo com schema incompatível por conta da colisão `IF NOT EXISTS` do achado #9. E o caminho inverso — aplicar o repo sobre a produção — aborta na primeira migration quebrada.

Não afirmo que o rebuild "falha na primeira linha": **não executei nenhuma migration** (`node_modules` ausente, sem Docker/Supabase CLI verificado). O que está provado é a **divergência estrutural**, não o comportamento de execução.

---

## 7. Migrations duplicadas/conflitantes (resposta à tarefa 3)

Consolidado no **Achado #9**. Resumo:

| Categoria | Quantidade | Exemplo |
|---|---|---|
| Timestamp idêntico entre 2 arquivos | **4 pares** | `20260818000000_p1_025_*` ⨯ `20260818000000_p2_037_*` |
| ID de tarefa reutilizado | **6 IDs** | `p4_072` em `20260724140000_*` e `20260817010000_*` |
| Nome de tabela criado por >1 migration | **91 nomes** (62×2, 26×3, 3×4) | `dependentes`, `colaboradores`, `auditoria_logs` (4× cada); `ferias` (3×, schemas incompatíveis) |
| Prefixo fora do padrão 14 dígitos | **58 arquivos** | `001_core_tables.sql` (3 díg.), `2025122813140224_create_cas.sql` (16 díg.) |
| Pares "create_X" com dois timestamps | **≥7** | `create_cas`, `create_adicionais`, `create_atrasos`, `create_avaliacoes`, `create_comissoes`, `create_darfs`, `create_recibos_ferias` |
| Conteúdo byte-idêntico (`md5sum`) | **0** | — |

---

## 8. Tabelas legadas/depreciadas (resposta à tarefa 4)

Só **1 migration** de depreciação e **1** `DROP TABLE` em todo o repo:

| Migration | Alvo | Estado vivo |
|---|---|---|
| `20260818000000_p2_037_deprecate_legacy_tables.sql` | `folha_pagamento` → `folha_pagamento_legacy_003` | Nem `folha_pagamento` nem `folha_pagamento_legacy_003` existem. Nunca aplicada |
| idem | `ponto_registros` → `ponto_registros_legacy_003` | Idem — nenhuma das duas existe |
| idem | `ferias` → `ferias_legacy_003` (só se vazia) | `ferias` existe **com 12 linhas** e é a tabela moderna (tem `data_inicio` + 60 colunas de `ALTER`). `ferias_legacy_003` não existe |
| `20260726110000_p2_037_consolidate_duplicates.sql` | Consolida 6 tabelas de documentos via `v_documentos_unificado` (não destrutivo) | A view **não existe** no banco |
| `20260723104000_77b7944b-….sql:2` | `DROP TABLE IF EXISTS public.ferias_programacao CASCADE` | `ferias_programacao` **existe viva** (0 linhas) — o drop não foi aplicado, ou foi recriada depois |

Nenhum objeto marcado como depreciado foi de fato removido de produção; e nenhuma das renomeações `*_legacy_003` existe. A dívida de depreciação está **integralmente aberta**.

---

## 9. RLS (resposta à tarefa 5)

**Tabelas em `public` sem RLS habilitado: 0.** Medição:
`SELECT count(*) FILTER (WHERE NOT relrowsecurity) FROM pg_class WHERE relnamespace='public' AND relkind='r'` → **0** de **359**.

Isso é o ponto forte do banco. Os problemas de RLS são de **qualidade**, não de cobertura:

1. **7 tabelas com RLS ON e 0 policies** (achado #10): `dp_audit_log_2026_07..12`, `dp_audit_log_default`.
2. **43 policies com `USING (true)`** (achado #6). Sensíveis, com nome que promete restrição inexistente: `audit_log` (281 linhas, cross-tenant), `cnab_configuracoes`, `integracao_logs`, `notificacoes_admissao`, `provisao_auditoria`, `provisao_logs`, `ia_provisoes_alertas`, `sst_exposicao_riscos`, `historico_rescisoes`, `pendencias`, `permissao_perfis`, `periodos_ponto`, `password_policies`, `taxas_cambio` (role `public`, inclui `anon`).
3. **42/43 views furam RLS por completo** (achado #4) — este é o vetor de exposição real, pois `anon` tem `SELECT` em todas as 43 e o dono (`postgres`) tem `rolbypassrls=true`.
4. 597 policies vivas vs. 1.568 `CREATE POLICY` no repo — o repo tem 2,6× mais policies declaradas do que o banco tem aplicadas (parte explicada pelos 1.954 `DROP POLICY` de re-criação idempotente, mas a diferença líquida permanece não conciliada).

---

## 10. Lacunas — o que NÃO consegui verificar

| Lacuna | Motivo |
|---|---|
| Se `supabase db reset`/`db push` de fato falha e em qual arquivo | `node_modules` ausente, sem Supabase CLI/Docker verificado no ambiente. `NAO_VERIFICADO` — a conclusão da seção 6 é sobre **divergência estrutural**, não sobre execução |
| Exploração prática do furo de RLS via PostgREST com a chave `anon` | Exigiria chamada HTTP autenticada com a anon key, fora do escopo somente-leitura acordado. Evidência é de catálogo (`reloptions`, `rolbypassrls`, `has_table_privilege`) |
| Quais Edge Functions estão deployadas | Management API indisponível (sem PAT), conforme briefing. `NAO_VERIFICADO` |
| Se alguma das 641 migrations foi aplicada manualmente (fora do ledger) | O ledger é a única fonte e está disjunto. Inferência a partir da presença de objetos é circunstancial, não prova |
| Diff coluna a coluna entre o schema declarado e o vivo nas 343 tabelas coincidentes | Fora do teto de altitude: exigiria parsear 524 `CREATE TABLE` + 1.065 `ALTER TABLE`. Amostrei apenas `ferias`, `folha_itens`, `rubricas_folha` — e **`ferias` já divergiu** de todas as três definições do repo, o que sugere que a divergência de colunas é generalizada e **não foi quantificada** |
| Conteúdo semântico das 3.864 funções citadas no briefing | Minha medição em `pg_proc` para `public` dá **292** (290 próprias + 2 de extensão). A discrepância com os 3.864 do briefing provavelmente vem de contagem multi-schema (extensões instaladas fora de `public`). Reporto o número que medi, com a query usada |
| Idem para views: briefing cita 193, medi **43** em `public` (`relkind='v'`) + 0 materializadas | Mesma provável causa (contagem multi-schema / `information_schema.views`) |
