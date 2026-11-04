# public.fila_processamento

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
| usada por views | public.vw_metricas_fila |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `tipo_tarefa` | `text` | não |  |  |  |
| 3 | `status` | `text` | não | `'pendente'::text` |  |  |
| 4 | `payload` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 5 | `resultado` | `jsonb` | sim |  |  |  |
| 6 | `progresso` | `integer` | sim | `0` |  |  |
| 7 | `erro_log` | `text` | sim |  |  |  |
| 8 | `usuario_id` | `uuid` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `tentativas` | `integer` | não | `0` |  |  |
| 13 | `max_tentativas` | `integer` | não | `5` |  |  |
| 14 | `proxima_tentativa_em` | `timestamp with time zone` | sim |  |  |  |
| 15 | `dlq` | `boolean` | não | `false` |  |  |
| 16 | `dlq_movido_em` | `timestamp with time zone` | sim |  |  |  |
| 17 | `ultimo_erro` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fila_processamento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| fila_processamento_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fila_processamento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fila_processamento_pkey ON public.fila_processamento USING btree (id)` |
| idx_fila_dlq | btree | dlq_movido_em | não | sim | `(dlq = true)` | `CREATE INDEX idx_fila_dlq ON public.fila_processamento USING btree (dlq_movido_em DESC) WHERE (dlq = true)` |
| idx_fila_processamento_status | btree | status | não | sim | `(status = 'pendente'::text)` | `CREATE INDEX idx_fila_processamento_status ON public.fila_processamento USING btree (status) WHERE (status = 'pendente'::text)` |
| idx_fila_processamento_usuario | btree | usuario_id | não | sim |  | `CREATE INDEX idx_fila_processamento_usuario ON public.fila_processamento USING btree (usuario_id)` |
| idx_fila_ready_to_process | btree | created_at | não | sim | `((status = 'pending'::text) AND (dlq = false))` | `CREATE INDEX idx_fila_ready_to_process ON public.fila_processamento USING btree (created_at) WHERE ((status = 'pending'::text) AND (dlq = false))` |


## Policies (RLS)

### `Usuários podem ver suas próprias tarefas`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = usuario_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_monitor_timeout | AFTER | UPDATE | ROW | enabled | public.check_processamento_timeout |
| tr_update_fila_processamento_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_fila_processamento_updated_at |
| trg_fila_dlq_check | BEFORE | UPDATE | ROW | enabled | public.fn_fila_dlq_check |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
