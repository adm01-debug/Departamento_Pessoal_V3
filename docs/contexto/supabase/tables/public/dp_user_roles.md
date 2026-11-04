# public.dp_user_roles

> Atribuicao de roles a usuarios. Gerenciado pelo role rh ou admin.
Integracao: JWT claims devem incluir role via custom claim (Supabase Auth hook).
Exemplo de hook SQL: SELECT role FROM dp_user_roles WHERE user_id = uid AND active = true LIMIT 1.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `role` | `dp_user_role` | não |  |  |  |
| 4 | `granted_by` | `uuid` | sim |  |  |  |
| 5 | `granted_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `active` | `boolean` | não | `true` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_user_roles_granted_by_fkey | FOREIGN KEY | `FOREIGN KEY (granted_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| dp_user_roles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dp_user_roles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dp_user_roles_user_id_role_key | UNIQUE | `UNIQUE (user_id, role)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_user_roles_active_idx | btree | user_id, role | não | sim | `(active = true)` | `CREATE INDEX dp_user_roles_active_idx ON public.dp_user_roles USING btree (user_id, role) WHERE (active = true)` |
| dp_user_roles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_user_roles_pkey ON public.dp_user_roles USING btree (id)` |
| dp_user_roles_user_id_role_key | btree | user_id, role | sim | sim |  | `CREATE UNIQUE INDEX dp_user_roles_user_id_role_key ON public.dp_user_roles USING btree (user_id, role)` |
| dp_user_roles_user_idx | btree | user_id | não | sim | `(active = true)` | `CREATE INDEX dp_user_roles_user_idx ON public.dp_user_roles USING btree (user_id) WHERE (active = true)` |


## Policies (RLS)

### `admin_full`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.jwt() ->> 'role'::text) = ANY (ARRAY['admin'::text, 'rh'::text]))` |
| WITH CHECK |  |

### `own_roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |

### `service_full`

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
