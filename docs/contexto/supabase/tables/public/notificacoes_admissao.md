# public.notificacoes_admissao

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
| 2 | `admissao_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `canal` | `text` | não |  |  |  |
| 5 | `assunto` | `text` | sim |  |  |  |
| 6 | `mensagem` | `text` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'enviado'::text` |  |  |
| 8 | `erro` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notificacoes_admissao_admissao_id_fkey | FOREIGN KEY | `FOREIGN KEY (admissao_id) REFERENCES admissoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| notificacoes_admissao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_notificacoes_admissao_admissao_id | btree | admissao_id | não | sim |  | `CREATE INDEX idx_notificacoes_admissao_admissao_id ON public.notificacoes_admissao USING btree (admissao_id)` |
| notificacoes_admissao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notificacoes_admissao_pkey ON public.notificacoes_admissao USING btree (id)` |


## Policies (RLS)

### `Tenant scoped notificacoes_admissao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(admissao_id IN ( SELECT admissoes.id    FROM admissoes   WHERE (admissoes.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(admissao_id IN ( SELECT admissoes.id    FROM admissoes   WHERE (admissoes.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
