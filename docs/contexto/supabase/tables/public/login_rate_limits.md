# public.login_rate_limits

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
| 2 | `identifier` | `text` | não |  |  |  |
| 3 | `identifier_type` | `text` | não | `'email'::text` |  |  |
| 4 | `failed_attempts` | `integer` | não | `0` |  |  |
| 5 | `locked_until` | `timestamp with time zone` | sim |  |  |  |
| 6 | `last_attempt_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_rate_limits_identifier_identifier_type_key | UNIQUE | `UNIQUE (identifier, identifier_type)` |  |  | sim |
| login_rate_limits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_login_rate_limits_identifier | btree | identifier, identifier_type | não | sim |  | `CREATE INDEX idx_login_rate_limits_identifier ON public.login_rate_limits USING btree (identifier, identifier_type)` |
| idx_login_rate_limits_locked_until | btree | locked_until | não | sim |  | `CREATE INDEX idx_login_rate_limits_locked_until ON public.login_rate_limits USING btree (locked_until)` |
| login_rate_limits_identifier_identifier_type_key | btree | identifier, identifier_type | sim | sim |  | `CREATE UNIQUE INDEX login_rate_limits_identifier_identifier_type_key ON public.login_rate_limits USING btree (identifier, identifier_type)` |
| login_rate_limits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_rate_limits_pkey ON public.login_rate_limits USING btree (id)` |


## Policies (RLS)

### `Admins can manage rate limits`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
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
