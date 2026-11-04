# public.webhook_logs

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
| 2 | `webhook_id` | `uuid` | não |  |  |  |
| 3 | `evento` | `text` | não |  |  |  |
| 4 | `payload` | `jsonb` | sim |  |  |  |
| 5 | `status_code` | `integer` | sim |  |  |  |
| 6 | `resposta` | `text` | sim |  |  |  |
| 7 | `tentativa` | `integer` | sim | `1` |  |  |
| 8 | `erro` | `text` | sim |  |  |  |
| 9 | `duracao_ms` | `integer` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `event_id` | `text` | sim |  |  |  |
| 12 | `status` | `text` | sim |  |  |  |
| 13 | `version` | `text` | sim |  |  |  |
| 14 | `headers` | `jsonb` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_logs_webhook_id_fkey | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_logs_webhook_id | btree | webhook_id | não | sim |  | `CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs USING btree (webhook_id)` |
| webhook_logs_event_id_unique | btree | event_id | sim | sim | `(event_id IS NOT NULL)` | `CREATE UNIQUE INDEX webhook_logs_event_id_unique ON public.webhook_logs USING btree (event_id) WHERE (event_id IS NOT NULL)` |
| webhook_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_logs_pkey ON public.webhook_logs USING btree (id)` |
| webhook_logs_status_created_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` | `CREATE INDEX webhook_logs_status_created_idx ON public.webhook_logs USING btree (status, created_at DESC) WHERE (status IS NOT NULL)` |


## Policies (RLS)

### `tenant_webhook_logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(webhook_id IN ( SELECT webhooks.id    FROM webhooks   WHERE (webhooks.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(webhook_id IN ( SELECT webhooks.id    FROM webhooks   WHERE (webhooks.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_webhook_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_webhook_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
