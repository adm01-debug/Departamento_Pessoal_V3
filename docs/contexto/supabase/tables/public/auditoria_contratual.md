# public.auditoria_contratual

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `campo_alterado` | `text` | sim |  |  |  |
| 4 | `valor_antigo` | `text` | sim |  |  |  |
| 5 | `valor_novo` | `text` | sim |  |  |  |
| 6 | `alterado_por` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| auditoria_contratual_alterado_por_fkey | FOREIGN KEY | `FOREIGN KEY (alterado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| auditoria_contratual_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| auditoria_contratual_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| auditoria_contratual_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX auditoria_contratual_pkey ON public.auditoria_contratual USING btree (id)` |
| idx_auditoria_contratual_alterado_por | btree | alterado_por | não | sim |  | `CREATE INDEX idx_auditoria_contratual_alterado_por ON public.auditoria_contratual USING btree (alterado_por)` |
| idx_auditoria_contratual_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_auditoria_contratual_colaborador_id ON public.auditoria_contratual USING btree (colaborador_id)` |


## Policies (RLS)

### `Users can view their company contract audit`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = auditoria_contratual.colaborador_id) AND (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_auditoria_contratual_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_auditoria_contratual_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_auditoria_contratual_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
