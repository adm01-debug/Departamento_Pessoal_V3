# public.rate_limit_config

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | sim |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `endpoint` | `text` | não |  |  |  |
| 3 | `max_requests` | `integer` | não | `100` |  |  |
| 4 | `window_seconds` | `integer` | não | `60` |  |  |
| 5 | `block_duration_seconds` | `integer` | não | `3600` |  |  |
| 6 | `enabled` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rate_limit_config_endpoint_key | UNIQUE | `UNIQUE (endpoint)` |  |  | sim |
| rate_limit_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| rate_limit_config_endpoint_key | btree | endpoint | sim | sim |  | `CREATE UNIQUE INDEX rate_limit_config_endpoint_key ON public.rate_limit_config USING btree (endpoint)` |
| rate_limit_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX rate_limit_config_pkey ON public.rate_limit_config USING btree (id)` |


## Policies (RLS)

### `Admins can manage rate limit config`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
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
