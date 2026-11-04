# public.ponto_auditoria_fraude

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
| 2 | `batida_id` | `uuid` | sim |  |  |  |
| 3 | `tipo_alerta` | `text` | sim |  |  |  |
| 4 | `score_confianca` | `numeric` | sim |  |  |  |
| 5 | `detalhes` | `jsonb` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_auditoria_fraude_batida_id_fkey | FOREIGN KEY | `FOREIGN KEY (batida_id) REFERENCES batidas_ponto(id)` | NO ACTION | NO ACTION | sim |
| ponto_auditoria_fraude_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_auditoria_fraude_batida_id | btree | batida_id | não | sim |  | `CREATE INDEX idx_ponto_auditoria_fraude_batida_id ON public.ponto_auditoria_fraude USING btree (batida_id)` |
| ponto_auditoria_fraude_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_auditoria_fraude_pkey ON public.ponto_auditoria_fraude USING btree (id)` |


## Policies (RLS)

### `Admins can view fraud audit`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |
| trg_ponto_auditoria_fraude_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_ponto_auditoria_fraude_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_ponto_auditoria_fraude_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
