# public.verification_tokens

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
| 3 | `token` | `text` | não |  |  |  |
| 4 | `type` | `text` | não |  |  |  |
| 5 | `expires_at` | `timestamp with time zone` | não |  |  |  |
| 6 | `used_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| verification_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| verification_tokens_token_key | UNIQUE | `UNIQUE (token)` |  |  | sim |
| verification_tokens_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_verification_tokens_token | btree | token | não | sim |  | `CREATE INDEX idx_verification_tokens_token ON public.verification_tokens USING btree (token)` |
| idx_verification_tokens_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_verification_tokens_user_id ON public.verification_tokens USING btree (user_id)` |
| verification_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX verification_tokens_pkey ON public.verification_tokens USING btree (id)` |
| verification_tokens_token_key | btree | token | sim | sim |  | `CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token)` |


## Policies (RLS)

### `Users can manage own tokens`

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
