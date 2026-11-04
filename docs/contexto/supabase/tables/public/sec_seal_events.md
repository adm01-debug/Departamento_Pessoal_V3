# public.sec_seal_events

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
| 2 | `tabela` | `text` | não |  |  |  |
| 3 | `registro_id` | `uuid` | sim |  |  |  |
| 4 | `evento` | `text` | não |  |  |  |
| 5 | `detalhe` | `text` | sim |  |  |  |
| 6 | `ator` | `uuid` | sim | `auth.uid()` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sec_seal_events_evento_check | CHECK | `CHECK (evento = ANY (ARRAY['selado'::text, 'desselado'::text]))` |  |  | sim |
| sec_seal_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sec_seal_events_tabela_data | btree | tabela, created_at | não | sim |  | `CREATE INDEX idx_sec_seal_events_tabela_data ON public.sec_seal_events USING btree (tabela, created_at DESC)` |
| sec_seal_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sec_seal_events_pkey ON public.sec_seal_events USING btree (id)` |


## Policies (RLS)

### `sec_seal_events_admin_read`

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
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
