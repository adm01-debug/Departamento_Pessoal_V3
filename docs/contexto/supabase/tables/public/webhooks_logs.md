# public.webhooks_logs

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
| 2 | `webhook_id` | `uuid` | sim |  |  |  |
| 3 | `evento` | `text` | não |  |  |  |
| 4 | `payload` | `jsonb` | sim |  |  |  |
| 5 | `status_code` | `integer` | sim |  |  |  |
| 6 | `resposta` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhooks_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhooks_logs_webhook_id_fkey | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES webhooks_config(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhooks_logs_webhook_id | btree | webhook_id | não | sim |  | `CREATE INDEX idx_webhooks_logs_webhook_id ON public.webhooks_logs USING btree (webhook_id)` |
| webhooks_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhooks_logs_pkey ON public.webhooks_logs USING btree (id)` |


## Policies (RLS)

### `tenant_webhooks_logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(webhook_id IN ( SELECT webhooks_config.id    FROM webhooks_config   WHERE (webhooks_config.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(webhook_id IN ( SELECT webhooks_config.id    FROM webhooks_config   WHERE (webhooks_config.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_webhooks_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_webhooks_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
