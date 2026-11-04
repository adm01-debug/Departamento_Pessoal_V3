# public.webauthn_credentials

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `credential_id` | `text` | não |  |  |  |
| 4 | `public_key` | `text` | não |  |  |  |
| 5 | `counter` | `bigint` | não | `0` |  |  |
| 6 | `device_type` | `text` | sim |  |  |  |
| 7 | `transports` | `text[]` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `friendly_name` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webauthn_credentials_credential_id_key | UNIQUE | `UNIQUE (credential_id)` |  |  | sim |
| webauthn_credentials_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webauthn_credentials_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webauthn_credentials_credential_id | btree | credential_id | não | sim |  | `CREATE INDEX idx_webauthn_credentials_credential_id ON public.webauthn_credentials USING btree (credential_id)` |
| idx_webauthn_credentials_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials USING btree (user_id)` |
| webauthn_credentials_credential_id_key | btree | credential_id | sim | sim |  | `CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON public.webauthn_credentials USING btree (credential_id)` |
| webauthn_credentials_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webauthn_credentials_pkey ON public.webauthn_credentials USING btree (id)` |


## Policies (RLS)

### `Users can delete their own credentials`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `Users can insert their own credentials`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

### `Users can update their own credentials`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `Users can view their own credentials`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
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
