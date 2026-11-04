# public.treinamento_feedbacks

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
| 2 | `inscricao_id` | `uuid` | sim |  |  |  |
| 3 | `nota_instrutor` | `integer` | sim |  |  |  |
| 4 | `nota_conteudo` | `integer` | sim |  |  |  |
| 5 | `comentario` | `text` | sim |  |  |  |
| 6 | `sugestoes` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| treinamento_feedbacks_inscricao_id_fkey | FOREIGN KEY | `FOREIGN KEY (inscricao_id) REFERENCES inscricoes_cursos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| treinamento_feedbacks_inscricao_id_key | UNIQUE | `UNIQUE (inscricao_id)` |  |  | sim |
| treinamento_feedbacks_nota_conteudo_check | CHECK | `CHECK (nota_conteudo >= 1 AND nota_conteudo <= 5)` |  |  | sim |
| treinamento_feedbacks_nota_instrutor_check | CHECK | `CHECK (nota_instrutor >= 1 AND nota_instrutor <= 5)` |  |  | sim |
| treinamento_feedbacks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| treinamento_feedbacks_inscricao_id_key | btree | inscricao_id | sim | sim |  | `CREATE UNIQUE INDEX treinamento_feedbacks_inscricao_id_key ON public.treinamento_feedbacks USING btree (inscricao_id)` |
| treinamento_feedbacks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX treinamento_feedbacks_pkey ON public.treinamento_feedbacks USING btree (id)` |


## Policies (RLS)

### `Usuários criam feedbacks de suas inscrições`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (inscricoes_cursos i      JOIN profiles p ON ((p.id = i.colaborador_id)))   WHERE ((i.id = treinamento_feedbacks.inscricao_id) AND (p.user_id = auth.uid()))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
