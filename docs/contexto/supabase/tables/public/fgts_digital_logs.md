# public.fgts_digital_logs

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
| 2 | `guia_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `request_payload` | `jsonb` | sim |  |  |  |
| 6 | `response_payload` | `jsonb` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fgts_digital_logs_guia_id_fkey | FOREIGN KEY | `FOREIGN KEY (guia_id) REFERENCES guias_fgts_digital(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| fgts_digital_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fgts_digital_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fgts_digital_logs_pkey ON public.fgts_digital_logs USING btree (id)` |
| idx_fgts_digital_logs_guia_id | btree | guia_id | não | sim |  | `CREATE INDEX idx_fgts_digital_logs_guia_id ON public.fgts_digital_logs USING btree (guia_id)` |


## Policies (RLS)

### `Gestores veem logs FGTS`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'gestor'::app_role]))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fgts_digital_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_fgts_digital_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
