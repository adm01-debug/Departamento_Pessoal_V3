# public.security_alerts

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_system_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `type` | `text` | não |  |  |  |
| 3 | `severity` | `text` | não | `'medium'::text` |  |  |
| 4 | `ip_address` | `text` | sim |  |  |  |
| 5 | `user_id` | `uuid` | sim |  |  |  |
| 6 | `details` | `jsonb` | sim |  |  |  |
| 7 | `resolved` | `boolean` | sim | `false` |  |  |
| 8 | `resolved_by` | `uuid` | sim |  |  |  |
| 9 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| security_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| security_alerts_resolved_by_fkey | FOREIGN KEY | `FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| security_alerts_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_security_alerts_open | btree | severity, created_at | não | sim | `(COALESCE(resolved, false) = false)` | `CREATE INDEX idx_security_alerts_open ON public.security_alerts USING btree (severity, created_at DESC) WHERE (COALESCE(resolved, false) = false)` |
| idx_security_alerts_resolved_by | btree | resolved_by | não | sim |  | `CREATE INDEX idx_security_alerts_resolved_by ON public.security_alerts USING btree (resolved_by)` |
| idx_security_alerts_type | btree | type, severity, resolved | não | sim |  | `CREATE INDEX idx_security_alerts_type ON public.security_alerts USING btree (type, severity, resolved)` |
| idx_security_alerts_unresolved | btree | created_at | não | sim | `(resolved = false)` | `CREATE INDEX idx_security_alerts_unresolved ON public.security_alerts USING btree (created_at DESC) WHERE (resolved = false)` |
| idx_security_alerts_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_security_alerts_user_id ON public.security_alerts USING btree (user_id)` |
| security_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX security_alerts_pkey ON public.security_alerts USING btree (id)` |


## Policies (RLS)

### `Admins can insert security alerts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(auth.uid())` |

### `Admins can update security alerts`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Admins can view security alerts`

| campo | valor |
|---|---|
| comando | SELECT |
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
