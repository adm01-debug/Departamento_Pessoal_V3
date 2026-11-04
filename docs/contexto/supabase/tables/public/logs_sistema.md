# public.logs_sistema

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nivel` | `text` | não |  |  |  |
| 3 | `mensagem` | `text` | não |  |  |  |
| 4 | `contexto` | `jsonb` | sim |  |  |  |
| 5 | `stack_trace` | `text` | sim |  |  |  |
| 6 | `user_id` | `uuid` | sim |  |  |  |
| 7 | `url` | `text` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| logs_sistema_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| logs_sistema_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_logs_sistema_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_logs_sistema_created_at ON public.logs_sistema USING btree (created_at DESC)` |
| idx_logs_sistema_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX idx_logs_sistema_empresa ON public.logs_sistema USING btree (empresa_id) WHERE (empresa_id IS NOT NULL)` |
| logs_sistema_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX logs_sistema_pkey ON public.logs_sistema USING btree (id)` |


## Policies (RLS)

### `Admins can see all logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM auth.users   WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text))))` |
| WITH CHECK |  |

### `Apenas administradores veem logs do sistema`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = 'admin'::app_role)))` |
| WITH CHECK |  |

### `Users can insert their own logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
