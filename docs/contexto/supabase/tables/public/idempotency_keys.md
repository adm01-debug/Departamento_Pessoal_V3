# public.idempotency_keys

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
| usada por views | public.v_idempotency_metrics |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `key_hash` | `text` | não |  |  |  |
| 3 | `endpoint` | `text` | não |  |  |  |
| 4 | `empresa_id` | `uuid` | sim |  |  |  |
| 5 | `user_id` | `uuid` | sim |  |  |  |
| 6 | `request_hash` | `text` | não |  |  |  |
| 7 | `status` | `text` | não | `'in_progress'::text` |  |  |
| 8 | `response_status` | `integer` | sim |  |  |  |
| 9 | `response_body` | `jsonb` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `expires_at` | `timestamp with time zone` | não | `(now() + '24:00:00'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| idempotency_keys_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| idempotency_keys_status_check | CHECK | `CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text]))` |  |  | sim |
| idempotency_keys_unique | UNIQUE | `UNIQUE (endpoint, key_hash)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idempotency_keys_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX idempotency_keys_pkey ON public.idempotency_keys USING btree (id)` |
| idempotency_keys_unique | btree | endpoint, key_hash | sim | sim |  | `CREATE UNIQUE INDEX idempotency_keys_unique ON public.idempotency_keys USING btree (endpoint, key_hash)` |
| idx_idempotency_expires | btree | expires_at | não | sim |  | `CREATE INDEX idx_idempotency_expires ON public.idempotency_keys USING btree (expires_at)` |
| idx_idempotency_keys_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_idempotency_keys_empresa ON public.idempotency_keys USING btree (empresa_id)` |
| idx_idempotency_keys_expires | btree | expires_at | não | sim |  | `CREATE INDEX idx_idempotency_keys_expires ON public.idempotency_keys USING btree (expires_at)` |
| idx_idempotency_status | btree | created_at | não | sim | `(status = 'in_progress'::text)` | `CREATE INDEX idx_idempotency_status ON public.idempotency_keys USING btree (created_at) WHERE (status = 'in_progress'::text)` |


## Policies (RLS)

### `idempotency service role only`

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
