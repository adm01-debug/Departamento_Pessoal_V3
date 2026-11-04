# public.provisao_auditoria

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
| 2 | `provisao_id` | `uuid` | não |  |  |  |
| 3 | `usuario_id` | `uuid` | sim |  |  |  |
| 4 | `valor_anterior` | `numeric(15,2)` | sim |  |  |  |
| 5 | `valor_novo` | `numeric(15,2)` | sim |  |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| provisao_auditoria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| provisao_auditoria_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_provisao_auditoria_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_provisao_auditoria_usuario_id ON public.provisao_auditoria USING btree (usuario_id)` |
| provisao_auditoria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX provisao_auditoria_pkey ON public.provisao_auditoria USING btree (id)` |


## Policies (RLS)

### `Auditoria de provisao para perfis internos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(auth.uid()) OR ((has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)) AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |
| trg_provisao_auditoria_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_provisao_auditoria_empresa | BEFORE | INSERT | ROW | enabled | public.provisao_auditoria_set_empresa |
| trg_provisao_auditoria_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_provisao_auditoria_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
