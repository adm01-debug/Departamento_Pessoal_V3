# public.sst_extintores_inspecoes

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
| 2 | `extintor_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `data_inspecao` | `date` | não | `CURRENT_DATE` |  |  |
| 5 | `inspetor_id` | `uuid` | sim |  |  |  |
| 6 | `inspetor_nome` | `text` | não |  |  |  |
| 7 | `lacre_ok` | `boolean` | não | `true` |  |  |
| 8 | `pressao_ok` | `boolean` | não | `true` |  |  |
| 9 | `mangueira_ok` | `boolean` | não | `true` |  |  |
| 10 | `sinalizacao_ok` | `boolean` | não | `true` |  |  |
| 11 | `acesso_desobstruido` | `boolean` | não | `true` |  |  |
| 12 | `altura_correta` | `boolean` | não | `true` |  |  |
| 13 | `corpo_integro` | `boolean` | não | `true` |  |  |
| 14 | `resultado` | `text` | não |  |  |  |
| 15 | `observacoes` | `text` | sim |  |  |  |
| 16 | `foto_url` | `text` | sim |  |  |  |
| 17 | `latitude` | `numeric(10,7)` | sim |  |  |  |
| 18 | `longitude` | `numeric(10,7)` | sim |  |  |  |
| 19 | `ip_address` | `inet` | sim |  |  |  |
| 20 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_extintores_inspecoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_extintores_inspecoes_extintor_id_fkey | FOREIGN KEY | `FOREIGN KEY (extintor_id) REFERENCES sst_extintores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_extintores_inspecoes_inspetor_id_fkey | FOREIGN KEY | `FOREIGN KEY (inspetor_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sst_extintores_inspecoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_extintores_inspecoes_resultado_check | CHECK | `CHECK (resultado = ANY (ARRAY['CONFORME'::text, 'NAO_CONFORME'::text, 'REQUER_MANUTENCAO'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_insp_empresa_data | btree | empresa_id, data_inspecao | não | sim |  | `CREATE INDEX idx_insp_empresa_data ON public.sst_extintores_inspecoes USING btree (empresa_id, data_inspecao DESC)` |
| idx_insp_extintor | btree | extintor_id, data_inspecao | não | sim |  | `CREATE INDEX idx_insp_extintor ON public.sst_extintores_inspecoes USING btree (extintor_id, data_inspecao DESC)` |
| idx_sst_extint_insp_inspetor | btree | inspetor_id | não | sim |  | `CREATE INDEX idx_sst_extint_insp_inspetor ON public.sst_extintores_inspecoes USING btree (inspetor_id)` |
| sst_extintores_inspecoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_extintores_inspecoes_pkey ON public.sst_extintores_inspecoes USING btree (id)` |


## Policies (RLS)

### `Users manage inspecoes from their empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |
| WITH CHECK | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
