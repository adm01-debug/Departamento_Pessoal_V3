# public.password_reset_config

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
| 2 | `require_approval` | `boolean` | sim | `true` |  |  |
| 3 | `auto_expire_hours` | `integer` | sim | `24` |  |  |
| 4 | `notify_admins` | `boolean` | sim | `true` |  |  |
| 5 | `notify_user_on_approval` | `boolean` | sim | `true` |  |  |
| 6 | `notify_user_on_rejection` | `boolean` | sim | `true` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_reset_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| password_reset_config_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_password_reset_config_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_password_reset_config_updated_by ON public.password_reset_config USING btree (updated_by)` |
| password_reset_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_reset_config_pkey ON public.password_reset_config USING btree (id)` |


## Policies (RLS)

### `Admins can manage password_reset_config`

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
