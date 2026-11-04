# public.user_empresas

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `is_default` | `boolean` | sim | `false` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_empresas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_empresas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_empresas_user_id_empresa_id_key | UNIQUE | `UNIQUE (user_id, empresa_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_empresas_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_user_empresas_empresa ON public.user_empresas USING btree (empresa_id)` |
| idx_user_empresas_user | btree | user_id | não | sim |  | `CREATE INDEX idx_user_empresas_user ON public.user_empresas USING btree (user_id)` |
| user_empresas_one_default_per_user | btree | user_id | sim | sim | `(is_default IS TRUE)` | `CREATE UNIQUE INDEX user_empresas_one_default_per_user ON public.user_empresas USING btree (user_id) WHERE (is_default IS TRUE)` |
| user_empresas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_empresas_pkey ON public.user_empresas USING btree (id)` |
| user_empresas_user_id_empresa_id_key | btree | user_id, empresa_id | sim | sim |  | `CREATE UNIQUE INDEX user_empresas_user_id_empresa_id_key ON public.user_empresas USING btree (user_id, empresa_id)` |


## Policies (RLS)

### `Admins podem gerenciar associações`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(auth.uid())` |
| WITH CHECK | `is_admin(auth.uid())` |

### `Usuários podem ver suas associações`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(user_id = auth.uid())` |
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
