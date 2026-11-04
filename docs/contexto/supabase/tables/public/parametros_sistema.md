# public.parametros_sistema

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `valor` | `text` | sim |  |  |  |
| 5 | `tipo_dado` | `text` | sim | `'string'::text` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| parametros_sistema_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| parametros_sistema_empresa_id_nome_key | UNIQUE | `UNIQUE (empresa_id, nome)` |  |  | sim |
| parametros_sistema_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| parametros_sistema_empresa_id_nome_key | btree | empresa_id, nome | sim | sim |  | `CREATE UNIQUE INDEX parametros_sistema_empresa_id_nome_key ON public.parametros_sistema USING btree (empresa_id, nome)` |
| parametros_sistema_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX parametros_sistema_pkey ON public.parametros_sistema USING btree (id)` |


## Policies (RLS)

### `Users can view system parameters`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |

### `parametros_sistema_tenant_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `rls_tenant_or_admin(empresa_id)` |
| WITH CHECK | `rls_tenant_or_admin(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_parametros_sistema | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
