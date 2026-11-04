# public.medidas_disciplinares_workflow_log

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
| 2 | `medida_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `de_status` | `text` | sim |  |  |  |
| 5 | `para_status` | `text` | não |  |  |  |
| 6 | `acao` | `text` | não |  |  |  |
| 7 | `ator_id` | `uuid` | sim |  |  |  |
| 8 | `observacao` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medidas_disciplinares_workflow_log_ator_id_fkey | FOREIGN KEY | `FOREIGN KEY (ator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_workflow_log_medida_id_fkey | FOREIGN KEY | `FOREIGN KEY (medida_id) REFERENCES medidas_disciplinares(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| medidas_disciplinares_workflow_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_medidas_wf_log_medida | btree | medida_id, created_at | não | sim |  | `CREATE INDEX idx_medidas_wf_log_medida ON public.medidas_disciplinares_workflow_log USING btree (medida_id, created_at DESC)` |
| medidas_disciplinares_workflow_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medidas_disciplinares_workflow_log_pkey ON public.medidas_disciplinares_workflow_log USING btree (id)` |


## Policies (RLS)

### `medidas_wf_log_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
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
