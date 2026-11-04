# public.sst_cat_anexos

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
| 2 | `cat_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `file_url` | `text` | não |  |  |  |
| 5 | `file_name` | `text` | não |  |  |  |
| 6 | `file_size_bytes` | `bigint` | sim |  |  |  |
| 7 | `uploaded_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_cat_anexos_cat_id_fkey | FOREIGN KEY | `FOREIGN KEY (cat_id) REFERENCES sst_cat(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_cat_anexos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_cat_anexos_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['atestado'::text, 'bo'::text, 'laudo'::text, 'foto'::text, 'outros'::text]))` |  |  | sim |
| sst_cat_anexos_uploaded_by_fkey | FOREIGN KEY | `FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_cat_anexos_cat | btree | cat_id | não | sim |  | `CREATE INDEX idx_sst_cat_anexos_cat ON public.sst_cat_anexos USING btree (cat_id)` |
| idx_sst_cat_anexos_uploaded_by | btree | uploaded_by | não | sim |  | `CREATE INDEX idx_sst_cat_anexos_uploaded_by ON public.sst_cat_anexos USING btree (uploaded_by)` |
| sst_cat_anexos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_cat_anexos_pkey ON public.sst_cat_anexos USING btree (id)` |


## Policies (RLS)

### `cat_anexos_por_empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (sst_cat c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = sst_cat_anexos.cat_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (sst_cat c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = sst_cat_anexos.cat_id) AND (ue.user_id = auth.uid()))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
