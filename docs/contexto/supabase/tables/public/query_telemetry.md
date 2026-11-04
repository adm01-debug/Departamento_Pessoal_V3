# public.query_telemetry

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.mv_telemetry_dashboard, public.v_telemetry_last_hour, public.v_telemetry_slow_queries |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `operation` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | sim |  |  |  |
| 4 | `rpc_name` | `text` | sim |  |  |  |
| 5 | `duration_ms` | `integer` | não | `0` |  |  |
| 6 | `record_count` | `integer` | sim |  |  |  |
| 7 | `query_limit` | `integer` | sim |  |  |  |
| 8 | `query_offset` | `integer` | sim |  |  |  |
| 9 | `count_mode` | `text` | sim |  |  |  |
| 10 | `severity` | `text` | não | `'normal'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `user_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `empresa_id` | `uuid` | sim |  |  |  |
| 15 | `trace_id` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| query_telemetry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_query_telemetry_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_query_telemetry_created_at ON public.query_telemetry USING btree (created_at DESC)` |
| idx_query_telemetry_empresa_created | btree | empresa_id, created_at | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX idx_query_telemetry_empresa_created ON public.query_telemetry USING btree (empresa_id, created_at DESC) WHERE (empresa_id IS NOT NULL)` |
| idx_query_telemetry_severity | btree | severity | não | sim |  | `CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry USING btree (severity)` |
| idx_query_telemetry_severity_created | btree | severity, created_at | não | sim | `(severity = ANY (ARRAY['slow'::text, 'error'::text]))` | `CREATE INDEX idx_query_telemetry_severity_created ON public.query_telemetry USING btree (severity, created_at DESC) WHERE (severity = ANY (ARRAY['slow'::text, 'error'::text]))` |
| idx_query_telemetry_trace_id | btree | trace_id | não | sim | `(trace_id IS NOT NULL)` | `CREATE INDEX idx_query_telemetry_trace_id ON public.query_telemetry USING btree (trace_id) WHERE (trace_id IS NOT NULL)` |
| query_telemetry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX query_telemetry_pkey ON public.query_telemetry USING btree (id)` |


## Policies (RLS)

### `Service role and admins can view telemetry`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Telemetria insert service role`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |

### `Telemetria visível apenas para admins`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.jwt() ->> 'role'::text) = 'admin'::text)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
