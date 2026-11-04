# public.registros_ponto

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
| usada por views | public.pontos_abertos, public.vw_folha_ponto_mensal, public.vw_kpi_ponto_resumo, public.vw_saldo_compensacao_mensal |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `data` | `date` | não |  |  |  |
| 4 | `entrada_1` | `time without time zone` | sim |  |  |  |
| 5 | `saida_1` | `time without time zone` | sim |  |  |  |
| 6 | `entrada_2` | `time without time zone` | sim |  |  |  |
| 7 | `saida_2` | `time without time zone` | sim |  |  |  |
| 8 | `entrada_3` | `time without time zone` | sim |  |  |  |
| 9 | `saida_3` | `time without time zone` | sim |  |  |  |
| 10 | `horas_trabalhadas` | `interval` | sim |  |  |  |
| 11 | `horas_extras` | `interval` | sim | `'00:00:00'::interval` |  |  |
| 12 | `horas_falta` | `interval` | sim | `'00:00:00'::interval` |  |  |
| 13 | `tipo_dia` | `character varying(20)` | sim | `'normal'::character varying` |  |  |
| 14 | `justificativa` | `text` | sim |  |  |  |
| 15 | `aprovado` | `boolean` | sim | `false` |  |  |
| 16 | `aprovado_por` | `uuid` | sim |  |  |  |
| 17 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 18 | `observacoes` | `text` | sim |  |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `created_by` | `uuid` | sim |  |  |  |
| 21 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `empresa_id` | `uuid` | sim |  |  |  |
| 23 | `saida_intervalo` | `text` | sim |  |  |  |
| 24 | `retorno_intervalo` | `text` | sim |  |  |  |
| 25 | `atraso_minutos` | `integer` | sim | `0` |  |  |
| 26 | `total_batidas` | `integer` | sim | `0` |  |  |
| 27 | `entrada_esperada` | `text` | sim |  |  |  |
| 28 | `saida_esperada` | `text` | sim |  |  |  |
| 29 | `entrada_4` | `text` | sim |  |  |  |
| 30 | `saida_4` | `text` | sim |  |  |  |
| 31 | `entrada_5` | `text` | sim |  |  |  |
| 32 | `saida_5` | `text` | sim |  |  |  |
| 33 | `entrada_6` | `text` | sim |  |  |  |
| 34 | `saida_6` | `text` | sim |  |  |  |
| 35 | `saida_antecipada_minutos` | `integer` | sim | `0` |  |  |
| 36 | `hash_digital` | `text` | sim |  |  |  |
| 37 | `dispositivo_id` | `text` | sim |  |  |  |
| 38 | `versao_app` | `text` | sim |  |  |  |
| 39 | `timezone` | `text` | sim | `'America/Sao_Paulo'::text` |  |  |
| 40 | `is_offline` | `boolean` | sim | `false` |  |  |
| 41 | `sync_at` | `timestamp with time zone` | sim |  |  |  |
| 42 | `hash_integridade` | `text` | sim |  |  |  |
| 43 | `version` | `integer` | sim | `1` |  |  |
| 44 | `horas_extras_50` | `interval` | sim |  |  |  |
| 45 | `horas_extras_100` | `interval` | sim |  |  |  |
| 46 | `horas_noturnas` | `interval` | sim |  |  |  |
| 47 | `he_banco_horas` | `interval` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| registros_ponto_colaborador_data_uq | UNIQUE | `UNIQUE (colaborador_id, data)` |  |  | sim |
| registros_ponto_colaborador_id_data_key | UNIQUE | `UNIQUE (colaborador_id, data)` |  |  | sim |
| registros_ponto_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| registros_ponto_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| registros_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| registros_ponto_tipo_dia_check | CHECK | `CHECK (tipo_dia::text = ANY (ARRAY['normal'::character varying::text, 'feriado'::character varying::text, 'compensado'::character varying::text, 'folga'::character varying::text, 'falta'::character varying::text, 'atestado'::character varying::text, 'ferias'::character varying::text, 'licenca'::character varying::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ajustes_ponto | ajustes_ponto_registro_ponto_id_fkey | registro_ponto_id | CASCADE |
| public.banco_horas | banco_horas_registro_ponto_id_fkey | registro_ponto_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_registros_ponto_colab_aprovado | btree | colaborador_id, data | não | sim | `(aprovado = true)` | `CREATE INDEX idx_registros_ponto_colab_aprovado ON public.registros_ponto USING btree (colaborador_id, data) WHERE (aprovado = true)` |
| idx_registros_ponto_colab_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_registros_ponto_colab_data ON public.registros_ponto USING btree (colaborador_id, data)` |
| idx_registros_ponto_colaborador_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_registros_ponto_colaborador_data ON public.registros_ponto USING btree (colaborador_id, data)` |
| idx_registros_ponto_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_registros_ponto_colaborador_id ON public.registros_ponto USING btree (colaborador_id)` |
| idx_registros_ponto_empresa_data | btree | empresa_id, data | não | sim |  | `CREATE INDEX idx_registros_ponto_empresa_data ON public.registros_ponto USING btree (empresa_id, data DESC)` |
| idx_registros_ponto_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_registros_ponto_empresa_id ON public.registros_ponto USING btree (empresa_id)` |
| registros_ponto_colaborador_data_uq | btree | colaborador_id, data | sim | sim |  | `CREATE UNIQUE INDEX registros_ponto_colaborador_data_uq ON public.registros_ponto USING btree (colaborador_id, data)` |
| registros_ponto_colaborador_id_data_key | btree | colaborador_id, data | sim | sim |  | `CREATE UNIQUE INDEX registros_ponto_colaborador_id_data_key ON public.registros_ponto USING btree (colaborador_id, data)` |
| registros_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX registros_ponto_pkey ON public.registros_ponto USING btree (id)` |


## Policies (RLS)

### `registros_ponto_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `registros_ponto_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (sou_o_colaborador(colaborador_id) OR pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id)))` |
| WITH CHECK | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (sou_o_colaborador(colaborador_id) OR pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_registros_ponto | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_auditoria_registros_ponto | AFTER | DELETE OR UPDATE | ROW | enabled | public.registrar_auditoria_ponto |
| tr_gerar_hash_ponto | BEFORE | INSERT | ROW | enabled | public.gerar_hash_ponto |
| tr_increment_version_ponto | BEFORE | UPDATE | ROW | enabled | public.increment_version |
| update_registros_ponto_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
