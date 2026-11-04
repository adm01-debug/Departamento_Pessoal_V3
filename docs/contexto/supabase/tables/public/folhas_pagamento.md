# public.folhas_pagamento

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.mv_folha_summary |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `competencia` | `text` | não |  |  |  |
| 3 | `tipo` | `text` | não | `'mensal'::text` |  |  |
| 4 | `status` | `status_folha` | não | `'aberta'::status_folha` |  |  |
| 5 | `data_calculo` | `timestamp with time zone` | sim |  |  |  |
| 6 | `data_fechamento` | `timestamp with time zone` | sim |  |  |  |
| 7 | `data_pagamento` | `date` | sim |  |  |  |
| 8 | `total_proventos` | `numeric(14,2)` | sim | `0` |  |  |
| 9 | `total_descontos` | `numeric(14,2)` | sim | `0` |  |  |
| 10 | `total_liquido` | `numeric(14,2)` | sim | `0` |  |  |
| 11 | `total_fgts` | `numeric(14,2)` | sim | `0` |  |  |
| 12 | `total_inss_patronal` | `numeric(14,2)` | sim | `0` |  |  |
| 13 | `total_colaboradores` | `integer` | sim | `0` |  |  |
| 14 | `observacoes` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `created_by` | `uuid` | sim |  |  |  |
| 18 | `empresa_id` | `uuid` | sim |  |  |  |
| 19 | `alerta_calculo` | `jsonb` | sim |  |  |  |
| 20 | `version` | `integer` | não | `1` |  |  |
| 21 | `fechada_por` | `uuid` | sim |  |  |  |
| 22 | `reaberta_em` | `timestamp with time zone` | sim |  |  |  |
| 23 | `reaberta_por` | `uuid` | sim |  |  |  |
| 24 | `motivo_reabertura` | `text` | sim |  |  |  |
| 25 | `esocial_status` | `text` | não | `'nao_enviado'::text` |  |  |
| 26 | `hash_integridade` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_folhas_pagamento_tipo | CHECK | `CHECK (tipo IS NULL OR (tipo = ANY (ARRAY['mensal'::text, '13_primeira'::text, '13_segunda'::text, 'ferias'::text, 'rescisao'::text, 'adiantamento'::text, 'complementar'::text, 'pro_labore'::text])))` |  |  | sim |
| chk_folhas_totais_nao_negativos | CHECK | `CHECK (COALESCE(total_proventos, 0::numeric) >= 0::numeric AND COALESCE(total_descontos, 0::numeric) >= 0::numeric AND COALESCE(total_liquido, 0::numeric) >= 0::numeric) NOT VALID` |  |  | não |
| folhas_pagamento_competencia_fmt | CHECK | `CHECK (competencia ~ '^\d{4}-(0[1-9]\|1[0-2])$'::text) NOT VALID` |  |  | não |
| folhas_pagamento_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| folhas_pagamento_empresa_comp_tipo_unique | UNIQUE | `UNIQUE (empresa_id, competencia, tipo)` |  |  | sim |
| folhas_pagamento_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| folhas_pagamento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.cnab_remessas | cnab_remessas_folha_id_fkey | folha_id | SET NULL |
| public.despesas | despesas_folha_id_fkey | folha_id | SET NULL |
| public.folha_assinaturas | folha_assinaturas_folha_id_fkey | folha_id | CASCADE |
| public.folha_auditoria | folha_auditoria_folha_id_fkey | folha_id | CASCADE |
| public.folha_eventos_auditoria | folha_eventos_auditoria_folha_id_fkey | folha_id | NO ACTION |
| public.folha_itens | folha_itens_folha_id_fkey | folha_id | CASCADE |
| public.historico_calculos_folha | historico_calculos_folha_folha_id_fkey | folha_id | CASCADE |
| public.holerite_distribuicoes | holerite_distribuicoes_folha_id_fkey | folha_id | CASCADE |
| public.holerites | holerites_folha_id_fkey | folha_id | CASCADE |
| public.itens_folha | itens_folha_folha_id_fkey | folha_id | CASCADE |
| public.lancamentos_contabeis | lancamentos_contabeis_folha_id_fkey | folha_id | SET NULL |
| public.pix_lotes | pix_lotes_folha_id_fkey | folha_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| folhas_pagamento_empresa_comp_tipo_unique | btree | empresa_id, competencia, tipo | sim | sim |  | `CREATE UNIQUE INDEX folhas_pagamento_empresa_comp_tipo_unique ON public.folhas_pagamento USING btree (empresa_id, competencia, tipo)` |
| folhas_pagamento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX folhas_pagamento_pkey ON public.folhas_pagamento USING btree (id)` |
| idx_folhas_empresa_competencia | btree | empresa_id, competencia | não | sim |  | `CREATE INDEX idx_folhas_empresa_competencia ON public.folhas_pagamento USING btree (empresa_id, competencia DESC)` |
| idx_folhas_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_folhas_empresa_status ON public.folhas_pagamento USING btree (empresa_id, status)` |
| idx_folhas_pagamento_competencia | btree | competencia | não | sim |  | `CREATE INDEX idx_folhas_pagamento_competencia ON public.folhas_pagamento USING btree (competencia)` |
| idx_folhas_pagamento_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_folhas_pagamento_created_by ON public.folhas_pagamento USING btree (created_by)` |
| idx_folhas_pagamento_empresa_competencia | btree | empresa_id, competencia | não | sim |  | `CREATE INDEX idx_folhas_pagamento_empresa_competencia ON public.folhas_pagamento USING btree (empresa_id, competencia)` |
| idx_folhas_pagamento_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_folhas_pagamento_empresa_id ON public.folhas_pagamento USING btree (empresa_id)` |
| idx_folhas_pagamento_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_folhas_pagamento_empresa_status ON public.folhas_pagamento USING btree (empresa_id, status)` |
| idx_folhas_pagamento_id_version | btree | id, version | não | sim |  | `CREATE INDEX idx_folhas_pagamento_id_version ON public.folhas_pagamento USING btree (id, version)` |
| idx_folhas_pagamento_status | btree | status | não | sim |  | `CREATE INDEX idx_folhas_pagamento_status ON public.folhas_pagamento USING btree (status)` |


## Policies (RLS)

### `folhas_gestor_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_pessoas(empresa_id)` |
| WITH CHECK |  |

### `folhas_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_folhas_pagamento | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_folhas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_folha_updated_at |
| tr_increment_version_folhas | BEFORE | UPDATE | ROW | enabled | public.increment_version |
| tr_updated_at_folhas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_audit_folha | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.process_audit_log |
| trg_enforce_folha_pagamento_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_folha_pagamento_hash |
| trg_folha_optimistic_lock | BEFORE | UPDATE | ROW | enabled | public.fn_folha_optimistic_lock |
| trg_impedir_alteracao_folha_fechada | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_folha_fechada |
| trg_proibir_delete_folha_fechada | BEFORE | DELETE | ROW | enabled | public.proibir_delete_folha_fechada |
| trigger_alerta_divergencia | BEFORE | INSERT OR UPDATE | ROW | disabled | public.verificar_divergencias_folha |
| trigger_gerar_provisao | AFTER | INSERT OR UPDATE | ROW | disabled | public.calcular_provisao_mensal |
| trigger_protecao_folha_fechada | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_folha_fechada |
| update_folhas_pagamento_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
