# public.webhooks

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `url` | `text` | não |  |  |  |
| 5 | `ativo` | `boolean` | sim | `true` |  |  |
| 6 | `eventos` | `text[]` | sim | `'{}'::text[]` |  |  |
| 7 | `max_tentativas` | `integer` | sim | `3` |  |  |
| 8 | `timeout_segundos` | `integer` | sim | `30` |  |  |
| 9 | `retry_intervalo_segundos` | `integer` | sim | `60` |  |  |
| 10 | `ultimo_status` | `integer` | sim |  |  |  |
| 11 | `ultimo_erro` | `text` | sim |  |  |  |
| 12 | `ultima_execucao` | `timestamp with time zone` | sim |  |  |  |
| 13 | `total_sucesso` | `integer` | sim | `0` |  |  |
| 14 | `total_falha` | `integer` | sim | `0` |  |  |
| 15 | `secret` | `text` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhooks_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| webhooks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.webhook_logs | webhook_logs_webhook_id_fkey | webhook_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhooks_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_webhooks_empresa_id ON public.webhooks USING btree (empresa_id)` |
| webhooks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhooks_pkey ON public.webhooks USING btree (id)` |


## Policies (RLS)

### `tenant_webhooks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_webhooks_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
