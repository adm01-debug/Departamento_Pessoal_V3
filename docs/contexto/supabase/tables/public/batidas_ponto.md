# public.batidas_ponto

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.excecoes_ponto, public.vw_batidas_dia, public.vw_batidas_resumo, public.vw_espelho_ponto_mensal |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `data` | `date` | não |  |  |  |
| 5 | `hora` | `time without time zone` | não |  |  |  |
| 6 | `ordem` | `integer` | não |  |  |  |
| 7 | `tipo` | `text` | não | `'entrada'::text` |  |  |
| 8 | `origem` | `text` | sim | `'manual'::text` |  |  |
| 9 | `ajustado` | `boolean` | sim | `false` |  |  |
| 10 | `ajustado_por` | `text` | sim |  |  |  |
| 11 | `motivo_ajuste` | `text` | sim |  |  |  |
| 12 | `latitude` | `numeric` | sim |  |  |  |
| 13 | `longitude` | `numeric` | sim |  |  |  |
| 14 | `precisao_metros` | `integer` | sim |  |  |  |
| 15 | `ip_address` | `text` | sim |  |  |  |
| 16 | `dentro_raio` | `boolean` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 19 | `hash_digital` | `text` | sim |  |  |  |
| 20 | `dispositivo_id` | `text` | sim |  |  |  |
| 21 | `versao_app` | `text` | sim |  |  |  |
| 22 | `timezone` | `text` | sim | `'America/Sao_Paulo'::text` |  |  |
| 23 | `is_offline` | `boolean` | sim | `false` |  |  |
| 24 | `sync_at` | `timestamp with time zone` | sim |  |  |  |
| 25 | `device_metadata` | `jsonb` | sim |  |  |  |
| 26 | `hash_integridade` | `text` | sim |  |  |  |
| 27 | `offline` | `boolean` | sim | `false` |  |  |
| 28 | `foto_biometria_url` | `text` | sim |  |  |  |
| 29 | `biometria_status` | `text` | sim | `'nao_validada'::text` |  |  |
| 30 | `biometria_score` | `double precision` | sim |  |  |  |
| 31 | `hash_biometrico` | `text` | sim |  |  |  |
| 32 | `hash_comprovante` | `text` | sim |  |  |  |
| 33 | `id_fiscal_ponto` | `text` | sim |  |  |  |
| 34 | `distancia_local_metros` | `numeric` | sim |  |  |  |
| 35 | `anomalia_detectada` | `boolean` | sim | `false` |  |  |
| 36 | `justificativa_anomalia` | `text` | sim |  |  |  |
| 37 | `timestamp_dispositivo` | `timestamp with time zone` | sim |  |  |  |
| 38 | `offset_timezone` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| batidas_latitude_valida | CHECK | `CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric)` |  |  | sim |
| batidas_longitude_valida | CHECK | `CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric)` |  |  | sim |
| batidas_ponto_colaborador_id_data_ordem_key | UNIQUE | `UNIQUE (colaborador_id, data, ordem)` |  |  | sim |
| batidas_ponto_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| batidas_ponto_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| batidas_ponto_no_duplicate_batida | UNIQUE | `UNIQUE (colaborador_id, data, hora, tipo)` |  |  | sim |
| batidas_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| batidas_precisao_positiva | CHECK | `CHECK (precisao_metros IS NULL OR precisao_metros >= 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.conformidade_ponto_logs | conformidade_ponto_logs_batida_id_fkey | batida_id | CASCADE |
| public.ponto_auditoria_fraude | ponto_auditoria_fraude_batida_id_fkey | batida_id | NO ACTION |
| public.trilha_auditoria_ponto | trilha_auditoria_ponto_ponto_id_fkey | ponto_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| batidas_ponto_colaborador_id_data_ordem_key | btree | colaborador_id, data, ordem | sim | sim |  | `CREATE UNIQUE INDEX batidas_ponto_colaborador_id_data_ordem_key ON public.batidas_ponto USING btree (colaborador_id, data, ordem)` |
| batidas_ponto_no_duplicate_batida | btree | colaborador_id, data, hora, tipo | sim | sim |  | `CREATE UNIQUE INDEX batidas_ponto_no_duplicate_batida ON public.batidas_ponto USING btree (colaborador_id, data, hora, tipo)` |
| batidas_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX batidas_ponto_pkey ON public.batidas_ponto USING btree (id)` |
| idx_batidas_anomalia_partial | btree | empresa_id, data | não | sim | `(anomalia_detectada = true)` | `CREATE INDEX idx_batidas_anomalia_partial ON public.batidas_ponto USING btree (empresa_id, data DESC) WHERE (anomalia_detectada = true)` |
| idx_batidas_colab_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_batidas_colab_data ON public.batidas_ponto USING btree (colaborador_id, data DESC)` |
| idx_batidas_colab_data_desc | btree | colaborador_id, data, hora, tipo, origem, dentro_raio | não | sim |  | `CREATE INDEX idx_batidas_colab_data_desc ON public.batidas_ponto USING btree (colaborador_id, data DESC, hora DESC) INCLUDE (tipo, origem, dentro_raio)` |
| idx_batidas_empresa_data | btree | empresa_id, data | não | sim |  | `CREATE INDEX idx_batidas_empresa_data ON public.batidas_ponto USING btree (empresa_id, data DESC)` |
| idx_batidas_ponto_anomalia | btree | colaborador_id, data | não | sim | `(anomalia_detectada = true)` | `CREATE INDEX idx_batidas_ponto_anomalia ON public.batidas_ponto USING btree (colaborador_id, data) WHERE (anomalia_detectada = true)` |
| idx_batidas_ponto_colab_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_batidas_ponto_colab_data ON public.batidas_ponto USING btree (colaborador_id, data)` |
| idx_batidas_ponto_colaborador_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_batidas_ponto_colaborador_data ON public.batidas_ponto USING btree (colaborador_id, data)` |
| idx_batidas_ponto_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_batidas_ponto_colaborador_id ON public.batidas_ponto USING btree (colaborador_id)` |
| idx_batidas_ponto_data | btree | data | não | sim |  | `CREATE INDEX idx_batidas_ponto_data ON public.batidas_ponto USING btree (data)` |
| idx_batidas_ponto_empresa_data | btree | empresa_id, data | não | sim |  | `CREATE INDEX idx_batidas_ponto_empresa_data ON public.batidas_ponto USING btree (empresa_id, data)` |
| idx_batidas_ponto_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_batidas_ponto_empresa_id ON public.batidas_ponto USING btree (empresa_id)` |


## Policies (RLS)

### `batidas_ponto_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `bp_del_role_gate`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (sou_o_colaborador(colaborador_id) OR pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id)))` |
| WITH CHECK |  |

### `bp_ins_role_gate`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (sou_o_colaborador(colaborador_id) OR pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id)))` |

### `bp_sel`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `bp_upd_role_gate`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (sou_o_colaborador(colaborador_id) OR pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id)))` |
| WITH CHECK | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (sou_o_colaborador(colaborador_id) OR pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_biometric_failure | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_audit_biometric_failure |
| tr_gerar_hash_batida_ponto | BEFORE | INSERT | ROW | enabled | public.gerar_hash_batida_ponto |
| tr_validate_ponto | AFTER | INSERT | ROW | enabled | public.validate_ponto_compliance |
| trg_consolidar_batidas | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_consolidar_batidas |
| trg_enforce_batida_ponto_hash | BEFORE | INSERT | ROW | enabled | public.enforce_batida_ponto_hash |
| trg_impedir_alteracao_batida_periodo_fechado_upd | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_batida_em_periodo_fechado |
| trg_impedir_delete_batida_periodo_fechado | BEFORE | DELETE | ROW | enabled | public.impedir_alteracao_batida_em_periodo_fechado |
| trigger_imutabilidade_ponto | BEFORE | DELETE | ROW | enabled | public.proibir_delete_ponto |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
