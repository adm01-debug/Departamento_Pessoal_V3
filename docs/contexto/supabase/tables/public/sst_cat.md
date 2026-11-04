# public.sst_cat

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `data_acidente` | `timestamp with time zone` | não |  |  |  |
| 5 | `tipo_acidente` | `text` | não |  |  |  |
| 6 | `local_acidente` | `text` | sim |  |  |  |
| 7 | `parte_corpo_atingida` | `text` | sim |  |  |  |
| 8 | `agente_causador` | `text` | sim |  |  |  |
| 9 | `houve_afastamento` | `boolean` | sim | `false` |  |  |
| 10 | `houve_obito` | `boolean` | sim | `false` |  |  |
| 11 | `status_esocial` | `text` | sim | `'pendente'::text` |  |  |
| 12 | `protocolo_esocial` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `created_by` | `uuid` | sim |  |  |  |
| 15 | `hash_integridade` | `text` | sim |  |  |  |
| 16 | `numero_cat` | `text` | sim |  |  |  |
| 17 | `tipo_cat` | `text` | não | `'inicial'::text` |  |  |
| 18 | `cid_principal` | `text` | sim |  |  |  |
| 19 | `cid_secundarios` | `text[]` | sim |  |  |  |
| 20 | `parte_corpo_codigo` | `text` | sim |  |  |  |
| 21 | `agente_causador_codigo` | `text` | sim |  |  |  |
| 22 | `situacao_geradora` | `text` | sim |  |  |  |
| 23 | `hora_acidente` | `time without time zone` | sim |  |  |  |
| 24 | `minutos_trabalhados_antes` | `integer` | sim |  |  |  |
| 25 | `tipo_local` | `text` | sim |  |  |  |
| 26 | `especificacao_local` | `text` | sim |  |  |  |
| 27 | `ultimo_dia_trabalhado` | `date` | sim |  |  |  |
| 28 | `houve_internacao` | `boolean` | sim | `false` |  |  |
| 29 | `iniciativa_cat` | `text` | sim | `'empregador'::text` |  |  |
| 30 | `observacoes` | `text` | sim |  |  |  |
| 31 | `cat_origem_id` | `uuid` | sim |  |  |  |
| 32 | `retifica_cat_id` | `uuid` | sim |  |  |  |
| 33 | `atestado_medico_url` | `text` | sim |  |  |  |
| 34 | `boletim_ocorrencia_url` | `text` | sim |  |  |  |
| 35 | `prazo_limite_envio` | `timestamp with time zone` | sim |  |  |  |
| 36 | `data_envio_esocial` | `timestamp with time zone` | sim |  |  |  |
| 37 | `evento_esocial_id` | `uuid` | sim |  |  |  |
| 38 | `dias_afastamento_estimado` | `integer` | sim |  |  |  |
| 39 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_cat_cat_origem_id_fkey | FOREIGN KEY | `FOREIGN KEY (cat_origem_id) REFERENCES sst_cat(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_cat_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_cat_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_cat_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| sst_cat_iniciativa_cat_check | CHECK | `CHECK (iniciativa_cat = ANY (ARRAY['empregador'::text, 'ordem_judicial'::text, 'determinacao_orgao_fiscalizador'::text]))` |  |  | sim |
| sst_cat_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_cat_retifica_cat_id_fkey | FOREIGN KEY | `FOREIGN KEY (retifica_cat_id) REFERENCES sst_cat(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_cat_tipo_cat_check | CHECK | `CHECK (tipo_cat = ANY (ARRAY['inicial'::text, 'reabertura'::text, 'comunicacao_obito'::text]))` |  |  | sim |
| sst_cat_tipo_local_check | CHECK | `CHECK (tipo_local = ANY (ARRAY['estabelecimento_empregador'::text, 'via_publica'::text, 'area_rural'::text, 'outros'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sst_cat | sst_cat_cat_origem_id_fkey | cat_origem_id | SET NULL |
| public.sst_cat | sst_cat_retifica_cat_id_fkey | retifica_cat_id | SET NULL |
| public.sst_cat_anexos | sst_cat_anexos_cat_id_fkey | cat_id | CASCADE |
| public.sst_cat_testemunhas | sst_cat_testemunhas_cat_id_fkey | cat_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_cat_cat_origem_id | btree | cat_origem_id | não | sim |  | `CREATE INDEX idx_sst_cat_cat_origem_id ON public.sst_cat USING btree (cat_origem_id)` |
| idx_sst_cat_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_sst_cat_colaborador_id ON public.sst_cat USING btree (colaborador_id)` |
| idx_sst_cat_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_sst_cat_created_by ON public.sst_cat USING btree (created_by)` |
| idx_sst_cat_data | btree | data_acidente | não | sim |  | `CREATE INDEX idx_sst_cat_data ON public.sst_cat USING btree (data_acidente DESC)` |
| idx_sst_cat_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_sst_cat_empresa_id ON public.sst_cat USING btree (empresa_id)` |
| idx_sst_cat_prazo | btree | prazo_limite_envio | não | sim | `(data_envio_esocial IS NULL)` | `CREATE INDEX idx_sst_cat_prazo ON public.sst_cat USING btree (prazo_limite_envio) WHERE (data_envio_esocial IS NULL)` |
| idx_sst_cat_retifica_cat_id | btree | retifica_cat_id | não | sim |  | `CREATE INDEX idx_sst_cat_retifica_cat_id ON public.sst_cat USING btree (retifica_cat_id)` |
| idx_sst_cat_status | btree | status_esocial | não | sim |  | `CREATE INDEX idx_sst_cat_status ON public.sst_cat USING btree (status_esocial)` |
| sst_cat_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_cat_pkey ON public.sst_cat USING btree (id)` |


## Policies (RLS)

### `cat_insert_por_empresa`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.empresa_id = sst_cat.empresa_id) AND (ue.user_id = auth.uid()))))` |

### `cat_select_por_empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.empresa_id = sst_cat.empresa_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK |  |

### `cat_update_por_empresa`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.empresa_id = sst_cat.empresa_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_calcular_prazo_cat | BEFORE | INSERT | ROW | enabled | public.calcular_prazo_cat |
| tr_enforce_cat_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_cat_hash |
| tr_impedir_alteracao_cat_transmitida | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_cat_transmitida |
| tr_proibir_delete_cat_transmitida | BEFORE | DELETE | ROW | enabled | public.proibir_delete_cat_transmitida |
| tr_updated_at_sst_cat | BEFORE | UPDATE | ROW | enabled | public.set_updated_at_sst_cat |
| trigger_auditoria_sst_cat | AFTER | INSERT OR UPDATE | ROW | enabled | public.registrar_auditoria_sst |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
