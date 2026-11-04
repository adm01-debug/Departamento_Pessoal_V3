# public.auditoria_acesso_bancario

> LGPD/ISO 27001: auditoria de todo acesso a dados bancários descriptografados.

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `action` | `text` | não |  |  |  |
| 4 | `table_name` | `text` | não |  |  |  |
| 5 | `record_id` | `uuid` | sim |  |  |  |
| 6 | `campos` | `text[]` | sim |  |  |  |
| 7 | `ip_address` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| auditoria_acesso_bancario_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| auditoria_acesso_bancario_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| auditoria_acesso_bancario_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX auditoria_acesso_bancario_pkey ON public.auditoria_acesso_bancario USING btree (id)` |


## Policies (RLS)

### `auditoria_bancario_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id IS NULL) OR (user_id = auth.uid()))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
