# public.govbr_auth_state

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
| 2 | `state` | `text` | não |  |  |  |
| 3 | `nonce` | `text` | não |  |  |  |
| 4 | `redirect_uri` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `expires_at` | `timestamp with time zone` | sim | `(now() + '00:10:00'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| govbr_auth_state_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| govbr_auth_state_state_key | UNIQUE | `UNIQUE (state)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| govbr_auth_state_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX govbr_auth_state_pkey ON public.govbr_auth_state USING btree (id)` |
| govbr_auth_state_state_key | btree | state | sim | sim |  | `CREATE UNIQUE INDEX govbr_auth_state_state_key ON public.govbr_auth_state USING btree (state)` |


## Policies (RLS)

### `GovBR state service only`

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
