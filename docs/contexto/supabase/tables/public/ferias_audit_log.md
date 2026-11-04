# public.ferias_audit_log

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
| usada por views | public.v_audit_events_unified |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `usuario_id` | `uuid` | sim |  |  |  |
| 4 | `entidade_tipo` | `text` | não |  |  |  |
| 5 | `entidade_id` | `uuid` | não |  |  |  |
| 6 | `acao` | `text` | não |  |  |  |
| 7 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 8 | `dados_novos` | `jsonb` | sim |  |  |  |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ferias_audit_log_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ferias_audit_log_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_audit_log_pkey ON public.ferias_audit_log USING btree (id)` |
| idx_ferias_audit_entidade | btree | entidade_tipo, entidade_id | não | sim |  | `CREATE INDEX idx_ferias_audit_entidade ON public.ferias_audit_log USING btree (entidade_tipo, entidade_id)` |
| idx_ferias_audit_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_ferias_audit_log_created_at ON public.ferias_audit_log USING btree (created_at DESC)` |
| idx_ferias_audit_log_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ferias_audit_log_empresa_id ON public.ferias_audit_log USING btree (empresa_id)` |
| idx_ferias_audit_log_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_ferias_audit_log_usuario_id ON public.ferias_audit_log USING btree (usuario_id)` |
| idx_ferias_audit_usuario_id | btree | usuario_id | não | sim | `(usuario_id IS NOT NULL)` | `CREATE INDEX idx_ferias_audit_usuario_id ON public.ferias_audit_log USING btree (usuario_id) WHERE (usuario_id IS NOT NULL)` |


## Policies (RLS)

### `View ferias audit by company`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ferias_audit_log_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_ferias_audit_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_ferias_audit_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
