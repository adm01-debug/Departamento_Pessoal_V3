# public.user_sessions

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `session_token` | `text` | não |  |  |  |
| 4 | `ip_address` | `text` | sim |  |  |  |
| 5 | `user_agent` | `text` | sim |  |  |  |
| 6 | `device_info` | `jsonb` | sim |  |  |  |
| 7 | `location` | `jsonb` | sim |  |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `last_activity` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `expires_at` | `timestamp with time zone` | não |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_sessions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_sessions_session_token_key | UNIQUE | `UNIQUE (session_token)` |  |  | sim |
| user_sessions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_sessions_token | btree | session_token | não | sim |  | `CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token)` |
| idx_user_sessions_user | btree | user_id, is_active | não | sim |  | `CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id, is_active)` |
| user_sessions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_sessions_pkey ON public.user_sessions USING btree (id)` |
| user_sessions_session_token_key | btree | session_token | sim | sim |  | `CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token)` |


## Policies (RLS)

### `Users can manage own sessions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |

### `Users can view own sessions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = auth.uid()) OR is_admin(auth.uid()))` |
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
