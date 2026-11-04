# public.login_attempts

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
| usada por views | public.v_login_anomalies_email, public.v_login_anomalies_ip |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | não |  |  |  |
| 3 | `ip_address` | `text` | não |  |  |  |
| 4 | `user_agent` | `text` | sim |  |  |  |
| 5 | `success` | `boolean` | não |  |  |  |
| 6 | `failure_reason` | `text` | sim |  |  |  |
| 7 | `mfa_required` | `boolean` | sim | `false` |  |  |
| 8 | `mfa_passed` | `boolean` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_attempts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_login_attempts_email_hour | btree | email, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_email_hour ON public.login_attempts USING btree (email, created_at DESC)` |
| idx_login_attempts_email_ip | btree | email, ip_address, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_email_ip ON public.login_attempts USING btree (email, ip_address, created_at)` |
| idx_login_attempts_ip_hour | btree | ip_address, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_ip_hour ON public.login_attempts USING btree (ip_address, created_at DESC)` |
| idx_login_attempts_success_hour | btree | success, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_success_hour ON public.login_attempts USING btree (success, created_at DESC)` |
| login_attempts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_attempts_pkey ON public.login_attempts USING btree (id)` |


## Policies (RLS)

### `Admins can view login attempts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `System can insert login attempts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() IS NOT NULL)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
