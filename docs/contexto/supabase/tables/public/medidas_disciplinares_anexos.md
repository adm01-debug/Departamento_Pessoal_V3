# public.medidas_disciplinares_anexos

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
| 2 | `medida_id` | `uuid` | sim |  |  |  |
| 3 | `nome_arquivo` | `text` | não |  |  |  |
| 4 | `storage_path` | `text` | não |  |  |  |
| 5 | `tipo_arquivo` | `text` | sim |  |  |  |
| 6 | `uploaded_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `tipo` | `text` | sim | `'evidencia'::text` |  |  |
| 9 | `tamanho_bytes` | `bigint` | sim |  |  |  |
| 10 | `mime_type` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medidas_disciplinares_anexos_medida_id_fkey | FOREIGN KEY | `FOREIGN KEY (medida_id) REFERENCES medidas_disciplinares(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_disciplinares_anexos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| medidas_disciplinares_anexos_uploaded_by_fkey | FOREIGN KEY | `FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_medidas_disciplinares_anexos_medida_id | btree | medida_id | não | sim |  | `CREATE INDEX idx_medidas_disciplinares_anexos_medida_id ON public.medidas_disciplinares_anexos USING btree (medida_id)` |
| idx_medidas_disciplinares_anexos_uploaded_by | btree | uploaded_by | não | sim |  | `CREATE INDEX idx_medidas_disciplinares_anexos_uploaded_by ON public.medidas_disciplinares_anexos USING btree (uploaded_by)` |
| medidas_disciplinares_anexos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medidas_disciplinares_anexos_pkey ON public.medidas_disciplinares_anexos USING btree (id)` |


## Policies (RLS)

### `Gestores e RH gerenciam anexos disciplinares`

| campo | valor |
|---|---|
| comando | ALL |
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
