# public.webhooks_config

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
| 3 | `url` | `text` | não |  |  |  |
| 4 | `eventos` | `text[]` | não | `'{}'::text[]` |  |  |
| 5 | `ativo` | `boolean` | sim | `true` |  |  |
| 6 | `secret` | `text` | sim |  |  |  |
| 7 | `ultimo_envio` | `timestamp with time zone` | sim |  |  |  |
| 8 | `ultimo_status` | `integer` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhooks_config_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| webhooks_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.webhooks_logs | webhooks_logs_webhook_id_fkey | webhook_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhooks_config_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_webhooks_config_empresa_id ON public.webhooks_config USING btree (empresa_id)` |
| webhooks_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhooks_config_pkey ON public.webhooks_config USING btree (id)` |


## Policies (RLS)

### `tenant_webhooks_config`

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
| update_webhooks_config_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
