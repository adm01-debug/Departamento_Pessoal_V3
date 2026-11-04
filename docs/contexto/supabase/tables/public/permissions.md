# public.permissions

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
| 2 | `role` | `app_role` | não |  |  |  |
| 3 | `resource` | `text` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `allowed` | `boolean` | não | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| permissions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| permissions_role_resource_action_key | UNIQUE | `UNIQUE (role, resource, action)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| permissions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id)` |
| permissions_role_resource_action_key | btree | role, resource, action | sim | sim |  | `CREATE UNIQUE INDEX permissions_role_resource_action_key ON public.permissions USING btree (role, resource, action)` |


## Policies (RLS)

### `Admins can manage permissions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(auth.uid())` |
| WITH CHECK | `is_admin(auth.uid())` |

### `Authenticated users can view permissions`

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
