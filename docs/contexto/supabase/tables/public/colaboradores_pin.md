# public.colaboradores_pin

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
| 1 | `colaborador_id` | `uuid` | não |  |  |  |
| 2 | `pin_hash` | `text` | não |  |  |  |
| 3 | `failed_attempts` | `integer` | não | `0` |  |  |
| 4 | `locked_until` | `timestamp with time zone` | sim |  |  |  |
| 5 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| colaboradores_pin_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| colaboradores_pin_pkey | PRIMARY KEY | `PRIMARY KEY (colaborador_id)` |  |  | sim |
| colaboradores_pin_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| colaboradores_pin_pkey | btree | colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX colaboradores_pin_pkey ON public.colaboradores_pin USING btree (colaborador_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
