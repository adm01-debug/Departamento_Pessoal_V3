# public.auth_gov_br_sessions

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `access_token` | `text` | não |  |  |  |
| 4 | `id_token` | `text` | sim |  |  |  |
| 5 | `nivel_autenticacao` | `text` | sim |  |  |  |
| 6 | `cpf` | `text` | sim |  |  |  |
| 7 | `metadata` | `jsonb` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| auth_gov_br_sessions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| auth_gov_br_sessions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| auth_gov_br_sessions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX auth_gov_br_sessions_pkey ON public.auth_gov_br_sessions USING btree (id)` |
| idx_auth_gov_br_sessions_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_auth_gov_br_sessions_user_id ON public.auth_gov_br_sessions USING btree (user_id)` |


## Policies (RLS)

### `Usuários veem suas próprias sessões Gov.br`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_auth_gov_br | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
