# public.sst_programas

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
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `data_emissao` | `date` | não |  |  |  |
| 6 | `data_validade` | `date` | não |  |  |  |
| 7 | `responsavel_tecnico` | `text` | sim |  |  |  |
| 8 | `registro_profissional` | `text` | sim |  |  |  |
| 9 | `arquivo_url` | `text` | sim |  |  |  |
| 10 | `status` | `text` | sim | `'ativo'::text` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `hash_sha256` | `text` | sim |  |  |  |
| 14 | `versao` | `integer` | não | `1` |  |  |
| 15 | `gerado_por` | `uuid` | sim |  |  |  |
| 16 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_programas_gerado_por_fkey | FOREIGN KEY | `FOREIGN KEY (gerado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_programas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_programas_gerado_por | btree | gerado_por | não | sim |  | `CREATE INDEX idx_sst_programas_gerado_por ON public.sst_programas USING btree (gerado_por)` |
| sst_programas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_programas_pkey ON public.sst_programas USING btree (id)` |
| uq_sst_programa_ativo | btree | empresa_id, tipo | sim | sim | `(status = 'ativo'::text)` | `CREATE UNIQUE INDEX uq_sst_programa_ativo ON public.sst_programas USING btree (empresa_id, tipo) WHERE (status = 'ativo'::text)` |


## Policies (RLS)

### `Gestores veem programas de SST`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'rh'::app_role, 'gestor'::app_role]))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
