# public.pii_access_alerts

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `tabela` | `text` | não |  |  |  |
| 5 | `acao` | `text` | não |  |  |  |
| 6 | `janela` | `timestamp with time zone` | não |  |  |  |
| 7 | `total_registros` | `bigint` | não |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pii_access_alerts_dedup | UNIQUE | `UNIQUE (user_id, empresa_id, tabela, acao, janela)` |  |  | sim |
| pii_access_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| pii_access_alerts_dedup | btree | user_id, empresa_id, tabela, acao, janela | sim | sim |  | `CREATE UNIQUE INDEX pii_access_alerts_dedup ON public.pii_access_alerts USING btree (user_id, empresa_id, tabela, acao, janela)` |
| pii_access_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pii_access_alerts_pkey ON public.pii_access_alerts USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
