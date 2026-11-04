# public.dp_audit_log_2026_08

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
| partição de | public.dp_audit_log |
| bound | `FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00')` |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `event` | `text` | não |  |  |  |
| 3 | `event_type` | `text` | não | `'system'::text` |  |  |
| 4 | `actor_user_id` | `uuid` | sim |  |  |  |
| 5 | `actor_role` | `text` | sim |  |  |  |
| 6 | `ip_address` | `inet` | sim |  |  |  |
| 7 | `request_id` | `uuid` | sim |  |  |  |
| 8 | `session_id` | `uuid` | sim |  |  |  |
| 9 | `payload` | `jsonb` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_audit_log_2026_08_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |
| dp_audit_log_actor_role_valid | CHECK | `CHECK (actor_role IS NULL OR (actor_role = ANY (ARRAY['colaborador'::text, 'gestor'::text, 'rh'::text, 'admin'::text, 'sistema'::text, 'auditoria'::text])))` |  |  | sim |
| dp_audit_log_event_length | CHECK | `CHECK (length(event) <= 200)` |  |  | sim |
| dp_audit_log_event_nonempty | CHECK | `CHECK (length(TRIM(BOTH FROM event)) > 0)` |  |  | sim |
| dp_audit_log_event_type_valid | CHECK | `CHECK (event_type = ANY (ARRAY['system'::text, 'user'::text, 'admin'::text, 'compliance'::text, 'security'::text, 'error'::text]))` |  |  | sim |
| dp_audit_log_payload_must_be_object | CHECK | `CHECK (payload IS NULL OR jsonb_typeof(payload) = 'object'::text)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_audit_log_2026_08_actor_user_id_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` | `CREATE INDEX dp_audit_log_2026_08_actor_user_id_idx ON public.dp_audit_log_2026_08 USING btree (actor_user_id) WHERE (actor_user_id IS NOT NULL)` |
| dp_audit_log_2026_08_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX dp_audit_log_2026_08_created_at_idx ON public.dp_audit_log_2026_08 USING btree (created_at DESC)` |
| dp_audit_log_2026_08_event_idx | btree | event | não | sim |  | `CREATE INDEX dp_audit_log_2026_08_event_idx ON public.dp_audit_log_2026_08 USING btree (event)` |
| dp_audit_log_2026_08_event_type_idx | btree | event_type | não | sim |  | `CREATE INDEX dp_audit_log_2026_08_event_type_idx ON public.dp_audit_log_2026_08 USING btree (event_type)` |
| dp_audit_log_2026_08_ip_address_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` | `CREATE INDEX dp_audit_log_2026_08_ip_address_idx ON public.dp_audit_log_2026_08 USING btree (ip_address) WHERE (ip_address IS NOT NULL)` |
| dp_audit_log_2026_08_payload_idx | gin | payload | não | sim | `(payload IS NOT NULL)` | `CREATE INDEX dp_audit_log_2026_08_payload_idx ON public.dp_audit_log_2026_08 USING gin (payload) WHERE (payload IS NOT NULL)` |
| dp_audit_log_2026_08_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX dp_audit_log_2026_08_pkey ON public.dp_audit_log_2026_08 USING btree (id, created_at)` |
| dp_audit_log_2026_08_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` | `CREATE INDEX dp_audit_log_2026_08_request_id_idx ON public.dp_audit_log_2026_08 USING btree (request_id) WHERE (request_id IS NOT NULL)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| dp_audit_log_integrity_check | BEFORE | INSERT | ROW | enabled | public.dp_audit_log_prevent_future |
| dp_audit_log_no_delete | BEFORE | DELETE | ROW | enabled | public.dp_audit_log_immutable |
| dp_audit_log_no_update | BEFORE | UPDATE | ROW | enabled | public.dp_audit_log_immutable |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
