# public.ferias

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
| usada por views | public.v_ferias_adiant13_elegibilidade, public.v_ferias_alerta_pagamento_d2, public.v_ferias_alertas_criticos, public.v_ferias_folha_reconciliacao, public.vw_ferias_resumo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `periodo_aquisitivo_id` | `uuid` | não |  |  |  |
| 4 | `data_inicio` | `date` | não |  |  |  |
| 5 | `data_fim` | `date` | não |  |  |  |
| 6 | `dias_gozo` | `integer` | não |  |  |  |
| 7 | `dias_abono` | `integer` | sim | `0` |  |  |
| 8 | `vender_abono` | `boolean` | sim | `false` |  |  |
| 9 | `data_pagamento` | `date` | sim |  |  |  |
| 10 | `salario_base` | `numeric(12,2)` | não |  |  |  |
| 11 | `valor_ferias` | `numeric(12,2)` | não |  |  |  |
| 12 | `valor_terco` | `numeric(12,2)` | não |  |  |  |
| 13 | `valor_abono` | `numeric(12,2)` | sim | `0` |  |  |
| 14 | `valor_terco_abono` | `numeric(12,2)` | sim | `0` |  |  |
| 15 | `valor_total` | `numeric(12,2)` | não |  |  |  |
| 16 | `descontos_inss` | `numeric(12,2)` | sim | `0` |  |  |
| 17 | `descontos_irrf` | `numeric(12,2)` | sim | `0` |  |  |
| 18 | `valor_liquido` | `numeric(12,2)` | não |  |  |  |
| 19 | `status` | `character varying(20)` | sim | `'programada'::character varying` |  |  |
| 20 | `aprovado_por` | `uuid` | sim |  |  |  |
| 21 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 22 | `observacoes` | `text` | sim |  |  |  |
| 23 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 24 | `created_by` | `uuid` | sim |  |  |  |
| 25 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 26 | `empresa_id` | `uuid` | sim |  |  |  |
| 27 | `justificativa` | `text` | sim |  |  |  |
| 28 | `enviado_contabilidade` | `boolean` | sim | `false` |  |  |
| 29 | `saldo_gasto` | `integer` | sim |  |  |  |
| 30 | `ferias_coletiva_id` | `uuid` | sim |  |  |  |
| 31 | `aprovado_gestor` | `boolean` | sim | `false` |  |  |
| 32 | `aprovado_gestor_em` | `timestamp with time zone` | sim |  |  |  |
| 33 | `aprovado_gestor_por` | `uuid` | sim |  |  |  |
| 34 | `aprovado_rh` | `boolean` | sim | `false` |  |  |
| 35 | `aprovado_rh_em` | `timestamp with time zone` | sim |  |  |  |
| 36 | `aprovado_rh_por` | `uuid` | sim |  |  |  |
| 37 | `enviado_contabilidade_em` | `timestamp with time zone` | sim |  |  |  |
| 38 | `enviado_contabilidade_por` | `uuid` | sim |  |  |  |
| 39 | `abono_pecuniario` | `boolean` | sim | `false` |  |  |
| 40 | `valor_abono_pecuniario` | `numeric(12,2)` | sim | `0` |  |  |
| 41 | `adiantamento_13` | `boolean` | sim | `false` |  |  |
| 42 | `valor_adiantamento_13` | `numeric(12,2)` | sim | `0` |  |  |
| 43 | `cancelado` | `boolean` | sim | `false` |  |  |
| 44 | `cancelado_em` | `timestamp with time zone` | sim |  |  |  |
| 45 | `cancelado_por` | `uuid` | sim |  |  |  |
| 46 | `motivo_cancelamento` | `text` | sim |  |  |  |
| 47 | `documento_url` | `text` | sim |  |  |  |
| 48 | `adiantamento_13o` | `boolean` | sim | `false` |  |  |
| 49 | `periodo_aquisitivo_inicio` | `date` | sim |  |  |  |
| 50 | `periodo_aquisitivo_fim` | `date` | sim |  |  |  |
| 51 | `status_aprovacao_gestor` | `text` | sim | `'pendente'::text` |  |  |
| 52 | `status_aprovacao_rh` | `text` | sim | `'pendente'::text` |  |  |
| 53 | `status_aprovacao_contabilidade` | `text` | sim | `'pendente'::text` |  |  |
| 54 | `hash_integridade` | `text` | sim |  |  |  |
| 55 | `aviso_pdf_url` | `text` | sim |  |  |  |
| 56 | `aviso_assinatura_hash` | `text` | sim |  |  |  |
| 57 | `aviso_assinatura_em` | `timestamp with time zone` | sim |  |  |  |
| 58 | `aviso_assinatura_por` | `uuid` | sim |  |  |  |
| 59 | `aviso_assinatura_ip` | `inet` | sim |  |  |  |
| 60 | `aviso_assinatura_user_agent` | `text` | sim |  |  |  |
| 61 | `aviso_gerado_em` | `timestamp with time zone` | sim |  |  |  |
| 62 | `pagamento_confirmado_em` | `timestamp with time zone` | sim |  |  |  |
| 63 | `pagamento_confirmado_por` | `uuid` | sim |  |  |  |
| 64 | `pagamento_valor` | `numeric(14,2)` | sim |  |  |  |
| 65 | `pagamento_comprovante_path` | `text` | sim |  |  |  |
| 66 | `adiantamento_13_solicitado_em` | `timestamp with time zone` | sim |  |  |  |
| 67 | `adiantamento_13_solicitado_por` | `uuid` | sim |  |  |  |
| 68 | `adiantamento_13_ano_exercicio` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_ferias_periodo_coerente | CHECK | `CHECK (data_inicio IS NULL OR data_fim IS NULL OR data_fim >= data_inicio) NOT VALID` |  |  | não |
| chk_ferias_status | CHECK | `CHECK (status IS NULL OR (status::text = ANY (ARRAY['pendente'::character varying, 'programada'::character varying, 'solicitada'::character varying, 'em_analise'::character varying, 'aprovada'::character varying, 'rejeitada'::character varying, 'cancelada'::character varying, 'agendada'::character varying, 'em_gozo'::character varying, 'concluida'::character varying, 'pendente_aprovacao'::character varying, 'vencida'::character varying]::text[]))) NOT VALID` |  |  | não |
| ferias_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_datas_coerentes | CHECK | `CHECK (data_fim >= data_inicio)` |  |  | sim |
| ferias_dias_abono_clt | CHECK | `CHECK (dias_abono >= 0 AND dias_abono <= 10)` |  |  | sim |
| ferias_dias_gozo_clt | CHECK | `CHECK (dias_gozo >= 1 AND dias_gozo <= 30)` |  |  | sim |
| ferias_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| ferias_pagamento_confirmado_por_fkey | FOREIGN KEY | `FOREIGN KEY (pagamento_confirmado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| ferias_periodo_aquisitivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (periodo_aquisitivo_id) REFERENCES periodos_aquisitivos(id)` | NO ACTION | NO ACTION | sim |
| ferias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ferias_status_check | CHECK | `CHECK (status IS NULL OR (status::text = ANY (ARRAY['pendente'::character varying, 'programada'::character varying, 'solicitada'::character varying, 'em_analise'::character varying, 'aprovada'::character varying, 'rejeitada'::character varying, 'cancelada'::character varying, 'agendada'::character varying, 'em_gozo'::character varying, 'concluida'::character varying, 'pendente_aprovacao'::character varying, 'vencida'::character varying]::text[]))) NOT VALID` |  |  | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.eventos_variaveis | eventos_variaveis_origem_ferias_id_fkey | origem_ferias_id | CASCADE |
| public.ferias_aprovacoes | ferias_aprovacoes_ferias_id_fkey | ferias_id | CASCADE |
| public.ferias_aprovacoes_log | ferias_aprovacoes_log_ferias_id_fkey | ferias_id | CASCADE |
| public.ferias_arquivos | ferias_arquivos_ferias_id_fkey | ferias_id | CASCADE |
| public.ferias_programacao | ferias_programacao_ferias_id_fkey | ferias_id | SET NULL |
| public.historico_ferias | historico_ferias_ferias_id_fkey | ferias_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_pkey ON public.ferias USING btree (id)` |
| idx_ferias_adiant13_empresa | btree | empresa_id, adiantamento_13_ano_exercicio | não | sim | `(adiantamento_13o = true)` | `CREATE INDEX idx_ferias_adiant13_empresa ON public.ferias USING btree (empresa_id, adiantamento_13_ano_exercicio) WHERE (adiantamento_13o = true)` |
| idx_ferias_colab_status | btree | colaborador_id, status | não | sim |  | `CREATE INDEX idx_ferias_colab_status ON public.ferias USING btree (colaborador_id, status)` |
| idx_ferias_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_ferias_colaborador_id ON public.ferias USING btree (colaborador_id)` |
| idx_ferias_data_inicio | btree | data_inicio | não | sim |  | `CREATE INDEX idx_ferias_data_inicio ON public.ferias USING btree (data_inicio)` |
| idx_ferias_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ferias_empresa_id ON public.ferias USING btree (empresa_id)` |
| idx_ferias_empresa_inicio | btree | empresa_id, data_inicio | não | sim |  | `CREATE INDEX idx_ferias_empresa_inicio ON public.ferias USING btree (empresa_id, data_inicio DESC)` |
| idx_ferias_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_ferias_empresa_status ON public.ferias USING btree (empresa_id, status)` |
| idx_ferias_pagamento_pend | btree | empresa_id, data_inicio | não | sim | `((pagamento_confirmado_em IS NULL) AND ((status)::text = ANY (ARRAY[('aprovada'::character varying)::text, ('programada'::character varying)::text])))` | `CREATE INDEX idx_ferias_pagamento_pend ON public.ferias USING btree (empresa_id, data_inicio) WHERE ((pagamento_confirmado_em IS NULL) AND ((status)::text = ANY (ARRAY[('aprovada'::character varying)::text, ('programada'::character varying)::text])))` |
| idx_ferias_periodo_aquisitivo_id | btree | periodo_aquisitivo_id | não | sim |  | `CREATE INDEX idx_ferias_periodo_aquisitivo_id ON public.ferias USING btree (periodo_aquisitivo_id)` |
| uq_ferias_adiant13_ano | btree | colaborador_id, adiantamento_13_ano_exercicio | sim | sim | `((adiantamento_13o = true) AND (adiantamento_13_ano_exercicio IS NOT NULL))` | `CREATE UNIQUE INDEX uq_ferias_adiant13_ano ON public.ferias USING btree (colaborador_id, adiantamento_13_ano_exercicio) WHERE ((adiantamento_13o = true) AND (adiantamento_13_ano_exercicio IS NOT NULL))` |


## Policies (RLS)

### `ferias_gestor_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_pessoas(empresa_id)` |
| WITH CHECK |  |

### `ferias_rh_manage`

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
| audit_ferias | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| ferias_bloquear_gozo_sem_pagamento | BEFORE | UPDATE | ROW | enabled | public.trg_ferias_bloquear_gozo_sem_pagamento |
| ferias_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_ferias_status_transition |
| tr_update_ferias_status | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_update_ferias_status_by_date |
| trg_enforce_ferias_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_ferias_hash |
| trg_ferias_gerar_rubricas | AFTER | UPDATE | ROW | enabled | public.trg_ferias_gerar_rubricas |
| trg_ferias_validar_aquisitivo | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_ferias_validar_aquisitivo |
| trg_ferias_validar_inicio | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_ferias_validar_inicio |
| trg_ferias_validar_split | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_ferias_validar_split |
| trg_impedir_alteracao_ferias_concluidas | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_ferias_concluidas |
| trg_proibir_delete_ferias_concluidas | BEFORE | DELETE | ROW | enabled | public.proibir_delete_ferias_concluidas |
| update_ferias_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
