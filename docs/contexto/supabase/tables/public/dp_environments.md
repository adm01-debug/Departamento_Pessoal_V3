# public.dp_environments

> Definicao de ambientes e suas politicas de RTO/RPO.
REGRA: apenas production tem is_production=true. CI so pode apontar para ci_allowed=true.

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
| 2 | `env_name` | `text` | não |  |  |  |
| 3 | `supabase_ref` | `text` | sim |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `is_production` | `boolean` | não | `false` |  |  |
| 6 | `ci_allowed` | `boolean` | não | `false` |  |  |
| 7 | `rto_minutes` | `integer` | sim |  |  |  |
| 8 | `rpo_minutes` | `integer` | sim |  |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_environments_env_name_key | UNIQUE | `UNIQUE (env_name)` |  |  | sim |
| dp_environments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_environments_env_name_key | btree | env_name | sim | sim |  | `CREATE UNIQUE INDEX dp_environments_env_name_key ON public.dp_environments USING btree (env_name)` |
| dp_environments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_environments_pkey ON public.dp_environments USING btree (id)` |


## Policies (RLS)

### `service_role_env`

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
