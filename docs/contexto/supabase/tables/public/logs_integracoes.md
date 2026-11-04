# public.logs_integracoes

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `integracao_id` | `uuid` | sim |  |  |  |
| 3 | `tipo` | `text` | sim |  |  |  |
| 4 | `mensagem` | `text` | sim |  |  |  |
| 5 | `detalhes` | `jsonb` | sim |  |  |  |
| 6 | `status` | `text` | sim | `'info'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| logs_integracoes_integracao_id_fkey | FOREIGN KEY | `FOREIGN KEY (integracao_id) REFERENCES integracoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| logs_integracoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_logs_integracoes_integracao_id | btree | integracao_id | não | sim |  | `CREATE INDEX idx_logs_integracoes_integracao_id ON public.logs_integracoes USING btree (integracao_id)` |
| logs_integracoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX logs_integracoes_pkey ON public.logs_integracoes USING btree (id)` |


## Policies (RLS)

### `Admins can insert logs_integracoes`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(auth.uid())` |

### `Admins can view logs_integracoes`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_logs_integracoes_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_logs_integracoes_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
