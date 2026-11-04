# public.log_envio_relatorios

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `agendamento_id` | `uuid` | sim |  |  |  |
| 3 | `status` | `text` | não |  |  |  |
| 4 | `mensagem` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| log_envio_relatorios_agendamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (agendamento_id) REFERENCES relatorios_agendados(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| log_envio_relatorios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| log_envio_relatorios_status_check | CHECK | `CHECK (status = ANY (ARRAY['sucesso'::text, 'erro'::text, 'pendente'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_log_envio_relatorios_agendamento_id | btree | agendamento_id | não | sim |  | `CREATE INDEX idx_log_envio_relatorios_agendamento_id ON public.log_envio_relatorios USING btree (agendamento_id)` |
| log_envio_relatorios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX log_envio_relatorios_pkey ON public.log_envio_relatorios USING btree (id)` |


## Policies (RLS)

### `Tenant scoped log_envio_relatorios`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(agendamento_id IN ( SELECT relatorios_agendados.id    FROM relatorios_agendados   WHERE (relatorios_agendados.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK |  |

### `Users can view their company's delivery logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM relatorios_agendados r   WHERE ((r.id = log_envio_relatorios.agendamento_id) AND pertence_a_empresa(r.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_log_envio_relatorios_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_log_envio_relatorios_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
