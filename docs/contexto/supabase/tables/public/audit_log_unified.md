# public.audit_log_unified

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
| usada por views | public.v_audit_legacy, public.v_system_health |


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

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_log_unified_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_log_unified_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_log_unified_pkey ON public.audit_log_unified USING btree (id)` |
| idx_audit_unified_empresa_occurred | btree | empresa_id, occurred_at | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX idx_audit_unified_empresa_occurred ON public.audit_log_unified USING btree (empresa_id, occurred_at DESC) WHERE (empresa_id IS NOT NULL)` |
| idx_audit_unified_entity | btree | entity, entity_id | não | sim |  | `CREATE INDEX idx_audit_unified_entity ON public.audit_log_unified USING btree (entity, entity_id)` |
| idx_audit_unified_occurred_desc | btree | occurred_at | não | sim |  | `CREATE INDEX idx_audit_unified_occurred_desc ON public.audit_log_unified USING btree (occurred_at DESC)` |
| idx_audit_unified_source | btree | source_table, source_id | não | sim |  | `CREATE INDEX idx_audit_unified_source ON public.audit_log_unified USING btree (source_table, source_id)` |
| idx_audit_unified_tenant_entity_occurred | btree | empresa_id, entity, occurred_at | não | sim |  | `CREATE INDEX idx_audit_unified_tenant_entity_occurred ON public.audit_log_unified USING btree (empresa_id, entity, occurred_at DESC)` |
| idx_audit_unified_user_occurred | btree | user_id, occurred_at | não | sim | `(user_id IS NOT NULL)` | `CREATE INDEX idx_audit_unified_user_occurred ON public.audit_log_unified USING btree (user_id, occurred_at DESC) WHERE (user_id IS NOT NULL)` |
| uq_audit_unified_source | btree | source_table, source_id | sim | sim | `(source_id IS NOT NULL)` | `CREATE UNIQUE INDEX uq_audit_unified_source ON public.audit_log_unified USING btree (source_table, source_id) WHERE (source_id IS NOT NULL)` |


## Policies (RLS)

### `Admins can view unified audit log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Service role manages unified audit log`

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
