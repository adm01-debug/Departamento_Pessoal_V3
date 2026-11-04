# public.competencias_config

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `categoria` | `text` | sim |  |  |  |
| 6 | `nivel_esperado` | `integer` | sim | `3` |  |  |
| 7 | `ativo` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| competencias_config_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| competencias_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| competencias_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX competencias_config_pkey ON public.competencias_config USING btree (id)` |
| idx_competencias_config_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_competencias_config_empresa_id ON public.competencias_config USING btree (empresa_id)` |


## Policies (RLS)

### `Competências acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
