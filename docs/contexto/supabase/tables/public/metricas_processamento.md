# public.metricas_processamento

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_alertas_timeout |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `funcao_nome` | `text` | não |  |  |  |
| 3 | `status` | `text` | não |  |  |  |
| 4 | `tempo_execucao_ms` | `integer` | sim |  |  |  |
| 5 | `timestamp` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| metricas_processamento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_metricas_processamento_timestamp | btree | timestamp | não | sim |  | `CREATE INDEX idx_metricas_processamento_timestamp ON public.metricas_processamento USING btree ("timestamp" DESC)` |
| idx_metricas_processamento_timestamp_desc | btree | timestamp | não | sim |  | `CREATE INDEX idx_metricas_processamento_timestamp_desc ON public.metricas_processamento USING btree ("timestamp" DESC)` |
| metricas_processamento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX metricas_processamento_pkey ON public.metricas_processamento USING btree (id)` |


## Policies (RLS)

### `Admins can view processing metrics`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Service role full access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.jwt() ->> 'role'::text) = 'service_role'::text)` |
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
