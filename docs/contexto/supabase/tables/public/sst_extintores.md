# public.sst_extintores

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `codigo_patrimonio` | `text` | não |  |  |  |
| 4 | `numero_serie` | `text` | sim |  |  |  |
| 5 | `tipo` | `text` | não |  |  |  |
| 6 | `capacidade_kg` | `numeric(6,2)` | não |  |  |  |
| 7 | `fabricante` | `text` | sim |  |  |  |
| 8 | `data_fabricacao` | `date` | sim |  |  |  |
| 9 | `data_ultima_recarga` | `date` | sim |  |  |  |
| 10 | `data_proxima_recarga` | `date` | não |  |  |  |
| 11 | `data_ultimo_teste_hidrostatico` | `date` | sim |  |  |  |
| 12 | `data_proximo_teste_hidrostatico` | `date` | não |  |  |  |
| 13 | `localizacao` | `text` | não |  |  |  |
| 14 | `local_trabalho_id` | `uuid` | sim |  |  |  |
| 15 | `latitude` | `numeric(10,7)` | sim |  |  |  |
| 16 | `longitude` | `numeric(10,7)` | sim |  |  |  |
| 17 | `qr_code` | `text` | sim |  |  |  |
| 18 | `status` | `text` | não | `'ATIVO'::text` |  |  |
| 19 | `observacoes` | `text` | sim |  |  |  |
| 20 | `created_by` | `uuid` | sim |  |  |  |
| 21 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 23 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_extintores_capacidade_kg_check | CHECK | `CHECK (capacidade_kg > 0::numeric)` |  |  | sim |
| sst_extintores_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sst_extintores_empresa_id_codigo_patrimonio_key | UNIQUE | `UNIQUE (empresa_id, codigo_patrimonio)` |  |  | sim |
| sst_extintores_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_extintores_local_trabalho_id_fkey | FOREIGN KEY | `FOREIGN KEY (local_trabalho_id) REFERENCES locais_trabalho(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_extintores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_extintores_qr_code_key | UNIQUE | `UNIQUE (qr_code)` |  |  | sim |
| sst_extintores_status_check | CHECK | `CHECK (status = ANY (ARRAY['ATIVO'::text, 'MANUTENCAO'::text, 'VENCIDO'::text, 'DESATIVADO'::text, 'EXTRAVIADO'::text]))` |  |  | sim |
| sst_extintores_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['AGUA'::text, 'PO_QUIMICO_ABC'::text, 'PO_QUIMICO_BC'::text, 'CO2'::text, 'ESPUMA'::text, 'CLASSE_K'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sst_extintores_inspecoes | sst_extintores_inspecoes_extintor_id_fkey | extintor_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_extintores_empresa | btree | empresa_id | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_extintores_empresa ON public.sst_extintores USING btree (empresa_id) WHERE (deleted_at IS NULL)` |
| idx_extintores_hidro | btree | empresa_id, data_proximo_teste_hidrostatico | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_extintores_hidro ON public.sst_extintores USING btree (empresa_id, data_proximo_teste_hidrostatico) WHERE (deleted_at IS NULL)` |
| idx_extintores_recarga | btree | empresa_id, data_proxima_recarga | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_extintores_recarga ON public.sst_extintores USING btree (empresa_id, data_proxima_recarga) WHERE (deleted_at IS NULL)` |
| idx_extintores_status | btree | empresa_id, status | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_extintores_status ON public.sst_extintores USING btree (empresa_id, status) WHERE (deleted_at IS NULL)` |
| idx_sst_extintores_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_sst_extintores_created_by ON public.sst_extintores USING btree (created_by)` |
| idx_sst_extintores_local_id | btree | local_trabalho_id | não | sim |  | `CREATE INDEX idx_sst_extintores_local_id ON public.sst_extintores USING btree (local_trabalho_id)` |
| sst_extintores_empresa_id_codigo_patrimonio_key | btree | empresa_id, codigo_patrimonio | sim | sim |  | `CREATE UNIQUE INDEX sst_extintores_empresa_id_codigo_patrimonio_key ON public.sst_extintores USING btree (empresa_id, codigo_patrimonio)` |
| sst_extintores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_extintores_pkey ON public.sst_extintores USING btree (id)` |
| sst_extintores_qr_code_key | btree | qr_code | sim | sim |  | `CREATE UNIQUE INDEX sst_extintores_qr_code_key ON public.sst_extintores USING btree (qr_code)` |


## Policies (RLS)

### `Users manage extintores from their empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |
| WITH CHECK | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_extintor_vencimento | BEFORE | INSERT OR UPDATE | ROW | enabled | public.update_extintor_status_vencimento |
| trg_gerar_qr_extintor | BEFORE | INSERT | ROW | enabled | public.gerar_qr_extintor |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
