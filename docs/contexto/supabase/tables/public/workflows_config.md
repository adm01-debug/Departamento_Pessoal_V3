# public.workflows_config

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `evento_tipo` | `text` | não |  |  |  |
| 4 | `acao_tipo` | `text` | não |  |  |  |
| 5 | `configuracao` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `ativo` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflows_config_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| workflows_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflows_config_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_workflows_config_empresa_id ON public.workflows_config USING btree (empresa_id)` |
| workflows_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflows_config_pkey ON public.workflows_config USING btree (id)` |


## Policies (RLS)

### `Users can manage their company workflows`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(empresa_id IN ( SELECT workflows_config.empresa_id    FROM profiles   WHERE (profiles.id = auth.uid())))` |
| WITH CHECK |  |

### `Users can view their company workflows`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(empresa_id IN ( SELECT workflows_config.empresa_id    FROM profiles   WHERE (profiles.id = auth.uid())))` |
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
