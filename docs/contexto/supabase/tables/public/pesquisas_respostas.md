# public.pesquisas_respostas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `pesquisa_id` | `uuid` | não |  |  |  |
| 3 | `pergunta_id` | `uuid` | não |  |  |  |
| 4 | `colaborador_id` | `uuid` | sim |  |  |  |
| 5 | `valor_numerico` | `integer` | sim |  |  |  |
| 6 | `valor_texto` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pesquisas_respostas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| pesquisas_respostas_pergunta_id_fkey | FOREIGN KEY | `FOREIGN KEY (pergunta_id) REFERENCES pesquisas_perguntas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pesquisas_respostas_pesquisa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pesquisa_id) REFERENCES pesquisas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pesquisas_respostas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pesquisas_respostas_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_pesquisas_respostas_colaborador_id ON public.pesquisas_respostas USING btree (colaborador_id)` |
| idx_pesquisas_respostas_pergunta_id | btree | pergunta_id | não | sim |  | `CREATE INDEX idx_pesquisas_respostas_pergunta_id ON public.pesquisas_respostas USING btree (pergunta_id)` |
| idx_pesquisas_respostas_pesquisa_id | btree | pesquisa_id | não | sim |  | `CREATE INDEX idx_pesquisas_respostas_pesquisa_id ON public.pesquisas_respostas USING btree (pesquisa_id)` |
| pesquisas_respostas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pesquisas_respostas_pkey ON public.pesquisas_respostas USING btree (id)` |


## Policies (RLS)

### `pesquisas_respostas_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_respostas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `pesquisas_respostas_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_respostas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |

### `pesquisas_respostas_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_respostas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `pesquisas_respostas_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_respostas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_respostas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
