# public.dp_audit_log

> Audit log Departamento Pessoal — IMUTÁVEL (sem UPDATE/DELETE de roles de aplicação).
Particionado por mês para performance e retenção.
LGPD Art.37: registro de operações de tratamento de dados.
Conteúdo: metadata de eventos — NÃO armazena PII raw no payload.

| propriedade | valor |
|---|---|
| tipo | partitioned |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| chave de partição | `RANGE (created_at)` |
| usada por views | public.dp_audit_log_colaborador, public.dp_audit_log_rh |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `event` | `text` | não |  |  | Nome do evento (ex: colaborador_criado, contrato_assinado, folha_exportada) |
| 3 | `event_type` | `text` | não | `'system'::text` |  | Categoria: system\|user\|admin\|compliance |
| 4 | `actor_user_id` | `uuid` | sim |  |  | UUID do usuário auth.uid(). Classificação LGPD: DADO PESSOAL — correlação com auth.users |
| 5 | `actor_role` | `text` | sim |  |  | Role no momento da ação: colaborador\|gestor\|rh\|admin |
| 6 | `ip_address` | `inet` | sim |  |  | IP do cliente. Classificação LGPD: DADO PESSOAL — retenção máx 90 dias por política |
| 7 | `request_id` | `uuid` | sim |  |  | UUID de correlação para distributed tracing (não é PII) |
| 8 | `session_id` | `uuid` | sim |  |  | UUID da sessão auth. Classificação LGPD: DADO PESSOAL |
| 9 | `payload` | `jsonb` | sim |  |  | JSON sanitizado do evento — PROIBIDO armazenar CPF, RG, conta bancária em plain text |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  | Timestamp UTC (imutável após inserção) |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_audit_log_actor_role_valid | CHECK | `CHECK (actor_role IS NULL OR (actor_role = ANY (ARRAY['colaborador'::text, 'gestor'::text, 'rh'::text, 'admin'::text, 'sistema'::text, 'auditoria'::text])))` |  |  | sim |
| dp_audit_log_event_length | CHECK | `CHECK (length(event) <= 200)` |  |  | sim |
| dp_audit_log_event_nonempty | CHECK | `CHECK (length(TRIM(BOTH FROM event)) > 0)` |  |  | sim |
| dp_audit_log_event_type_valid | CHECK | `CHECK (event_type = ANY (ARRAY['system'::text, 'user'::text, 'admin'::text, 'compliance'::text, 'security'::text, 'error'::text]))` |  |  | sim |
| dp_audit_log_payload_must_be_object | CHECK | `CHECK (payload IS NULL OR jsonb_typeof(payload) = 'object'::text)` |  |  | sim |
| dp_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_audit_log_actor_idx | btree | actor_user_id | não | sim | `(actor_user_id IS NOT NULL)` | `CREATE INDEX dp_audit_log_actor_idx ON ONLY public.dp_audit_log USING btree (actor_user_id) WHERE (actor_user_id IS NOT NULL)` |
| dp_audit_log_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX dp_audit_log_created_at_idx ON ONLY public.dp_audit_log USING btree (created_at DESC)` |
| dp_audit_log_event_idx | btree | event | não | sim |  | `CREATE INDEX dp_audit_log_event_idx ON ONLY public.dp_audit_log USING btree (event)` |
| dp_audit_log_event_type_idx | btree | event_type | não | sim |  | `CREATE INDEX dp_audit_log_event_type_idx ON ONLY public.dp_audit_log USING btree (event_type)` |
| dp_audit_log_ip_idx | btree | ip_address | não | sim | `(ip_address IS NOT NULL)` | `CREATE INDEX dp_audit_log_ip_idx ON ONLY public.dp_audit_log USING btree (ip_address) WHERE (ip_address IS NOT NULL)` |
| dp_audit_log_payload_gin | gin | payload | não | sim | `(payload IS NOT NULL)` | `CREATE INDEX dp_audit_log_payload_gin ON ONLY public.dp_audit_log USING gin (payload) WHERE (payload IS NOT NULL)` |
| dp_audit_log_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX dp_audit_log_pkey ON ONLY public.dp_audit_log USING btree (id, created_at)` |
| dp_audit_log_request_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` | `CREATE INDEX dp_audit_log_request_idx ON ONLY public.dp_audit_log USING btree (request_id) WHERE (request_id IS NOT NULL)` |


## Policies (RLS)

### `auth_own_events`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(actor_user_id = auth.uid())` |
| WITH CHECK |  |

### `service_role_insert_only`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |

### `service_role_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| dp_audit_log_integrity_check | BEFORE | INSERT | ROW | enabled | public.dp_audit_log_prevent_future |
| dp_audit_log_no_delete | BEFORE | DELETE | ROW | enabled | public.dp_audit_log_immutable |
| dp_audit_log_no_update | BEFORE | UPDATE | ROW | enabled | public.dp_audit_log_immutable |


## Grants

| role | privilégios |
|---|---|
| anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| dp_mcp_role | INSERT, SELECT |
| service_role | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
