# public.esocial_transmissao_logs

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
| 2 | `evento_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `status` | `text` | não |  |  |  |
| 5 | `request_xml` | `text` | sim |  |  |  |
| 6 | `response_xml` | `text` | sim |  |  |  |
| 7 | `error_details` | `jsonb` | sim |  |  |  |
| 8 | `duracao_ms` | `integer` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| esocial_transmissao_logs_evento_id_fkey | FOREIGN KEY | `FOREIGN KEY (evento_id) REFERENCES esocial_eventos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| esocial_transmissao_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| esocial_transmissao_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX esocial_transmissao_logs_pkey ON public.esocial_transmissao_logs USING btree (id)` |
| idx_esocial_transmissao_logs_evento_id | btree | evento_id | não | sim |  | `CREATE INDEX idx_esocial_transmissao_logs_evento_id ON public.esocial_transmissao_logs USING btree (evento_id)` |


## Policies (RLS)

### `Gestores e RH podem ver logs de transmissão`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'gestor'::app_role, 'rh'::app_role]))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_esocial_transmissao_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_esocial_transmissao_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
