# public.integracao_logs

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
| 2 | `servico` | `text` | não |  |  |  |
| 3 | `operacao` | `text` | não |  |  |  |
| 4 | `status_code` | `integer` | sim |  |  |  |
| 5 | `payload_envio` | `jsonb` | sim |  |  |  |
| 6 | `payload_retorno` | `jsonb` | sim |  |  |  |
| 7 | `erro` | `text` | sim |  |  |  |
| 8 | `duracao_ms` | `integer` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| integracao_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| integracao_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX integracao_logs_pkey ON public.integracao_logs USING btree (id)` |


## Policies (RLS)

### `integracao_logs_admin_read`

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
| trg_integracao_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_integracao_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
