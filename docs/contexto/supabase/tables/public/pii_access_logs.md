# public.pii_access_logs

> LGPD art. 37 — registro imutável e server-authoritative de leituras de PII.

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
| usada por views | public.v_pii_access_suspeitos |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `tabela` | `text` | não |  |  |  |
| 5 | `acao` | `text` | não | `'select'::text` |  |  |
| 6 | `registro_id` | `text` | sim |  |  |  |
| 7 | `registro_count` | `integer` | não | `1` |  |  |
| 8 | `ip` | `text` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pii_access_logs_acao_valid | CHECK | `CHECK (acao = ANY (ARRAY['select'::text, 'export'::text, 'print'::text, 'download'::text]))` |  |  | sim |
| pii_access_logs_count_valid | CHECK | `CHECK (registro_count >= 1 AND registro_count <= 100000)` |  |  | sim |
| pii_access_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pii_access_logs_registro_id_size | CHECK | `CHECK (registro_id IS NULL OR length(registro_id) <= 256)` |  |  | sim |
| pii_access_logs_tabela_valid | CHECK | `CHECK (tabela ~ '^[a-z][a-z0-9_]{0,62}$'::text)` |  |  | sim |
| pii_access_logs_user_agent_size | CHECK | `CHECK (user_agent IS NULL OR length(user_agent) <= 1024)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pii_access_logs_empresa_ts | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_pii_access_logs_empresa_ts ON public.pii_access_logs USING btree (empresa_id, created_at DESC)` |
| idx_pii_access_logs_tabela_ts | btree | tabela, created_at | não | sim |  | `CREATE INDEX idx_pii_access_logs_tabela_ts ON public.pii_access_logs USING btree (tabela, created_at DESC)` |
| idx_pii_access_logs_user_ts | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_pii_access_logs_user_ts ON public.pii_access_logs USING btree (user_id, created_at DESC)` |
| pii_access_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pii_access_logs_pkey ON public.pii_access_logs USING btree (id)` |


## Policies (RLS)

### `pii_access_logs_select_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR user_can_manage_tenant_storage(auth.uid(), empresa_id))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| dp_mcp_role | SELECT |
| service_role | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
