# public.fila_notificacoes

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `conteudo` | `text` | não |  |  |  |
| 6 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 7 | `tentativas` | `integer` | sim | `0` |  |  |
| 8 | `erro_ultimo` | `text` | sim |  |  |  |
| 9 | `metadados` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `scheduled_for` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fila_notificacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| fila_notificacoes_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fila_notificacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fila_notificacoes_pkey ON public.fila_notificacoes USING btree (id)` |
| idx_fila_notificacoes_status_scheduled | btree | status, scheduled_for | não | sim |  | `CREATE INDEX idx_fila_notificacoes_status_scheduled ON public.fila_notificacoes USING btree (status, scheduled_for)` |
| idx_fila_notificacoes_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_fila_notificacoes_user_id ON public.fila_notificacoes USING btree (user_id)` |


## Policies (RLS)

### `Usuários podem ver suas próprias notificações`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
