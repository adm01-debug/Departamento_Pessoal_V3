# public.report_dispatch_attempts

> Payload exato e recibo de envio de relatório agendado; impede alteração de parâmetros sob a mesma Idempotency-Key.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `dispatch_key_hash` | `text` | não |  |  |  |
| 3 | `request_hash` | `text` | não |  |  |  |
| 4 | `agendamento_id` | `uuid` | não |  |  |  |
| 5 | `empresa_id` | `uuid` | não |  |  |  |
| 6 | `storage_path` | `text` | não |  |  |  |
| 7 | `signed_url` | `text` | não |  |  |  |
| 8 | `signed_url_expires_at` | `timestamp with time zone` | não |  |  |  |
| 9 | `subject` | `text` | não |  |  |  |
| 10 | `html` | `text` | não |  |  |  |
| 11 | `content_sha256` | `text` | não |  |  |  |
| 12 | `total_registros` | `integer` | não |  |  |  |
| 13 | `provider_message_id` | `text` | sim |  |  |  |
| 14 | `status` | `text` | não | `'prepared'::text` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `accepted_at` | `timestamp with time zone` | sim |  |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| report_dispatch_attempts_agendamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (agendamento_id) REFERENCES relatorios_agendados(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| report_dispatch_attempts_content_sha256_check | CHECK | `CHECK (content_sha256 ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| report_dispatch_attempts_dispatch_key_hash_check | CHECK | `CHECK (dispatch_key_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| report_dispatch_attempts_dispatch_key_hash_key | UNIQUE | `UNIQUE (dispatch_key_hash)` |  |  | sim |
| report_dispatch_attempts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| report_dispatch_attempts_request_hash_check | CHECK | `CHECK (request_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| report_dispatch_attempts_status_check | CHECK | `CHECK (status = ANY (ARRAY['prepared'::text, 'accepted'::text]))` |  |  | sim |
| report_dispatch_attempts_total_registros_check | CHECK | `CHECK (total_registros >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_report_dispatch_attempts_schedule | btree | agendamento_id, created_at | não | sim |  | `CREATE INDEX idx_report_dispatch_attempts_schedule ON public.report_dispatch_attempts USING btree (agendamento_id, created_at DESC)` |
| report_dispatch_attempts_dispatch_key_hash_key | btree | dispatch_key_hash | sim | sim |  | `CREATE UNIQUE INDEX report_dispatch_attempts_dispatch_key_hash_key ON public.report_dispatch_attempts USING btree (dispatch_key_hash)` |
| report_dispatch_attempts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX report_dispatch_attempts_pkey ON public.report_dispatch_attempts USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
