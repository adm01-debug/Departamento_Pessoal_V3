# public.password_reset_requests

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
| 3 | `user_email` | `text` | não |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `reason` | `text` | sim |  |  |  |
| 6 | `requested_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `reviewed_by` | `uuid` | sim |  |  |  |
| 9 | `reviewer_notes` | `text` | sim |  |  |  |
| 10 | `expires_at` | `timestamp with time zone` | sim | `(now() + '24:00:00'::interval)` |  |  |
| 11 | `ip_address` | `text` | sim |  |  |  |
| 12 | `user_agent` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_reset_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| password_reset_requests_reviewed_by_fkey | FOREIGN KEY | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| password_reset_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'completed'::text]))` |  |  | sim |
| password_reset_requests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_password_reset_expires | btree | expires_at | não | sim |  | `CREATE INDEX idx_password_reset_expires ON public.password_reset_requests USING btree (expires_at)` |
| idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  | `CREATE INDEX idx_password_reset_requests_reviewed_by ON public.password_reset_requests USING btree (reviewed_by)` |
| idx_password_reset_status | btree | status | não | sim |  | `CREATE INDEX idx_password_reset_status ON public.password_reset_requests USING btree (status)` |
| idx_password_reset_user | btree | user_id | não | sim |  | `CREATE INDEX idx_password_reset_user ON public.password_reset_requests USING btree (user_id)` |
| password_reset_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_reset_requests_pkey ON public.password_reset_requests USING btree (id)` |


## Policies (RLS)

### `Admins can manage password_reset_requests`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Users can create their own requests`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = auth.uid())` |

### `Users can view their own requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
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
