# public.backup_logs

> Log de execucao de backup. RLS por empresa; backup global (empresa_id NULL) visivel apenas para service_role.

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `acao` | `text` | não | `'run'::text` |  |  |
| 4 | `status` | `text` | não | `'success'::text` |  |  |
| 5 | `started_at` | `timestamp with time zone` | não | `now()` |  | Retenção: 90 dias. Backup de dados: política de storage do Supabase (30d padrão em Pro). |
| 6 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `duration_ms` | `integer` | sim |  |  |  |
| 8 | `records_count` | `integer` | sim | `0` |  |  |
| 9 | `tables_count` | `integer` | sim | `0` |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `storage_path` | `text` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| backup_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| backup_logs_status_check | CHECK | `CHECK (status = ANY (ARRAY['success'::text, 'partial'::text, 'error'::text, 'skipped'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| backup_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX backup_logs_pkey ON public.backup_logs USING btree (id)` |
| idx_backup_logs_empresa | btree | empresa_id, started_at | não | sim |  | `CREATE INDEX idx_backup_logs_empresa ON public.backup_logs USING btree (empresa_id, started_at DESC)` |
| idx_backup_logs_started | btree | started_at | não | sim |  | `CREATE INDEX idx_backup_logs_started ON public.backup_logs USING btree (started_at DESC)` |


## Policies (RLS)

### `backup_logs_tenant_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id = get_auth_empresa_id())` |
| WITH CHECK | `(empresa_id = get_auth_empresa_id())` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
