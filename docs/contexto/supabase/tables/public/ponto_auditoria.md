# public.ponto_auditoria

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
| 2 | `tabela_nome` | `text` | não |  |  |  |
| 3 | `registro_id` | `uuid` | não |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 6 | `dados_novos` | `jsonb` | sim |  |  |  |
| 7 | `usuario_id` | `uuid` | sim |  |  |  |
| 8 | `justificativa` | `text` | sim |  |  |  |
| 9 | `ip_address` | `text` | sim |  |  |  |
| 10 | `user_agent` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_auditoria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ponto_auditoria_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_auditoria_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_ponto_auditoria_created_at ON public.ponto_auditoria USING btree (created_at DESC)` |
| idx_ponto_auditoria_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_ponto_auditoria_usuario_id ON public.ponto_auditoria USING btree (usuario_id)` |
| ponto_auditoria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_auditoria_pkey ON public.ponto_auditoria USING btree (id)` |


## Policies (RLS)

### `Users can view their own point audit`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((usuario_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM registros_ponto rp   WHERE ((rp.id = ponto_auditoria.registro_id) AND (rp.colaborador_id IN ( SELECT colaboradores.id            FROM colaboradores           WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |
| trg_ponto_auditoria_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_ponto_auditoria_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_ponto_auditoria_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
