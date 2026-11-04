# public.medidas_disciplinares_contestacao_anexos

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
| 2 | `medida_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `storage_path` | `text` | não |  |  |  |
| 5 | `nome_arquivo` | `text` | não |  |  |  |
| 6 | `mime_type` | `text` | sim |  |  |  |
| 7 | `tamanho_bytes` | `bigint` | sim |  |  |  |
| 8 | `hash_sha256` | `text` | sim |  |  |  |
| 9 | `uploaded_by` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medidas_disciplinares_contestacao_anexos_medida_id_fkey | FOREIGN KEY | `FOREIGN KEY (medida_id) REFERENCES medidas_disciplinares(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_disciplinares_contestacao_anexos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_medida_contest_anexos_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_medida_contest_anexos_empresa ON public.medidas_disciplinares_contestacao_anexos USING btree (empresa_id)` |
| idx_medida_contest_anexos_medida | btree | medida_id | não | sim |  | `CREATE INDEX idx_medida_contest_anexos_medida ON public.medidas_disciplinares_contestacao_anexos USING btree (medida_id)` |
| medidas_disciplinares_contestacao_anexos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medidas_disciplinares_contestacao_anexos_pkey ON public.medidas_disciplinares_contestacao_anexos USING btree (id)` |


## Policies (RLS)

### `contest_anexos_delete_empresa`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |
| WITH CHECK |  |

### `contest_anexos_insert_empresa`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |

### `contest_anexos_select_empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |
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
