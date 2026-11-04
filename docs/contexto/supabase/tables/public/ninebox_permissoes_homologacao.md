# public.ninebox_permissoes_homologacao

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
| 1 | `user_id` | `uuid` | não |  |  |  |
| 2 | `habilitado` | `boolean` | não | `false` |  |  |
| 3 | `expira_em` | `timestamp with time zone` | não |  |  |  |
| 4 | `criado_em` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ninebox_permissoes_homologacao_pkey | PRIMARY KEY | `PRIMARY KEY (user_id)` |  |  | sim |
| ninebox_permissoes_homologacao_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ninebox_permissoes_homologacao_pkey | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX ninebox_permissoes_homologacao_pkey ON public.ninebox_permissoes_homologacao USING btree (user_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
