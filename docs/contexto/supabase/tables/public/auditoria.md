# public.auditoria

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
| usada por views | public.v_audit_events_unified |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `usuario_id` | `uuid` | sim |  |  |  |
| 3 | `usuario_nome` | `text` | sim |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `empresa_id` | `text` | sim |  |  |  |
| 6 | `entidade` | `text` | sim |  |  |  |
| 7 | `entidade_id` | `text` | sim |  |  |  |
| 8 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 9 | `dados_novos` | `jsonb` | sim |  |  |  |
| 10 | `descricao` | `text` | sim |  |  |  |
| 11 | `ip_address` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| auditoria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| auditoria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX auditoria_pkey ON public.auditoria USING btree (id)` |
| idx_auditoria_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_auditoria_created_at ON public.auditoria USING btree (created_at DESC)` |
| idx_auditoria_entidade | btree | entidade, entidade_id | não | sim |  | `CREATE INDEX idx_auditoria_entidade ON public.auditoria USING btree (entidade, entidade_id)` |
| idx_auditoria_usuario_id | btree | usuario_id | não | sim | `(usuario_id IS NOT NULL)` | `CREATE INDEX idx_auditoria_usuario_id ON public.auditoria USING btree (usuario_id) WHERE (usuario_id IS NOT NULL)` |


## Policies (RLS)

### `audit_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(usuario_id = auth.uid())` |

### `tenant_auditoria_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((empresa_id)::uuid IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `tenant_auditoria_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id)::uuid IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_auditoria_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_auditoria_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_auditoria_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
