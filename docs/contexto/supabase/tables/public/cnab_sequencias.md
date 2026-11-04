# public.cnab_sequencias

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `empresa_id` | `uuid` | não |  |  |  |
| 2 | `banco_codigo` | `text` | não |  |  |  |
| 3 | `last_seq` | `bigint` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cnab_sequencias_pkey | PRIMARY KEY | `PRIMARY KEY (empresa_id, banco_codigo)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cnab_sequencias_pkey | btree | empresa_id, banco_codigo | sim | sim |  | `CREATE UNIQUE INDEX cnab_sequencias_pkey ON public.cnab_sequencias USING btree (empresa_id, banco_codigo)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
