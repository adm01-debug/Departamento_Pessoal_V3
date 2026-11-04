# public.logs_sincronizacao

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
| 3 | `sistema_externo` | `text` | não |  |  |  |
| 4 | `tipo_entidade` | `text` | não |  |  |  |
| 5 | `status` | `text` | não |  |  |  |
| 6 | `mensagem` | `text` | sim |  |  |  |
| 7 | `payload_enviado` | `jsonb` | sim |  |  |  |
| 8 | `resposta_recebida` | `jsonb` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| logs_sincronizacao_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| logs_sincronizacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_logs_sincronizacao_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_logs_sincronizacao_empresa_id ON public.logs_sincronizacao USING btree (empresa_id)` |
| logs_sincronizacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX logs_sincronizacao_pkey ON public.logs_sincronizacao USING btree (id)` |


## Policies (RLS)

### `Users can view their company sync logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_logs_sincronizacao_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_logs_sincronizacao_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
