# public.premiacoes_auditoria

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
| 2 | `entidade_tipo` | `text` | não |  |  |  |
| 3 | `entidade_id` | `uuid` | não |  |  |  |
| 4 | `usuario_id` | `uuid` | sim |  |  |  |
| 5 | `acao` | `text` | não |  |  |  |
| 6 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 7 | `dados_novos` | `jsonb` | sim |  |  |  |
| 8 | `motivo` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| premiacoes_auditoria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| premiacoes_auditoria_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_premiacoes_aud_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_premiacoes_aud_created_at ON public.premiacoes_auditoria USING btree (created_at DESC)` |
| idx_premiacoes_aud_entidade | btree | entidade_tipo, entidade_id | não | sim |  | `CREATE INDEX idx_premiacoes_aud_entidade ON public.premiacoes_auditoria USING btree (entidade_tipo, entidade_id)` |
| idx_premiacoes_aud_usuario_id | btree | usuario_id | não | sim | `(usuario_id IS NOT NULL)` | `CREATE INDEX idx_premiacoes_aud_usuario_id ON public.premiacoes_auditoria USING btree (usuario_id) WHERE (usuario_id IS NOT NULL)` |
| idx_premiacoes_auditoria_entidade | btree | entidade_tipo, entidade_id | não | sim |  | `CREATE INDEX idx_premiacoes_auditoria_entidade ON public.premiacoes_auditoria USING btree (entidade_tipo, entidade_id)` |
| idx_premiacoes_auditoria_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_premiacoes_auditoria_usuario_id ON public.premiacoes_auditoria USING btree (usuario_id)` |
| premiacoes_auditoria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX premiacoes_auditoria_pkey ON public.premiacoes_auditoria USING btree (id)` |


## Policies (RLS)

### `Usuários autenticados podem ver auditoria de premiações`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IS NOT NULL)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |
| trg_premiacoes_auditoria_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_premiacoes_auditoria_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_premiacoes_auditoria_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
