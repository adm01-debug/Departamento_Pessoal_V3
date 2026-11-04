# public.ferias_aprovacoes_log

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
| 2 | `ferias_id` | `uuid` | sim |  |  |  |
| 3 | `nivel` | `text` | não |  |  |  |
| 4 | `aprovador_id` | `uuid` | sim |  |  |  |
| 5 | `status` | `text` | não |  |  |  |
| 6 | `observacao` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ferias_aprovacoes_log_aprovador_id_fkey | FOREIGN KEY | `FOREIGN KEY (aprovador_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_aprovacoes_log_ferias_id_fkey | FOREIGN KEY | `FOREIGN KEY (ferias_id) REFERENCES ferias(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_aprovacoes_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_aprovacoes_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_aprovacoes_log_pkey ON public.ferias_aprovacoes_log USING btree (id)` |
| idx_ferias_aprovacoes_log_aprovador_id | btree | aprovador_id | não | sim |  | `CREATE INDEX idx_ferias_aprovacoes_log_aprovador_id ON public.ferias_aprovacoes_log USING btree (aprovador_id)` |
| idx_ferias_aprovacoes_log_ferias_id | btree | ferias_id | não | sim |  | `CREATE INDEX idx_ferias_aprovacoes_log_ferias_id ON public.ferias_aprovacoes_log USING btree (ferias_id)` |


## Policies (RLS)

### `Acesso aos logs de aprovação`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'rh'::app_role, 'gestor'::app_role]))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ferias_aprovacoes_log_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_ferias_aprovacoes_log_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_ferias_aprovacoes_log_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
