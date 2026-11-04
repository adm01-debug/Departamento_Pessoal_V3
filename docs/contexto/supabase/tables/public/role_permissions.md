# public.role_permissions

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `role` | `text` | não |  |  |  |
| 3 | `permission_code` | `text` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| role_permissions_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| role_permissions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| role_permissions_role_permission_code_key | UNIQUE | `UNIQUE (role, permission_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_role_permissions_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_role_permissions_created_by ON public.role_permissions USING btree (created_by)` |
| idx_role_permissions_permission | btree | permission_code | não | sim |  | `CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_code)` |
| idx_role_permissions_role | btree | role | não | sim |  | `CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role)` |
| role_permissions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id)` |
| role_permissions_role_permission_code_key | btree | role, permission_code | sim | sim |  | `CREATE UNIQUE INDEX role_permissions_role_permission_code_key ON public.role_permissions USING btree (role, permission_code)` |


## Policies (RLS)

### `Admins podem gerenciar role_permissions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(auth.uid())` |
| WITH CHECK | `is_admin(auth.uid())` |

### `Usuários autenticados podem visualizar role_permissions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.role() = 'authenticated'::text)` |
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
