# public.auditoria_logs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_audit_events_unified |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `acao` | `character varying(50)` | não |  |  |  |
| 3 | `entidade` | `character varying(100)` | não |  |  |  |
| 4 | `entidade_id` | `character varying(255)` | sim |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 7 | `dados_novos` | `jsonb` | sim |  |  |  |
| 8 | `user_id` | `uuid` | sim |  |  |  |
| 9 | `user_email` | `character varying(255)` | sim |  |  |  |
| 10 | `ip_address` | `character varying(50)` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| auditoria_logs_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| auditoria_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| auditoria_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX auditoria_logs_pkey ON public.auditoria_logs USING btree (id)` |
| idx_auditoria_logs_created | btree | created_at | não | sim |  | `CREATE INDEX idx_auditoria_logs_created ON public.auditoria_logs USING btree (created_at DESC)` |
| idx_auditoria_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_auditoria_logs_created_at ON public.auditoria_logs USING btree (created_at DESC)` |
| idx_auditoria_logs_empresa_created | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_auditoria_logs_empresa_created ON public.auditoria_logs USING btree (empresa_id, created_at DESC)` |
| idx_auditoria_logs_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_auditoria_logs_empresa_id ON public.auditoria_logs USING btree (empresa_id)` |
| idx_auditoria_logs_entidade | btree | entidade, entidade_id | não | sim |  | `CREATE INDEX idx_auditoria_logs_entidade ON public.auditoria_logs USING btree (entidade, entidade_id)` |
| idx_auditoria_logs_user | btree | user_id | não | sim |  | `CREATE INDEX idx_auditoria_logs_user ON public.auditoria_logs USING btree (user_id)` |
| idx_auditoria_logs_user_id | btree | user_id | não | sim | `(user_id IS NOT NULL)` | `CREATE INDEX idx_auditoria_logs_user_id ON public.auditoria_logs USING btree (user_id) WHERE (user_id IS NOT NULL)` |


## Policies (RLS)

### `Admins can view audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))` |
| WITH CHECK |  |

### `Multi-tenant access for auditoria_logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id = auth.uid()) OR (( SELECT c.empresa_id    FROM colaboradores c   WHERE (c.id = auth.uid())) = empresa_id))` |
| WITH CHECK |  |

### `Usuários autenticados podem ver auditoria_logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = auth.uid()) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `auditoria_logs_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = auth.uid())` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_auditoria_logs_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_auditoria_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_auditoria_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
