# public.automacao_logs

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
| 2 | `workflow_id` | `uuid` | sim |  |  |  |
| 3 | `entidade_id` | `uuid` | sim |  |  |  |
| 4 | `tipo_evento` | `text` | sim |  |  |  |
| 5 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 6 | `detalhes` | `jsonb` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| automacao_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| automacao_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX automacao_logs_pkey ON public.automacao_logs USING btree (id)` |


## Policies (RLS)

### `Logs de automação visíveis para gestores`

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
| trg_automacao_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_automacao_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
