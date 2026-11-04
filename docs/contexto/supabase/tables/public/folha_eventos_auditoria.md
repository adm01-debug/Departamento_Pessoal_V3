# public.folha_eventos_auditoria

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
| 2 | `folha_id` | `uuid` | sim |  |  |  |
| 3 | `usuario_id` | `uuid` | sim |  |  |  |
| 4 | `tipo_evento` | `text` | sim |  |  |  |
| 5 | `detalhes` | `jsonb` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| folha_eventos_auditoria_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id)` | NO ACTION | NO ACTION | sim |
| folha_eventos_auditoria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| folha_eventos_auditoria_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| folha_eventos_auditoria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX folha_eventos_auditoria_pkey ON public.folha_eventos_auditoria USING btree (id)` |
| idx_folha_eventos_auditoria_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_folha_eventos_auditoria_folha_id ON public.folha_eventos_auditoria USING btree (folha_id)` |
| idx_folha_eventos_auditoria_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_folha_eventos_auditoria_usuario_id ON public.folha_eventos_auditoria USING btree (usuario_id)` |


## Policies (RLS)

### `Admins can view audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(((auth.jwt() ->> 'role'::text) = 'service_role'::text) OR (EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_folha_eventos_auditoria_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_folha_eventos_auditoria_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_folha_eventos_auditoria_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
