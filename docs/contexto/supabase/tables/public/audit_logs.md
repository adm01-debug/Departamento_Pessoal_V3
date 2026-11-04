# public.audit_logs

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
| usada por views | public.v_audit_events_unified |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `user_email` | `text` | sim |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `entity` | `text` | não |  |  |  |
| 6 | `entity_id` | `text` | sim |  |  |  |
| 7 | `old_values` | `jsonb` | sim |  |  |  |
| 8 | `new_values` | `jsonb` | sim |  |  |  |
| 9 | `ip_address` | `text` | sim |  |  |  |
| 10 | `user_agent` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_logs_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)` |
| idx_audit_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC)` |
| idx_audit_logs_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_audit_logs_empresa_id ON public.audit_logs USING btree (empresa_id)` |
| idx_audit_logs_user_id | btree | user_id | não | sim | `(user_id IS NOT NULL)` | `CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id) WHERE (user_id IS NOT NULL)` |


## Policies (RLS)

### `Users can insert their own logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((auth.uid() = user_id) AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))` |

### `Users can view logs of their companies`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_audit_logs_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_audit_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_audit_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
