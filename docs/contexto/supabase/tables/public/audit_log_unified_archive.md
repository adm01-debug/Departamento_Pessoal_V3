# public.audit_log_unified_archive

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
| 2 | `source_table` | `text` | não |  |  |  |
| 3 | `source_id` | `uuid` | sim |  |  |  |
| 4 | `empresa_id` | `uuid` | sim |  |  |  |
| 5 | `user_id` | `uuid` | sim |  |  |  |
| 6 | `action` | `text` | sim |  |  |  |
| 7 | `entity` | `text` | sim |  |  |  |
| 8 | `entity_id` | `text` | sim |  |  |  |
| 9 | `payload` | `jsonb` | sim |  |  |  |
| 10 | `ip_address` | `inet` | sim |  |  |  |
| 11 | `user_agent` | `text` | sim |  |  |  |
| 12 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `ingested_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

_nenhum_


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_audit_archive_empresa | btree | empresa_id, occurred_at | não | sim |  | `CREATE INDEX idx_audit_archive_empresa ON public.audit_log_unified_archive USING btree (empresa_id, occurred_at DESC)` |
| idx_audit_archive_occurred_at | btree | occurred_at | não | sim |  | `CREATE INDEX idx_audit_archive_occurred_at ON public.audit_log_unified_archive USING btree (occurred_at DESC)` |


## Policies (RLS)

### `Admins podem ler audit archive`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_audit_archive_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
