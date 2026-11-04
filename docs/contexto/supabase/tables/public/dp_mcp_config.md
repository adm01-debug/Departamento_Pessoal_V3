# public.dp_mcp_config

> Configuracao e versoes do MCP e schema. Usar como fonte de verdade para CI/CD.
Item 13: antes de cada deploy, verificar: SELECT config_val FROM dp_mcp_config WHERE config_key='schema_version'

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
| 2 | `config_key` | `text` | não |  |  |  |
| 3 | `config_val` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_mcp_config_config_key_key | UNIQUE | `UNIQUE (config_key)` |  |  | sim |
| dp_mcp_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_mcp_config_config_key_key | btree | config_key | sim | sim |  | `CREATE UNIQUE INDEX dp_mcp_config_config_key_key ON public.dp_mcp_config USING btree (config_key)` |
| dp_mcp_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_mcp_config_pkey ON public.dp_mcp_config USING btree (id)` |


## Policies (RLS)

### `service_role_mcp_config`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
