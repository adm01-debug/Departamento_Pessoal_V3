# public.user_mfa

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `mfa_enabled` | `boolean` | sim | `false` |  |  |
| 4 | `mfa_secret` | `text` | sim |  |  |  |
| 5 | `mfa_type` | `text` | sim | `'totp'::text` |  |  |
| 6 | `backup_codes` | `text[]` | sim |  |  |  |
| 7 | `recovery_email` | `text` | sim |  |  |  |
| 8 | `phone_number` | `text` | sim |  |  |  |
| 9 | `verified_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_mfa_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_mfa_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_mfa_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_mfa_user | btree | user_id | não | sim |  | `CREATE INDEX idx_user_mfa_user ON public.user_mfa USING btree (user_id)` |
| user_mfa_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_mfa_pkey ON public.user_mfa USING btree (id)` |
| user_mfa_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX user_mfa_user_id_key ON public.user_mfa USING btree (user_id)` |


## Policies (RLS)

### `Users can manage own MFA`

| campo | valor |
|---|---|
| comando | ALL |
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
