# public.geo_blocking_config

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
| 2 | `enabled` | `boolean` | sim | `false` |  |  |
| 3 | `block_unknown_countries` | `boolean` | sim | `true` |  |  |
| 4 | `log_blocked_attempts` | `boolean` | sim | `true` |  |  |
| 5 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_blocking_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| geo_blocking_config_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_blocking_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_blocking_config_pkey ON public.geo_blocking_config USING btree (id)` |
| idx_geo_blocking_config_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_geo_blocking_config_updated_by ON public.geo_blocking_config USING btree (updated_by)` |


## Policies (RLS)

### `Admins can manage geo_blocking_config`

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
