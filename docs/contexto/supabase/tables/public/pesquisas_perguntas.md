# public.pesquisas_perguntas

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
| 3 | `texto` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | sim | `'escala'::text` |  |  |
| 5 | `opcoes` | `jsonb` | sim |  |  |  |
| 6 | `ordem` | `integer` | sim | `0` |  |  |
| 7 | `obrigatoria` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pesquisas_perguntas_pesquisa_id_fkey | FOREIGN KEY | `FOREIGN KEY (pesquisa_id) REFERENCES pesquisas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pesquisas_perguntas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pesquisas_respostas | pesquisas_respostas_pergunta_id_fkey | pergunta_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pesquisas_perguntas_pesquisa_id | btree | pesquisa_id | não | sim |  | `CREATE INDEX idx_pesquisas_perguntas_pesquisa_id ON public.pesquisas_perguntas USING btree (pesquisa_id)` |
| pesquisas_perguntas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pesquisas_perguntas_pkey ON public.pesquisas_perguntas USING btree (id)` |


## Policies (RLS)

### `pesquisas_perguntas_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_perguntas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `pesquisas_perguntas_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_perguntas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |

### `pesquisas_perguntas_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_perguntas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `pesquisas_perguntas_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_perguntas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM pesquisas p   WHERE ((p.id = pesquisas_perguntas.pesquisa_id) AND (p.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
