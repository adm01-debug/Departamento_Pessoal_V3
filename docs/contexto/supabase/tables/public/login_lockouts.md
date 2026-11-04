# public.login_lockouts

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
| 4 | `attempts` | `integer` | não | `0` |  |  |
| 5 | `is_locked` | `boolean` | não | `false` |  |  |
| 6 | `lockout_until` | `timestamp with time zone` | sim |  |  |  |
| 7 | `last_attempt` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_lockouts_identifier_identifier_type_key | UNIQUE | `UNIQUE (identifier, identifier_type)` |  |  | sim |
| login_lockouts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| login_lockouts_identifier_identifier_type_key | btree | identifier, identifier_type | sim | sim |  | `CREATE UNIQUE INDEX login_lockouts_identifier_identifier_type_key ON public.login_lockouts USING btree (identifier, identifier_type)` |
| login_lockouts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_lockouts_pkey ON public.login_lockouts USING btree (id)` |


## Policies (RLS)

### `login_lockouts_service_role_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
