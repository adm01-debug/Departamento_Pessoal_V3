# public.permissao_recursos

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
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `modulo` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| permissao_recursos_nome_key | UNIQUE | `UNIQUE (nome)` |  |  | sim |
| permissao_recursos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| permissao_recursos_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| permissao_recursos_nome_key | btree | nome | sim | sim |  | `CREATE UNIQUE INDEX permissao_recursos_nome_key ON public.permissao_recursos USING btree (nome)` |
| permissao_recursos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX permissao_recursos_pkey ON public.permissao_recursos USING btree (id)` |
| permissao_recursos_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX permissao_recursos_slug_key ON public.permissao_recursos USING btree (slug)` |


## Policies (RLS)

### `Admin can manage permissions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(auth.uid())` |
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
